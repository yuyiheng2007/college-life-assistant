/* ============================================================
 * finance.js —— 财务收支模块
 * ============================================================ */

const Finance = (function () {
  const OUT_CATS = ["餐饮", "交通", "学习", "娱乐", "购物", "医疗", "其他"];
  const IN_CATS = ["生活费", "兼职", "奖学金", "红包", "其他"];

  function render(month) {
    const data = Store.load();
    const records = data.finance.filter(r => (r.date || "").slice(0, 7) === month);
    renderSummary(data, records);
    renderList(records);
    renderCats(records);
  }

  function renderSummary(data, records) {
    const income = records.filter(r => r.type === "in").reduce((s, r) => s + Number(r.amount), 0);
    const outcome = records.filter(r => r.type === "out").reduce((s, r) => s + Number(r.amount), 0);
    const balance = income - outcome;
    const budgetLeft = Number(data.budget || 0) - outcome;
    document.getElementById("fin-summary").innerHTML = `
      <div class="fin-card"><div class="fc-label">本月收入</div><div class="fc-num" style="color:var(--green)">${UI.money(income)}</div></div>
      <div class="fin-card"><div class="fc-label">本月支出</div><div class="fc-num" style="color:var(--red)">${UI.money(outcome)}</div></div>
      <div class="fin-card"><div class="fc-label">本月盈余</div><div class="fc-num" style="color:${balance >= 0 ? "var(--brand)" : "var(--red)"}">${UI.money(balance)}</div></div>
      <div class="fin-card"><div class="fc-label">预算余额（预算 ${data.budget} 元）</div><div class="fc-num" style="color:${budgetLeft >= 0 ? "var(--green)" : "var(--red)"}">${UI.money(budgetLeft)}</div></div>`;
  }

  function renderList(records) {
    const sorted = records.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    if (!sorted.length) {
      document.getElementById("fin-list").innerHTML = `<div class="empty">本月还没有记录，点「+ 记一笔」开始记账。</div>`;
      return;
    }
    document.getElementById("fin-list").innerHTML = sorted.map(r => `
      <div class="fin-row">
        <div>
          <div>${UI.esc(r.note || r.cat)} <span class="tag ${r.type === "in" ? "tag-green" : "tag-gray"}">${UI.esc(r.cat)}</span></div>
          <div style="font-size:11px;color:#94a3b8">${r.date}</div>
        </div>
        <span class="fin-amt ${r.type === "in" ? "in" : "out"}">${r.type === "in" ? "+" : "-"}${UI.money(r.amount)}</span>
      </div>`).join("");
  }

  function renderCats(records) {
    const out = records.filter(r => r.type === "out");
    const total = out.reduce((s, r) => s + Number(r.amount), 0);
    if (!total) {
      document.getElementById("fin-cats").innerHTML = `<div class="empty">暂无支出数据</div>`;
      return;
    }
    const byCat = {};
    out.forEach(r => { byCat[r.cat] = (byCat[r.cat] || 0) + Number(r.amount); });
    const sorted = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    document.getElementById("fin-cats").innerHTML = sorted.map(([cat, amt]) => {
      const pct = Math.round((amt / total) * 100);
      return `<div class="cat-bar-row">
        <span class="cat-name">${UI.esc(cat)}</span>
        <span class="cat-track"><i style="width:${pct}%"></i></span>
        <span class="cat-pct">${pct}%</span>
      </div>`;
    }).join("") + `<div style="font-size:12px;color:#64748b;margin-top:8px">本月总支出 ${UI.money(total)}</div>`;
  }

  function openForm() {
    const data = Store.load();
    const html = `<h2>记一笔</h2>
      <form id="money-form">
        <div class="form-row">
          ${UI.field("类型", UI.select("type", [["out","支出"],["in","收入"]], "out"))}
          ${UI.field("金额（元）", `<input class="input" type="number" step="0.01" name="amount" placeholder="0.00" min="0">`)}
        </div>
        <div class="form-row">
          ${UI.field("分类", `<select class="input" name="cat" id="money-cat">${OUT_CATS.map(c => `<option>${c}</option>`).join("")}</select>`)}
          ${UI.field("日期", UI.dateInput("date", Store.todayStr()))}
        </div>
        ${UI.field("备注（可空）", UI.textInput("note", "", "如：食堂午饭"))}
        ${UI.modalActions("保存")}
      </form>`;
    UI.openModal(html, box => {
      const typeSel = box.querySelector('select[name="type"]');
      const catSel = box.querySelector("#money-cat");
      typeSel.addEventListener("change", () => {
        const cats = typeSel.value === "in" ? IN_CATS : OUT_CATS;
        catSel.innerHTML = cats.map(c => `<option>${c}</option>`).join("");
      });
      box.querySelector("[data-act=ok]").addEventListener("click", () => {
        const v = UI.serialize(box.querySelector("#money-form"));
        const amount = Number(v.amount);
        if (!amount || amount <= 0) { UI.toast("请输入有效金额"); return; }
        data.finance.push({
          id: Store.uid(), date: v.date, type: v.type, cat: v.cat,
          amount: Math.round(amount * 100) / 100, note: v.note.trim(),
        });
        Store.save(data);
        UI.closeModal();
        render(document.getElementById("finance-month").value);
        UI.toast("已记账");
      });
    });
  }

  function setBudget() {
    const data = Store.load();
    const html = `<h2>设置月预算</h2>
      <form id="budget-form">
        ${UI.field("每月生活费预算（元）", `<input class="input" type="number" name="budget" value="${data.budget || 2000}" min="0">`)}
        ${UI.modalActions("保存")}
      </form>`;
    UI.openModal(html, box => {
      box.querySelector("[data-act=ok]").addEventListener("click", () => {
        const v = UI.serialize(box.querySelector("#budget-form"));
        data.budget = Math.max(0, Number(v.budget) || 0);
        Store.save(data);
        UI.closeModal();
        render(document.getElementById("finance-month").value);
        UI.toast("预算已更新");
      });
    });
  }

  /* ---------- 仪表盘：本月财务 ---------- */
  function monthSummary() {
    const data = Store.load();
    const month = Store.monthStr();
    const records = data.finance.filter(r => r.date.slice(0, 7) === month);
    const income = records.filter(r => r.type === "in").reduce((s, r) => s + Number(r.amount), 0);
    const outcome = records.filter(r => r.type === "out").reduce((s, r) => s + Number(r.amount), 0);
    return { income, outcome, balance: income - outcome };
  }

  return { render, openForm, setBudget, monthSummary };
})();
