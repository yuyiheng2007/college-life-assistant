/* ============================================================
 * plan.js —— 日程规划模块（课程自动占用 + 自定义安排）
 * ============================================================ */

const Plan = (function () {
  const TYPE_META = {
    "学习": { color: "#0e7490" },
    "健身": { color: "#16a34a" },
    "社团": { color: "#b45309" },
    "休息": { color: "#64748b" },
    "其他": { color: "#7c3aed" },
  };

  let calMonth = Store.monthStr();

  function slotTime(slot) {
    const data = Store.load();
    return data.periods[slot - 1] || "08:00";
  }

  function slotEnd(slot) {
    // 一节课 45 分钟；结束节 = 该节开始 + 45min
    const t = slotTime(slot).split(":").map(Number);
    const m = t[0] * 60 + t[1] + 45;
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  }

  /* 该日所有块：课程（自动）+ 计划（自定义），按开始时间排序 */
  function blocksOf(dateStr) {
    const data = Store.load();
    const dayNum = new Date(dateStr + "T00:00:00").getDay() || 7;
    const blocks = [];

    data.courses
      .filter(c => c.day === dayNum)
      .forEach(c => {
        blocks.push({
          id: c.id,
          start: slotTime(c.start),
          end: slotEnd(c.end),
          label: c.name,
          sub: [c.place, c.teacher].filter(Boolean).join(" · "),
          color: "#4f46e5",
          type: "课程",
          isCourse: true,
        });
      });

    data.plans
      .filter(p => p.date === dateStr)
      .forEach(p => {
        const meta = TYPE_META[p.type] || TYPE_META["其他"];
        blocks.push({
          id: p.id,
          start: p.start,
          end: p.end,
          label: p.note || p.type,
          sub: p.type,
          color: meta.color,
          type: p.type,
          isCourse: false,
        });
      });

    return blocks.sort((a, b) => (a.start < b.start ? -1 : 1));
  }

  function render(dateStr) {
    const blocks = blocksOf(dateStr);
    const el = document.getElementById("plan-timeline");
    document.getElementById("plan-date-label").textContent =
      `${dateStr}（${Store.weekdayCn(dateStr)}） · 共 ${blocks.length} 个时间段`;
    calMonth = dateStr.slice(0, 7);

    if (!blocks.length) {
      el.innerHTML = `<div class="empty">这一天暂时没有课程和安排，点击右上角「+ 添加安排」规划你的时间。</div>`;
    } else {

      let html = `<div class="legend">
      <span><i style="background:#4f46e5"></i>课程（占用）</span>
      <span><i style="background:#0e7490"></i>学习</span>
      <span><i style="background:#16a34a"></i>健身</span>
      <span><i style="background:#b45309"></i>社团</span>
      <span><i style="background:#64748b"></i>休息</span>
      <span><i style="background:#7c3aed"></i>其他</span>
    </div><table class="plan-table">
      <thead><tr><th>时间</th><th>安排</th></tr></thead><tbody>`;

      // 把时间切成"事件 + 空闲"的连续行，每个任务一整块
      const rows = buildRows(blocks);
      rows.forEach(row => {
        if (row.free) {
          html += `<tr class="plan-row free">
          <td class="plan-time">${row.start} - ${row.end}</td>
          <td><span class="plan-free">空闲</span></td>
        </tr>`;
        } else {
          const b = row.block;
          const tint = b.color + "1a"; // 10% 透明度底色
          const del = b.isCourse
            ? `<button class="tl-del" title="去课表编辑">✎</button>`
            : `<button class="tl-del" data-del="${b.id}" title="删除">×</button>`;
          html += `<tr class="plan-row">
          <td class="plan-time">${b.start} - ${b.end}</td>
          <td>
            <div class="plan-block" style="border-left:5px solid ${b.color};background:${tint}">
              <span class="tl-label">${UI.esc(b.label)}</span>
              <span class="plan-sub">${UI.esc(b.type)}${b.sub ? " · " + UI.esc(b.sub) : ""}</span>
              <span style="margin-left:auto">${del}</span>
            </div>
          </td>
        </tr>`;
        }
      });
      html += `</tbody></table>`;
      el.innerHTML = html;
    }

    el.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => {
        const data = Store.load();
        data.plans = data.plans.filter(p => p.id !== btn.dataset.del);
        Store.save(data);
        render(dateStr);
        UI.toast("安排已删除");
      });
    });
    el.querySelectorAll(".tl-del[title='去课表编辑']").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
        document.querySelector('[data-view="kebiao"]').classList.add("active");
        switchView("kebiao");
      });
    });

    renderCalendar();
    renderAlert();
    renderEvents();
  }

  /* 生成连续时间段行：事件块整行显示，空隙标"空闲" */
  function buildRows(blocks) {
    const rows = [];
    let cursor = "06:00";
    for (const b of blocks) {
      if (b.start > cursor) {
        rows.push({ free: true, start: cursor, end: b.start });
      }
      rows.push({ free: false, block: b });
      if (b.end > cursor) cursor = b.end;
    }
    if (cursor < "24:00") {
      rows.push({ free: true, start: cursor, end: "24:00" });
    }
    return rows;
  }

  function openForm(dateStr) {
    const html = `
      <h2>添加时间安排</h2>
      <form id="plan-form">
        ${UI.field("日期", UI.dateInput("date", dateStr))}
        <div class="form-row">
          ${UI.field("开始时间", UI.timeInput("start", "19:00"))}
          ${UI.field("结束时间", UI.timeInput("end", "20:30"))}
        </div>
        ${UI.field("类型", UI.select("type", [
          ["学习", "学习 📚"], ["健身", "健身 💪"], ["社团", "社团活动 🎯"],
          ["休息", "休息 🛌"], ["其他", "其他 📌"],
        ], "学习"))}
        ${UI.field("内容 / 备注 *", UI.textInput("note", "", "如：图书馆自习 / 去健身房练胸"))}
        ${UI.modalActions("添加")}
      </form>`;

    UI.openModal(html, (box) => {
      box.querySelector("[data-act=ok]").addEventListener("click", () => {
        const v = UI.serialize(box.querySelector("#plan-form"));
        if (!v.note.trim()) { UI.toast("请填写安排内容"); return; }
        if (!v.start || !v.end || v.end <= v.start) { UI.toast("时间范围无效"); return; }
        const data = Store.load();
        data.plans.push({
          id: Store.uid(), date: v.date, start: v.start, end: v.end,
          type: v.type, note: v.note.trim(),
        });
        Store.save(data);
        UI.closeModal();
        render(v.date);
        UI.toast("安排已添加");
      });
    });
  }

  /* ---------- 重要事项 ---------- */
  function daysUntil(dateStr) {
    const today = new Date(Store.todayStr() + "T00:00:00");
    const target = new Date(dateStr + "T00:00:00");
    return Math.round((target - today) / 86400000);
  }

  function renderAlert() {
    const data = Store.load();
    const soon = data.events
      .map(e => ({ title: e.title, days: daysUntil(e.date) }))
      .filter(e => e.days >= 0 && e.days <= 3)
      .sort((a, b) => a.days - b.days);
    const el = document.getElementById("plan-alert");
    if (!soon.length) { el.innerHTML = ""; return; }
    el.innerHTML = soon.map(e => {
      const txt = e.days === 0 ? `今天有重要事项：${UI.esc(e.title)}`
        : `距离「${UI.esc(e.title)}」还有 ${e.days} 天`;
      return `<div class="plan-alert-bar ${e.days === 0 ? "today" : ""}">⚠️ ${txt}</div>`;
    }).join("");
  }

  function renderCalendar() {
    document.getElementById("cal-month-label").textContent = calMonth;
    const data = Store.load();
    const eventDates = new Set(data.events.map(e => e.date));
    const [y, m] = calMonth.split("-").map(Number);
    const startDow = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    const today = Store.todayStr();

    let html = ["日", "一", "二", "三", "四", "五", "六"]
      .map(w => `<span class="cal-w">${w}</span>`).join("");
    for (let i = 0; i < startDow; i++) html += `<span class="cal-cell empty"></span>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${calMonth}-${String(d).padStart(2, "0")}`;
      const cls = ["cal-cell"];
      if (eventDates.has(ds)) cls.push("has-event");
      if (ds === today) cls.push("today");
      html += `<span class="${cls.join(" ")}" data-date="${ds}">${d}</span>`;
    }
    document.getElementById("cal-grid").innerHTML = html;
    document.querySelectorAll("#cal-grid [data-date]").forEach(el => {
      el.addEventListener("click", () => {
        const ds = el.dataset.date;
        document.getElementById("plan-date").value = ds;
        calMonth = ds.slice(0, 7);
        render(ds);
      });
    });
  }

  function renderEvents() {
    const data = Store.load();
    const list = data.events.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    const el = document.getElementById("imp-list");
    if (!list.length) {
      el.innerHTML = `<div class="empty">还没有重要事项。输入事项并选择日期点「标记」，对应日期会在月历上变红，并在前 3 天开始提醒。</div>`;
      return;
    }
    el.innerHTML = list.map(e => {
      const days = daysUntil(e.date);
      const badge = days < 0 ? "已过"
        : days === 0 ? "今天"
        : days <= 3 ? `还有 ${days} 天`
        : `还有 ${days} 天`;
      const tagCls = (days >= 0 && days <= 3) ? "tag-red" : "tag-gray";
      return `<div class="imp-item">
        <div class="imp-main">
          <b>${UI.esc(e.title)}</b>
          <span class="imp-date">${e.date}（${Store.weekdayCn(e.date)}）</span>
        </div>
        <span class="tag ${tagCls}">${badge}</span>
        <button class="btn danger small" data-imp-del="${e.id}">删除</button>
      </div>`;
    }).join("");
    el.querySelectorAll("[data-imp-del]").forEach(btn => {
      btn.addEventListener("click", () => {
        const d2 = Store.load();
        d2.events = d2.events.filter(x => x.id !== btn.dataset.impDel);
        Store.save(d2);
        render(document.getElementById("plan-date").value);
        UI.toast("重要事项已删除");
      });
    });
  }

  let switchView = null;
  function bind(switcher) { switchView = switcher; }

  function bindEvents() {
    document.getElementById("cal-prev").addEventListener("click", () => {
      const [y, m] = calMonth.split("-").map(Number);
      const prev = new Date(y, m - 2, 1);
      calMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
      renderCalendar();
    });
    document.getElementById("cal-next").addEventListener("click", () => {
      const [y, m] = calMonth.split("-").map(Number);
      const next = new Date(y, m, 1);
      calMonth = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
      renderCalendar();
    });
    document.getElementById("btn-add-imp").addEventListener("click", () => {
      const title = document.getElementById("imp-title").value.trim();
      const date = document.getElementById("imp-date").value;
      if (!title) { UI.toast("请填写重要事项内容"); return; }
      if (!date) { UI.toast("请选择日期"); return; }
      const data = Store.load();
      data.events.push({ id: Store.uid(), date, title });
      Store.save(data);
      document.getElementById("imp-title").value = "";
      document.getElementById("plan-date").value = date;
      render(date);
      UI.toast("重要事项已标记，月历日期已变红");
    });
  }

  return { render, openForm, bind, bindEvents };
})();
