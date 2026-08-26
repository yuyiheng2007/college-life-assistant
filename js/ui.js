/* ============================================================
 * ui.js —— 通用 UI 工具（模态框 / Toast / 表单辅助）
 * ============================================================ */

const UI = (function () {
  const mask = document.getElementById("modal-mask");
  const box = document.getElementById("modal-box");
  const toastEl = document.getElementById("toast");

  let toastTimer = null;

  function openModal(html, onMount) {
    box.innerHTML = html;
    mask.hidden = false;
    // 防止模态框内表单按钮触发表单提交导致页面跳转
    box.querySelectorAll("form").forEach(f => f.addEventListener("submit", e => e.preventDefault()));
    if (onMount) onMount(box);
  }

  function closeModal() {
    mask.hidden = true;
    box.innerHTML = "";
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2400);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function field(labelText, innerHtml) {
    return `<label class="field"><span>${esc(labelText)}</span>${innerHtml}</label>`;
  }

  function textInput(name, value, placeholder = "") {
    return `<input class="input" name="${esc(name)}" value="${esc(value)}" placeholder="${esc(placeholder)}">`;
  }

  function dateInput(name, value) {
    return `<input class="input" type="date" name="${esc(name)}" value="${esc(value)}">`;
  }

  function timeInput(name, value) {
    return `<input class="input" type="time" name="${esc(name)}" value="${esc(value)}">`;
  }

  function select(name, options, selected) {
    const opts = options.map(o => {
      const val = Array.isArray(o) ? o[0] : o;
      const label = Array.isArray(o) ? o[1] : o;
      const sel = String(val) === String(selected) ? " selected" : "";
      return `<option value="${esc(val)}"${sel}>${esc(label)}</option>`;
    }).join("");
    return `<select class="input" name="${esc(name)}">${opts}</select>`;
  }

  function modalActions(confirmText, cancelText = "取消") {
    return `<div class="modal-actions">
      <button type="button" class="btn ghost" data-act="cancel">${esc(cancelText)}</button>
      <button type="button" class="btn primary" data-act="ok">${esc(confirmText)}</button>
    </div>`;
  }

  /* 表单序列化：返回 name -> value */
  function serialize(form) {
    const fd = new FormData(form);
    const out = {};
    fd.forEach((v, k) => { out[k] = v; });
    return out;
  }

  /* 课程颜色 */
  const palette = [
    "#4f46e5", "#0e7490", "#b45309", "#be185d", "#15803d",
    "#7c3aed", "#b91c1c", "#0369a1", "#a16207", "#6b7280",
  ];
  function courseColor(seed) {
    let h = 0;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }

  function money(n) {
    return "¥" + Number(n || 0).toFixed(2);
  }

  mask.addEventListener("click", (e) => {
    if (e.target === mask) closeModal();
  });
  box.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    if (el.dataset.act === "cancel") closeModal();
  });

  return {
    openModal, closeModal, toast, esc, field, textInput, dateInput, timeInput,
    select, modalActions, serialize, courseColor, money,
  };
})();
