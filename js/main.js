/* ============================================================
 * main.js —— 主入口：导航 / 仪表盘 / 事件绑定 / 初始化
 * ============================================================ */

function switchView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const target = document.getElementById("view-" + view);
  if (target) target.classList.add("active");
  const navBtn = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navBtn) navBtn.classList.add("active");

  if (view === "dashboard") renderDashboard();
  if (view === "kebiao") Kebiao.render();
  if (view === "plan") {
    const d = document.getElementById("plan-date").value;
    Plan.render(d || Store.todayStr());
  }
  if (view === "fitness") Fitness.render();
  if (view === "finance") {
    const m = document.getElementById("finance-month").value;
    Finance.render(m || Store.monthStr());
  }
  if (view === "todo") Todo.render();
  if (view === "settings") renderPeriodSettings();
}

/* ---------- 仪表盘 ---------- */
async function renderDashboard() {
  const now = new Date();
  document.getElementById("today-line").textContent =
    `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 · ${Store.weekdayCn(Store.todayStr())}`;

  // 今日课程
  const dayNum = now.getDay() || 7;
  const courses = Kebiao.coursesOfDay(dayNum);
  document.getElementById("dash-courses").innerHTML = courses.length
    ? courses.map(c => {
        const periods = Store.load().periods;
        const st = periods[c.start - 1] || "";
        return `<div class="dash-item">
          <div><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:${c.color};margin-right:7px"></span>${UI.esc(c.name)}</div>
          <span class="dash-time">第${c.start}-${c.end}节 ${st}</span>
        </div>`;
      }).join("")
    : `<div class="empty">今天没有课，去规划时间吧</div>`;

  // 今日待办
  const todos = Todo.todayTodos();
  document.getElementById("dash-todos").innerHTML = todos.length
    ? todos.map(t => `<div class="dash-item">
        <div>${UI.esc(t.title)}</div>
        <span class="tag ${t.priority === "高" ? "tag-red" : t.priority === "中" ? "tag-amber" : "tag-gray"}">${t.priority}</span>
      </div>`).join("")
    : `<div class="empty">今天没有到期待办</div>`;

  // 本月财务
  const fin = Finance.monthSummary();
  document.getElementById("dash-finance").innerHTML = `
    <div class="stat-row"><span>收入</span><span class="stat-num plus">${UI.money(fin.income)}</span></div>
    <div class="stat-row"><span>支出</span><span class="stat-num minus">${UI.money(fin.outcome)}</span></div>
    <div class="stat-row"><span>盈余</span><span class="stat-num" style="color:${fin.balance >= 0 ? "var(--green)" : "var(--red)"}">${UI.money(fin.balance)}</span></div>`;

  // 本周健身
  const fit = Fitness.weekSummary();
  const mediaCount = await Media.count();
  document.getElementById("dash-fitness").innerHTML = `
    <div class="stat-row"><span>本周训练</span><span class="stat-num">${fit.count} 次</span></div>
    <div class="stat-row"><span>素材库</span><span class="stat-num">${mediaCount} 个</span></div>`;
}

/* ---------- 节次时间设置 ---------- */
function renderPeriodSettings() {
  const data = Store.load();
  let html = `<div class="form-row" style="grid-template-columns:repeat(4,1fr)">`;
  data.periods.forEach((p, i) => {
    html += `<label class="field"><span>第${i + 1}节开始</span>
      <input class="input" type="time" data-period="${i}" value="${p}"></label>`;
  });
  html += `</div>`;
  document.getElementById("period-settings").innerHTML = html;
}

/* ---------- 事件绑定（只执行一次） ---------- */
function bindEvents() {
  // 导航
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  // 课表
  document.getElementById("btn-fill-default").addEventListener("click", Kebiao.fillDefault);
  document.getElementById("btn-add-course").addEventListener("click", () => Kebiao.openForm(null));

  // 日程
  document.getElementById("plan-date").addEventListener("change", e => {
    Plan.render(e.target.value);
  });
  document.getElementById("btn-add-plan").addEventListener("click", () => {
    Plan.openForm(document.getElementById("plan-date").value || Store.todayStr());
  });
  Plan.bind(switchView);
  Plan.bindEvents();

  // 健身
  document.getElementById("btn-edit-body").addEventListener("click", Fitness.openBodyForm);
  Fitness.bindEvents();

  // 财务
  document.getElementById("finance-month").addEventListener("change", e => {
    Finance.render(e.target.value);
  });
  document.getElementById("btn-add-money").addEventListener("click", Finance.openForm);
  document.getElementById("btn-set-budget").addEventListener("click", Finance.setBudget);

  // 待办
  document.getElementById("btn-add-todo").addEventListener("click", () => Todo.openForm(null));

  // 素材
  document.getElementById("btn-upload-media").addEventListener("click", Media.openUpload);

  // 设置
  document.getElementById("btn-save-periods").addEventListener("click", () => {
    const inputs = document.querySelectorAll("[data-period]");
    const data2 = Store.load();
    inputs.forEach(inp => { data2.periods[Number(inp.dataset.period)] = inp.value; });
    Store.save(data2);
    UI.toast("节次时间已保存");
  });

  // 退出登录
  document.getElementById("btn-logout").addEventListener("click", () => {
    Store.logout();
    document.getElementById("current-user-label").textContent = "";
    Auth.show();
    UI.toast("已退出登录");
  });
}

/* ---------- 登录成功后初始化当前用户的数据与视图 ---------- */
function boot() {
  let data = Store.load();

  // 该用户还没有任何数据时，自动填入默认一班课表
  if (!data.courses.length && !data.plans.length && !data.todos.length && !data.finance.length) {
    data.courses = Kebiao.defaultCourses();
    Store.save(data);
    setTimeout(() => UI.toast("已自动填入你的一班课表，可在「课表」中修改"), 800);
  }

  // 日期默认值
  document.getElementById("plan-date").value = Store.todayStr();
  document.getElementById("imp-date").value = Store.todayStr();
  document.getElementById("finance-month").value = Store.monthStr();

  // 渲染
  Media.init().then(() => renderDashboard())
    .catch(() => {
      UI.toast("素材库不可用（浏览器限制），其余功能正常");
      renderDashboard();
    });
  switchView("dashboard");
}

/* 登录 / 注册成功后由 auth.js 调用 */
window.__reinitApp = function () {
  document.getElementById("plan-date").value = Store.todayStr();
  document.getElementById("imp-date").value = Store.todayStr();
  document.getElementById("finance-month").value = Store.monthStr();
  Media.init().then(() => renderDashboard()).catch(() => renderDashboard());
  switchView("dashboard");
};

/* ---------- 初始化 ---------- */
function init() {
  bindEvents();
  Auth.init();
  if (Store.getCurrentUser()) boot();
}

document.addEventListener("DOMContentLoaded", init);
