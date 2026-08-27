/* ============================================================
 * kebiao.js —— 课表模块
 * ============================================================ */

const Kebiao = (function () {
  const DAY_CN = ["", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];
  const DAY_HEAD = ["节次", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];
  const SLOTS = 13; // 河南财政金融学院官方：上午5节+下午4节+晚上4节，每节45分钟

  function slotTime(slot) {
    const data = Store.load();
    return data.periods[slot - 1] || "";
  }

  function slotEnd(slot) {
    const start = slotTime(slot);
    if (!start) return "";
    const t = start.split(":").map(Number);
    const m = t[0] * 60 + t[1] + 45;
    return String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  }

  /* ---------- 默认课表：26应智U(1) 一班 2026-2027-1 ---------- */
  function defaultCourses() {
    const C = (name, day, start, end, weeks, place, teacher) => ({
      id: Store.uid(), name, day, start, end, weeks, place, teacher,
      color: UI.courseColor(name),
    });
    return [
      C("思想道德与法治", 1, 1, 2, "5-16周", "文津楼213", "王黎明"),
      C("体育板块1", 1, 3, 4, "", "", ""),
      C("微积分（一）", 1, 8, 9, "5-16周", "启智楼110", "黄德龙"),
      C("新生研讨课（含安全教育）", 1, 10, 11, "第4周", "启智楼211", "许莹"),

      C("思想道德与法治", 2, 1, 2, "5-16周", "文津楼213", "王黎明"),
      C("大学英语Ⅱ（一）", 2, 3, 4, "5-16周", "B区4206", "刘婧"),
      C("习近平新时代中国特色社会主义思想概论", 2, 6, 7, "5-16周", "启智楼308", "李梦玥"),
      C("新生研讨课（含安全教育）", 2, 10, 11, "第4周", "启智楼211", "杨扬"),

      C("大学生心理健康教育", 3, 3, 4, "13-16周", "启智楼212", "许莹"),
      C("大学英语Ⅱ（一）·语音", 3, 8, 9, "5-16周", "文渊楼304（语音教室）", "刘婧"),

      C("习近平新时代中国特色社会主义思想概论", 4, 1, 2, "5-16周", "启智楼308", "李梦玥"),
      C("微积分（一）", 4, 3, 4, "5-16周", "启智楼110", "黄德龙"),
      C("新生研讨课（含安全教育）", 4, 10, 11, "第4周", "启智楼211", "夏令"),

      C("大学生心理健康教育", 5, 6, 7, "5-16周", "启智楼211", "许莹"),
      C("新生研讨课（含安全教育）", 5, 10, 11, "第4周", "启智楼211", "夏令"),

      C("劳动教育（一）", 7, 1, 2, "5-6周", "E101D（尔雅通识1）", "劳动教育1"),
    ];
  }

  /* ---------- 渲染 ---------- */
  function render() {
    if (window.innerWidth <= 820) {
      renderMobileList();
    } else {
      renderTable();
    }
  }

  function renderTable() {
    const data = Store.load();
    const grid = document.getElementById("kebiao-grid");
    const days = [1, 2, 3, 4, 5, 6, 7];

    // 列宽：节次 88px；周六 = 其他列的 1/3；其余 6 列（周一~周五、周日）严格等宽
    const other = "calc((100% - 88px) * 3 / 19)";
    const sat = "calc((100% - 88px) / 19)";
    let html = `<table class="kebiao"><colgroup>
      <col style="width:88px">
      <col style="width:${other}"><col style="width:${other}"><col style="width:${other}">
      <col style="width:${other}"><col style="width:${other}">
      <col style="width:${sat}">
      <col style="width:${other}">
    </colgroup><thead><tr>`;
    DAY_HEAD.forEach(d => { html += `<th>${d}</th>`; });
    html += `</tr></thead><tbody>`;

    for (let slot = 1; slot <= SLOTS; slot++) {
      html += `<tr><td class="slot"><span class="slot-num">${slot}</span><span class="slot-time">${slotTime(slot)}-${slotEnd(slot)}</span></td>`;
      for (const day of days) {
        const cell = cellFor(data.courses, day, slot);
        if (cell) {
          html += `<td rowspan="${cell.rowspan}" style="padding:0">
            <div class="course-cell" style="background:${cell.course.color}"
                 data-edit="${cell.course.id}">
              <span class="cc-name">${UI.esc(cell.course.name)}</span>
              <span class="cc-time">${slotTime(cell.course.start)} - ${slotEnd(cell.course.end)}</span>
              <span class="cc-sub">${UI.esc([cell.course.weeks, cell.course.place, cell.course.teacher].filter(Boolean).join(" · "))}</span>
            </div></td>`;
        } else if (!coveredBy(data.courses, day, slot)) {
          html += `<td></td>`;
        } else {
          html += ``; // 已被上面 rowspan 覆盖
        }
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    grid.innerHTML = html;
    grid.querySelectorAll("[data-edit]").forEach(el => {
      el.addEventListener("click", () => editCourse(el.dataset.edit));
    });
  }

  /* ---------- 手机端：按天列表视图 ---------- */
  function renderMobileList() {
    const data = Store.load();
    const grid = document.getElementById("kebiao-grid");
    const days = [1, 2, 3, 4, 5, 6, 7];
    const dayCn = ["", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"];
    let html = `<div class="kebiao-mobile">`;
    days.forEach(day => {
      const courses = data.courses
        .filter(c => c.day === day)
        .sort((a, b) => a.start - b.start);
      html += `<div class="km-day">
        <div class="km-day-head"><b>${dayCn[day]}</b><span>${courses.length ? courses.length + " 节课" : "无课"}</span></div>`;
      if (!courses.length) {
        html += `<div class="km-empty">无课，自由安排</div>`;
      } else {
        courses.forEach(c => {
          html += `<div class="km-course" style="border-left:4px solid ${c.color}" data-edit="${c.id}">
            <div class="km-time">${slotTime(c.start)}-${slotEnd(c.end)}<span class="km-slot">第${c.start}-${c.end}节</span></div>
            <div class="km-info">
              <div class="km-name">${UI.esc(c.name)}</div>
              <div class="km-sub">${UI.esc([c.weeks, c.place, c.teacher].filter(Boolean).join(" · ") || "点击补充地点/老师")}</div>
            </div>
          </div>`;
        });
      }
      html += `</div>`;
    });
    html += `</div>`;
    grid.innerHTML = html;
    grid.querySelectorAll("[data-edit]").forEach(el => {
      el.addEventListener("click", () => editCourse(el.dataset.edit));
    });
  }

  function cellFor(courses, day, slot) {
    const c = courses.find(x => x.day === day && slot >= x.start && slot <= x.end);
    if (!c) return null;
    if (slot !== c.start) return null; // 只在该课程起始节输出（覆盖后续节）
    return { course: c, rowspan: c.end - c.start + 1 };
  }

  function coveredBy(courses, day, slot) {
    return courses.some(x => x.day === day && slot > x.start && slot <= x.end);
  }

  /* ---------- 添加 / 编辑 ---------- */
  function openForm(course) {
    const isEdit = !!course;
    const c = course || { name: "", day: 1, start: 1, end: 2, weeks: "", place: "", teacher: "", color: "" };
    const html = `
      <h2>${isEdit ? "编辑课程" : "添加课程"}</h2>
      <form id="course-form">
        ${UI.field("课程名称 *", UI.textInput("name", c.name, "如：高等数学") )}
        <div class="form-row-3">
          ${UI.field("星期", UI.select("day", [[1,"周一"],[2,"周二"],[3,"周三"],[4,"周四"],[5,"周五"],[6,"周六"],[7,"周日"]], c.day))}
          ${UI.field("开始节", UI.select("start", rangeOptions(1,12), c.start))}
          ${UI.field("结束节", UI.select("end", rangeOptions(1,12), c.end))}
        </div>
        <div class="form-row">
          ${UI.field("周次（可空）", UI.textInput("weeks", c.weeks, "如：5-16周"))}
          ${UI.field("地点（可空）", UI.textInput("place", c.place, "如：启智楼110"))}
        </div>
        ${UI.field("老师（可空）", UI.textInput("teacher", c.teacher))}
        <div class="form-row">
          ${UI.field("颜色", `<input class="input" type="color" name="color" value="${c.color || "#4f46e5"}">`)}
          ${UI.field("", `<span style="font-size:12px;color:#64748b">自动按课程名配色，也可手动选</span>`)}
        </div>
        ${UI.modalActions(isEdit ? "保存修改" : "添加")}
      </form>`;

    UI.openModal(html, (box) => {
      box.querySelector("[data-act=ok]").addEventListener("click", () => {
        const form = box.querySelector("#course-form");
        const v = UI.serialize(form);
        if (!v.name.trim()) { UI.toast("课程名称不能为空"); return; }
        const start = Number(v.start), end = Number(v.end);
        if (end < start) { UI.toast("结束节不能早于开始节"); return; }
        const data = Store.load();
        if (isEdit) {
          const target = data.courses.find(x => x.id === course.id);
          Object.assign(target, {
            name: v.name.trim(), day: Number(v.day), start, end,
            weeks: v.weeks.trim(), place: v.place.trim(), teacher: v.teacher.trim(),
            color: v.color || UI.courseColor(v.name),
          });
        } else {
          data.courses.push({
            id: Store.uid(), name: v.name.trim(), day: Number(v.day), start, end,
            weeks: v.weeks.trim(), place: v.place.trim(), teacher: v.teacher.trim(),
            color: v.color || UI.courseColor(v.name),
          });
        }
        Store.save(data);
        UI.closeModal();
        render();
        UI.toast(isEdit ? "课程已更新" : "课程已添加");
      });
      if (isEdit) {
        const delBtn = document.createElement("button");
        delBtn.className = "btn danger";
        delBtn.textContent = "删除课程";
        delBtn.style.marginRight = "auto";
        box.querySelector(".modal-actions").prepend(delBtn);
        delBtn.addEventListener("click", () => {
          if (!confirm("确定删除这门课？")) return;
          const data = Store.load();
          data.courses = data.courses.filter(x => x.id !== course.id);
          Store.save(data);
          UI.closeModal();
          render();
          UI.toast("课程已删除");
        });
      }
    });
  }

  function rangeOptions(min, max) {
    const arr = [];
    for (let i = min; i <= max; i++) arr.push([i, `第${i}节`]);
    return arr;
  }

  function editCourse(id) {
    const data = Store.load();
    const c = data.courses.find(x => x.id === id);
    if (c) openForm(c);
  }

  function fillDefault() {
    if (!confirm("将用你的一班课表覆盖当前课表，确定？")) return;
    const data = Store.load();
    data.courses = defaultCourses();
    Store.save(data);
    render();
    UI.toast("已填入一班默认课表");
  }

  /* ---------- PDF 课表导入 ---------- */
  function importPdf() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) return;
      UI.toast("正在解析 PDF…");
      parsePdf(file).then(candidates => {
        if (!candidates.length) {
          UI.toast("没识别出课程。请确认 PDF 是文字版（非扫描图片），且包含星期和节次信息");
          return;
        }
        showPdfPreview(candidates);
      }).catch(e => {
        UI.toast("PDF 解析失败：" + (e && e.message ? e.message : "文件格式不支持"));
      });
    };
    input.click();
  }

  async function parsePdf(file) {
    const pdfjs = window.pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = "js/pdf.worker.min.js";
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let text = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      text += extractLines(content) + "\n";
    }
    return matchCourses(text);
  }

  function extractLines(content) {
    const items = content.items.map(it => ({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
    }));
    items.sort((a, b) => b.y - a.y);
    const lines = [];
    let cur = null, curY = null;
    items.forEach(it => {
      if (curY === null || Math.abs(it.y - curY) > 5) {
        cur = [];
        curY = it.y;
        lines.push(cur);
      }
      cur.push(it);
    });
    return lines
      .map(line => line.sort((a, b) => a.x - b.x).map(i => i.str).join(" "))
      .join("\n");
  }

  function matchCourses(text) {
    const dayMap = {
      "星期一": 1, "周一": 1, "星期二": 2, "周二": 2, "星期三": 3, "周三": 3,
      "星期四": 4, "周四": 4, "星期五": 5, "周五": 5, "星期六": 6, "周六": 6,
      "星期日": 7, "周日": 7, "星期天": 7,
    };
    const courses = [];
    const seen = new Set();
    text.split("\n").forEach(line => {
      const dayKey = Object.keys(dayMap).find(d => line.includes(d));
      if (!dayKey) return;
      const day = dayMap[dayKey];
      // 节次匹配：优先"第X-Y节"明确格式；其次星期之后的位置；最后全行（均排除"X-Y周"周次）
      const slotMatch =
        line.match(/(?:第)?(\d{1,2})\s*[-~至到]\s*(\d{1,2})\s*节(?!\s*周)/)
        || (line.slice(line.indexOf(dayKey) + dayKey.length).match(/(?:第)?(\d{1,2})\s*[-~至到]\s*(\d{1,2})(?!\s*周)/))
        || line.match(/(?:第)?(\d{1,2})\s*[-~至到]\s*(\d{1,2})(?!\s*周)/);
      if (!slotMatch) return;
      const start = Number(slotMatch[1]);
      const end = Number(slotMatch[2]);
      if (start < 1 || end > 13 || end < start) return;
      let rest = line.replace(dayKey, "").replace(slotMatch[0], "").trim();
      const meta = splitMeta(rest);
      if (!meta.name) return;
      const key = `${day}|${start}|${end}|${meta.name}`;
      if (seen.has(key)) return;
      seen.add(key);
      courses.push({ name: meta.name, day, start, end, weeks: meta.weeks, place: meta.place, teacher: meta.teacher });
    });
    return courses;
  }

  function splitMeta(s) {
    let rest = s;
    let weeks = "", place = "", teacher = "";
    const wm = rest.match(/(\d{1,2}\s*[-~]\s*\d{1,2})\s*周/);
    if (wm) { weeks = wm[1].replace(/\s/g, "") + "周"; rest = rest.replace(wm[0], ""); }
    const wm2 = rest.match(/第(\d{1,2})\s*周/);
    if (wm2) { weeks = weeks || ("第" + wm2[1] + "周"); rest = rest.replace(wm2[0], ""); }
    const pm = rest.match(/[Ee]\d{3}[A-Za-z]?|[A-Za-z]{1,2}(?:区)?\d{2,4}|[\u4e00-\u9fa5]{1,4}楼[\u4e00-\u9fa5A-Za-z]*\d{0,4}/);
    if (pm) { place = pm[0]; rest = rest.replace(pm[0], ""); }
    const parts = rest.split(/[\s·,，。]+/).filter(Boolean);
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      if (/^[\u4e00-\u9fa5]{2,4}$/.test(last)) {
        teacher = last;
        parts.pop();
      }
    }
    let name = parts.join("");
    if (!name) name = rest.replace(/[\s·,，。]/g, "");
    return { name, weeks, place, teacher };
  }

  function showPdfPreview(candidates) {
    const DAYS = [[1, "周一"], [2, "周二"], [3, "周三"], [4, "周四"], [5, "周五"], [6, "周六"], [7, "周日"]];
    const html = `<h2>PDF 课表解析结果（${candidates.length} 门课）</h2>
      <p class="hint" style="margin-top:-8px">请核对每行信息，可修改或删除；确认后导入。</p>
      <div style="margin-bottom:10px">
        <label style="font-size:12.5px;color:#64748b;margin-right:10px">
          <input type="radio" name="importMode" value="replace" checked> 替换当前课表
        </label>
        <label style="font-size:12.5px;color:#64748b">
          <input type="radio" name="importMode" value="append"> 追加到当前课表
        </label>
      </div>
      <div class="pdf-preview" id="pdf-preview">
        ${candidates.map((c, i) => `
        <div class="pdf-row" data-idx="${i}">
          <input class="input pdf-name" data-idx="${i}" value="${UI.esc(c.name)}">
          <select class="input pdf-day" data-idx="${i}">${DAYS.map(d => `<option value="${d[0]}" ${d[0] === c.day ? "selected" : ""}>${d[1]}</option>`).join("")}</select>
          <input class="input pdf-start" data-idx="${i}" type="number" min="1" max="13" value="${c.start}" title="开始节">
          <input class="input pdf-end" data-idx="${i}" type="number" min="1" max="13" value="${c.end}" title="结束节">
          <input class="input pdf-weeks" data-idx="${i}" value="${UI.esc(c.weeks)}" placeholder="周次">
          <input class="input pdf-place" data-idx="${i}" value="${UI.esc(c.place)}" placeholder="地点">
          <input class="input pdf-teacher" data-idx="${i}" value="${UI.esc(c.teacher)}" placeholder="老师">
          <button type="button" class="btn danger small" data-del="${i}">删</button>
        </div>`).join("")}
      </div>
      ${UI.modalActions("确认导入")}`;
    UI.openModal(html, box => {
      box.querySelectorAll("[data-del]").forEach(btn => {
        btn.addEventListener("click", () => {
          btn.closest(".pdf-row").remove();
        });
      });
      box.querySelector("[data-act=ok]").addEventListener("click", () => {
        const mode = box.querySelector('input[name="importMode"]:checked').value;
        const rows = box.querySelectorAll(".pdf-row");
        const list = [];
        rows.forEach(row => {
          const i = row.dataset.idx;
          const name = box.querySelector(`.pdf-name[data-idx="${i}"]`).value.trim();
          const start = Number(box.querySelector(`.pdf-start[data-idx="${i}"]`).value);
          const end = Number(box.querySelector(`.pdf-end[data-idx="${i}"]`).value);
          if (!name || !start || !end) return;
          list.push({
            id: Store.uid(), name,
            day: Number(box.querySelector(`.pdf-day[data-idx="${i}"]`).value),
            start, end,
            weeks: box.querySelector(`.pdf-weeks[data-idx="${i}"]`).value.trim(),
            place: box.querySelector(`.pdf-place[data-idx="${i}"]`).value.trim(),
            teacher: box.querySelector(`.pdf-teacher[data-idx="${i}"]`).value.trim(),
            color: UI.courseColor(name),
          });
        });
        if (!list.length) { UI.toast("没有有效课程"); return; }
        const data = Store.load();
        data.courses = mode === "replace" ? list : data.courses.concat(list);
        Store.save(data);
        UI.closeModal();
        render();
        UI.toast(`已导入 ${list.length} 门课`);
      });
    });
  }

  /* ---------- 供其他模块调用 ---------- */
  function coursesOfDay(day) {
    const data = Store.load();
    return data.courses
      .filter(c => c.day === day)
      .sort((a, b) => a.start - b.start);
  }

  /* ---------- 事件绑定 ---------- */
  document.getElementById("btn-import-pdf").addEventListener("click", importPdf);
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const active = document.querySelector(".view.active");
      if (active && active.id === "view-kebiao") render();
    }, 200);
  });

  return { render, openForm, fillDefault, coursesOfDay, defaultCourses };
})();
