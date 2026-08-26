/* ============================================================
 * auth.js —— 登录 / 注册（姓名 + 密码，默认记住，无需手机号）
 * ============================================================ */

const Auth = (function () {
  function show() {
    document.getElementById("auth-screen").hidden = false;
    renderLogin();
  }

  function hide() {
    document.getElementById("auth-screen").hidden = true;
  }

  function renderLogin() {
    document.getElementById("auth-box").innerHTML = `
      <h2>登录</h2>
      <p class="auth-sub">输入你的姓名和密码进入</p>
      <form id="login-form">
        <label class="field"><span>姓名</span>
          <input class="input" name="name" placeholder="你的姓名" autocomplete="username"></label>
        <label class="field"><span>密码</span>
          <input class="input" type="password" name="pwd" placeholder="密码" autocomplete="current-password"></label>
        <button type="button" class="btn primary auth-btn" id="btn-login">登 录</button>
      </form>
      <p class="auth-switch">没有账号？<a href="#" id="link-register">注册新用户</a></p>`;
    bindLogin();
  }

  function renderRegister() {
    document.getElementById("auth-box").innerHTML = `
      <h2>注册新用户</h2>
      <p class="auth-sub">设置姓名和密码，无需手机号</p>
      <form id="register-form">
        <label class="field"><span>姓名</span>
          <input class="input" name="name" placeholder="你的姓名" autocomplete="username"></label>
        <label class="field"><span>密码</span>
          <input class="input" type="password" name="pwd" placeholder="设置密码" autocomplete="new-password"></label>
        <label class="field"><span>确认密码</span>
          <input class="input" type="password" name="pwd2" placeholder="再输一次密码" autocomplete="new-password"></label>
        <button type="button" class="btn primary auth-btn" id="btn-register">注 册 并 进 入</button>
      </form>
      <p class="auth-switch">已有账号？<a href="#" id="link-login">直接登录</a></p>`;
    bindRegister();
  }

  function bindLogin() {
    document.getElementById("btn-login").addEventListener("click", () => {
      const v = UI.serialize(document.getElementById("login-form"));
      if (!v.name.trim() || !v.pwd) { UI.toast("请填写姓名和密码"); return; }
      const r = Store.login(v.name, v.pwd);
      if (!r.ok) { UI.toast(r.msg); return; }
      enterApp(v.name);
    });
    document.getElementById("link-register").addEventListener("click", e => {
      e.preventDefault();
      renderRegister();
    });
    document.getElementById("login-form").addEventListener("keydown", e => {
      if (e.key === "Enter") document.getElementById("btn-login").click();
    });
  }

  function bindRegister() {
    document.getElementById("btn-register").addEventListener("click", () => {
      const v = UI.serialize(document.getElementById("register-form"));
      if (!v.name.trim()) { UI.toast("请输入姓名"); return; }
      if (v.pwd.length < 4) { UI.toast("密码至少 4 位"); return; }
      if (v.pwd !== v.pwd2) { UI.toast("两次密码不一致"); return; }
      const r = Store.register(v.name, v.pwd);
      if (!r.ok) { UI.toast(r.msg); return; }
      enterApp(v.name);
    });
    document.getElementById("link-login").addEventListener("click", e => {
      e.preventDefault();
      renderLogin();
    });
    document.getElementById("register-form").addEventListener("keydown", e => {
      if (e.key === "Enter") document.getElementById("btn-register").click();
    });
  }

  function enterApp(name) {
    document.getElementById("current-user-label").textContent = "当前用户：" + name;
    hide();
    UI.toast("欢迎，" + name);
    window.__reinitApp && window.__reinitApp();
  }

  function init() {
    const user = Store.getCurrentUser();
    if (user) {
      document.getElementById("current-user-label").textContent = "当前用户：" + user;
      hide();
    } else {
      show();
    }
  }

  return { init, show, enterApp };
})();
