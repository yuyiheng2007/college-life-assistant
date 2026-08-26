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

  /* ---------- 供其他模块调用 ---------- */
  function coursesOfDay(day) {
    const data = Store.load();
    return data.courses
      .filter(c => c.day === day)
      .sort((a, b) => a.start - b.start);
  }

  return { render, openForm, fillDefault, coursesOfDay, defaultCourses };
})();
