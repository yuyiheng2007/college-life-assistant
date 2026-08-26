/* ============================================================
 * media.js —— Vlog 素材库（图片/视频存入 IndexedDB）
 * ============================================================ */

const Media = (function () {
  let cache = null;
  let query = "";

  async function refresh() {
    cache = (await Store.media.all()) || [];
    cache.sort((a, b) => (a.date < b.date ? 1 : -1));
  }

  function render() {
    const list = (cache || []).filter(m => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (m.name || "").toLowerCase().includes(q) ||
             (m.tags || "").toLowerCase().includes(q) ||
             (m.note || "").toLowerCase().includes(q);
    });
    const grid = document.getElementById("media-grid");
    if (!list.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">还没有素材，点「+ 上传素材」添加你的第一个 vlog 片段。</div>`;
      return;
    }
    grid.innerHTML = list.map(m => {
      const url = URL.createObjectURL(m.blob);
      const thumb = m.type === "image"
        ? `<img class="media-thumb" src="${url}" alt="">`
        : `<div class="media-thumb">▶</div>`;
      const size = m.size > 1024 * 1024
        ? (m.size / 1024 / 1024).toFixed(1) + " MB"
        : Math.max(1, Math.round(m.size / 1024)) + " KB";
      return `<div class="media-card">
        <div style="position:relative">${thumb}
          <span class="tag" style="position:absolute;top:8px;left:8px;background:rgba(15,23,42,.65);color:#fff">${m.type === "image" ? "图片" : "视频"}</span>
        </div>
        <div class="media-info">
          <div class="mi-name" title="${UI.esc(m.name)}">${UI.esc(m.name)}</div>
          <div class="mi-meta">${m.date} · ${size}${m.tags ? " · #" + UI.esc(m.tags) : ""}</div>
          ${m.note ? `<div class="mi-meta">${UI.esc(m.note)}</div>` : ""}
        </div>
        <div class="media-ops">
          <button class="btn ghost small" data-play="${m.id}">${m.type === "image" ? "查看" : "播放"}</button>
          <button class="btn danger small" data-del="${m.id}">删除</button>
        </div>
      </div>`;
    }).join("");

    grid.querySelectorAll("[data-del]").forEach(el => {
      el.addEventListener("click", async () => {
        if (!confirm("确定删除这个素材？")) return;
        await Store.media.del(el.dataset.del);
        await refresh();
        render();
        UI.toast("素材已删除");
      });
    });
    grid.querySelectorAll("[data-play]").forEach(el => {
      el.addEventListener("click", async () => {
        const item = cache.find(m => m.id === el.dataset.play);
        if (!item) return;
        const url = URL.createObjectURL(item.blob);
        const mediaHtml = item.type === "image"
          ? `<img src="${url}" style="max-width:100%;border-radius:10px">`
          : `<video src="${url}" controls autoplay style="max-width:100%;border-radius:10px"></video>`;
        UI.openModal(`<h2>${UI.esc(item.name)}</h2>${mediaHtml}<div class="modal-actions"><button class="btn ghost" data-act="cancel">关闭</button></div>`);
      });
    });
  }

  function openUpload() {
    const html = `<h2>上传素材</h2>
      <form id="media-form">
        ${UI.field("选择文件（图片或视频）", `<input class="input" type="file" name="file" accept="image/*,video/*" required>`)}
        ${UI.field("标签（逗号分隔，可空）", UI.textInput("tags", "", "如：军训,食堂,室友"))}
        ${UI.field("备注（可空）", UI.textInput("note", "", "如：运动会入场片段，剪进第3期"))}
        ${UI.modalActions("上传")}
      </form>`;
    UI.openModal(html, box => {
      box.querySelector("[data-act=ok]").addEventListener("click", async () => {
        const form = box.querySelector("#media-form");
        const fileInput = form.querySelector('input[type="file"]');
        const file = fileInput.files && fileInput.files[0];
        if (!file) { UI.toast("请先选择文件"); return; }
        const v = UI.serialize(form);
        const item = {
          id: Store.uid(),
          name: file.name,
          type: file.type.startsWith("image") ? "image" : "video",
          size: file.size,
          date: Store.todayStr(),
          tags: v.tags.trim(),
          note: v.note.trim(),
          blob: file,
        };
        await Store.media.add(item);
        await refresh();
        render();
        UI.closeModal();
        UI.toast("素材已上传");
      });
    });
  }

  async function init() {
    await refresh();
    render();
    document.getElementById("media-search").addEventListener("input", e => {
      query = e.target.value.trim();
      render();
    });
  }

  /* ---------- 仪表盘：素材数量 ---------- */
  async function count() {
    if (!cache) await refresh();
    return cache ? cache.length : 0;
  }

  return { init, render, openUpload, count };
})();
