/* ============================================================
 * todo.js —— 待办事项模块（社团/组织/班级/小组/个人分类）
 * ============================================================ */

const Todo = (function () {
  const CATS = [
    ["社团任务", "tag-blue"],
    ["组织任务", "tag-purple"],
    ["班级任务", "tag-green"],
    ["小组任务", "tag-amber"],
    ["个人", "tag-gray"],
  ];
  const PRI = {
    "高": "tag-red",
    "中": "tag-amber",
    "低": "tag-gray",
  };

  let filter = "全部";

  function render() {
    renderFilters();
    renderList();
  }

  function renderFilters() {
    const chips = ["全部", ...CATS.map(c => c[0])];
    document.getElementById("todo-filters").innerHTML = chips.map(c =>
      `<button class="filter-chip ${filter === c ? "active" : ""}" data-filter="${UI.esc(c)}">${UI.esc(c)}</button>`
    ).join("");
    document.querySelectorAll("[data-filter]").forEach(el => {
      el.addEventListener("click", () => { filter = el.dataset.filter; render(); });
    });
  }

  function renderList() {
    const data = Store.load();
    let list = data.todos.slice().sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.due || "9999") < (b.due || "9999") ? -1 : 1;
    });
    if (filter !== "全部") list = list.filter(t => t.cat === filter);
    const today = Store.todayStr();

    if (!list.length) {
      document.getElementById("todo-list").innerHTML = `<div class="empty">没有待办事项，点「+ 添加待办」安排任务。</div>`;
      return;
    }

    document.getElementById("todo-list").innerHTML = list.map(t => {
      const catColor = (CATS.find(c => c[0] === t.cat) || ["其他", "tag-gray"])[1];
      const priColor = PRI[t.priority] || "tag-gray";
      const overdue = !t.done && t.due && t.due < today;
      const dueLabel = t.due ? `${t.due}${overdue ? "（已逾期）" : ""}` : "无截止";
      return `<div class="todo-item ${overdue ? "overdue" : ""}">
        <div class="todo-check ${t.done ? "done" : ""}" data-toggle="${t.id}">✓</div>
        <div class="todo-main">
          <div class="todo-title ${t.done ? "done" : ""}">${UI.esc(t.title)}</div>
          <div class="todo-meta">
            <span class="tag ${catColor}">${UI.esc(t.cat)}</span>
            <span class="tag ${priColor}">${UI.esc(t.priority)}优先级</span>
            <span>📅 ${dueLabel}</span>
          </div>
        </div>
        <div class="todo-ops">
          <button class="btn ghost small" data-edit="${t.id}">编辑</button>
          <button class="btn danger small" data-del="${t.id}">删除</button>
        </div>
      </div>`;
    }).join("");

    document.querySelectorAll("[data-toggle]").forEach(el => {
      el.addEventListener("click", () => toggle(el.dataset.toggle));
    });
    document.querySelectorAll("[data-del]").forEach(el => {
      el.addEventListener("click", () => {
        const data = Store.load();
        data.todos = data.todos.filter(x => x.id !== el.dataset.del);
        Store.save(data);
        render();
        UI.toast("已删除");
      });
    });
    document.querySelectorAll("[data-edit]").forEach(el => {
      el.addEventListener("click", () => {
        const data = Store.load();
        const t = data.todos.find(x => x.id === el.dataset.edit);
        if (t) openForm(t);
      });
    });
  }

  function toggle(id) {
    const data = Store.load();
    const t = data.todos.find(x => x.id === id);
    if (t) { t.done = !t.done; Store.save(data); render(); }
  }

  function openForm(todo) {
    const isEdit = !!todo;
    const t = todo || { title: "", cat: "社团任务", due: "", priority: "中", done: false };
    const html = `<h2>${isEdit ? "编辑待办" : "添加待办"}</h2>
      <form id="todo-form">
        ${UI.field("事项内容 *", UI.textInput("title", t.title, "如：提交社团活动策划案"))}
        ${UI.field("分类", UI.select("cat", CATS.map(c => c), t.cat))}
        <div class="form-row">
          ${UI.field("截止日期", `<input class="input" type="date" name="due" value="${t.due}">`)}
          ${UI.field("优先级", UI.select("priority", [["高","高"],["中","中"],["低","低"]], t.priority))}
        </div>
        ${UI.modalActions(isEdit ? "保存修改" : "添加")}
      </form>`;
    UI.openModal(html, box => {
      box.querySelector("[data-act=ok]").addEventListener("click", () => {
        const v = UI.serialize(box.querySelector("#todo-form"));
        if (!v.title.trim()) { UI.toast("请填写事项内容"); return; }
        const data = Store.load();
        if (isEdit) {
          Object.assign(t, { title: v.title.trim(), cat: v.cat, due: v.due, priority: v.priority });
        } else {
          data.todos.push({
            id: Store.uid(), title: v.title.trim(), cat: v.cat,
            due: v.due, priority: v.priority, done: false,
          });
        }
        Store.save(data);
        UI.closeModal();
        render();
        UI.toast(isEdit ? "待办已更新" : "待办已添加");
      });
    });
  }

  /* ---------- 仪表盘：今日待办 ---------- */
  function todayTodos() {
    const data = Store.load();
    const today = Store.todayStr();
    return data.todos
      .filter(t => !t.done && t.due === today)
      .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "高" ? -1 : 1));
  }

  return { render, openForm, todayTodos };
})();
