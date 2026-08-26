/* ============================================================
 * fitness.js —— 健身与饮食模块
 * 身体数据 / 个性化目标 / 自定义锻炼计划 / 饮食热量估算 / 体重曲线
 * ============================================================ */

const Fitness = (function () {
  const MEALS = ["早餐", "午餐", "晚餐", "加餐"];
  let chartRange = "3d";

  /* 食物热量估算库（每份大约千卡，仅供参考） */
  const FOOD = [
    { key: ["米饭", "大米", "白饭"], kcal: 200 },
    { key: ["面条", "拉面", "米线", "米粉"], kcal: 320 },
    { key: ["鸡蛋", "煎蛋", "煮蛋"], kcal: 70 },
    { key: ["鸡胸", "鸡腿", "鸡肉"], kcal: 165 },
    { key: ["牛肉"], kcal: 250 },
    { key: ["猪肉", "排骨"], kcal: 300 },
    { key: ["鱼", "虾"], kcal: 150 },
    { key: ["牛奶"], kcal: 130 },
    { key: ["酸奶"], kcal: 120 },
    { key: ["豆浆"], kcal: 50 },
    { key: ["苹果"], kcal: 50 },
    { key: ["香蕉"], kcal: 90 },
    { key: ["橙子", "桔子", "橘子"], kcal: 50 },
    { key: ["面包"], kcal: 250 },
    { key: ["包子"], kcal: 220 },
    { key: ["馒头"], kcal: 220 },
    { key: ["粥"], kcal: 80 },
    { key: ["蔬菜", "青菜", "白菜", "西兰花"], kcal: 30 },
    { key: ["薯条"], kcal: 300 },
    { key: ["炸鸡"], kcal: 350 },
    { key: ["汉堡"], kcal: 500 },
    { key: ["披萨"], kcal: 280 },
    { key: ["饺子"], kcal: 50 },
    { key: ["汤"], kcal: 60 },
    { key: ["奶茶", "可乐", "饮料"], kcal: 150 },
    { key: ["西瓜"], kcal: 30 },
    { key: ["葡萄"], kcal: 60 },
    { key: ["豆腐"], kcal: 80 },
    { key: ["玉米"], kcal: 100 },
    { key: ["红薯", "地瓜"], kcal: 90 },
  ];

  function estimateKCal(text) {
    const t = String(text || "");
    let total = 0;
    const found = [];
    FOOD.forEach(f => {
      const hit = f.key.find(k => t.includes(k));
      if (hit) { total += f.kcal; found.push(`${hit}≈${f.kcal} 千卡`); }
    });
    return { total, found };
  }

  function bmi(body) {
    const h = Number(body.height) || 175;
    const w = Number(body.weight) || 65;
    return Math.round((w / Math.pow(h / 100, 2)) * 10) / 10;
  }

  function bmiCategory(v) {
    if (v < 18.5) return "偏瘦";
    if (v < 24) return "正常";
    if (v < 28) return "超重";
    return "肥胖";
  }

  /* ---------- TDEE 个性化计算 ---------- */
  function calcTargets(body) {
    const h = Number(body.height) || 175;
    const w = Number(body.weight) || 65;
    const age = Number(body.age) || 18;
    const isMale = body.gender !== "女";
    const bmr = isMale
      ? 10 * w + 6.25 * h - 5 * age + 5
      : 10 * w + 6.25 * h - 5 * age - 161;
    const activity = { "久坐": 1.2, "轻度": 1.375, "中度": 1.55 }[body.activity] || 1.375;
    const tdee = Math.round(bmr * activity);
    let adj = 0;
    if (body.goal === "减脂") adj = -300;
    if (body.goal === "增肌") adj = 300;
    const target = Math.max(1200, tdee + adj);
    return {
      bmr: Math.round(bmr), tdee, target,
      protein: Math.round(w * (body.goal === "增肌" ? 1.8 : 1.4)),
      carbs: Math.round((target * 0.45) / 4),
      fat: Math.round((target * 0.25) / 9),
      water: body.gender === "女" ? 1500 : 1700,
    };
  }

  function render() {
    const data = Store.load();
    renderBody(data);
    renderTarget(data);
    renderPlan(data);
    renderDiet(data);
    renderChart(data);
  }

  /* ---------- 身体数据 ---------- */
  function renderBody(data) {
    const b = data.body;
    const v = bmi(b);
    document.getElementById("fit-body").innerHTML = `
      <div class="body-grid">
        <div class="body-item"><span>身高</span><b>${b.height} cm</b></div>
        <div class="body-item"><span>体重</span><b>${b.weight} kg</b></div>
        <div class="body-item"><span>BMI</span><b>${v}（${bmiCategory(v)}）</b></div>
        <div class="body-item"><span>体脂率</span><b>${b.bodyfat ? b.bodyfat + " %" : "未填写"}</b></div>
        <div class="body-item"><span>目标</span><b>${b.goal}</b></div>
        <div class="body-item"><span>活动水平</span><b>${b.activity}</b></div>
      </div>
      <button class="btn ghost small" id="btn-edit-body-inline" style="margin-top:10px">修改身体数据</button>`;
    document.getElementById("btn-edit-body-inline").addEventListener("click", openBodyForm);
  }

  function openBodyForm() {
    const data = Store.load();
    const b = data.body;
    const v = bmi(b);
    const html = `<h2>编辑身体数据</h2>
      <form id="body-form">
        <div class="form-row-3">
          ${UI.field("性别", UI.select("gender", [["男", "男"], ["女", "女"]], b.gender || "男"))}
          ${UI.field("年龄", `<input class="input" type="number" name="age" value="${b.age || 18}" min="10" max="80">`)}
          ${UI.field("身高（cm）", `<input class="input" type="number" name="height" value="${b.height}">`)}
        </div>
        <div class="form-row-3">
          ${UI.field("体重（kg）", `<input class="input" type="number" step="0.1" name="weight" value="${b.weight}">`)}
          ${UI.field("体脂率 %（可空）", `<input class="input" type="number" step="0.1" name="bodyfat" value="${b.bodyfat || ""}" placeholder="如 18">`)}
          ${UI.field("", `<div style="font-size:12px;color:#64748b;padding-top:26px">当前 BMI：<b>${v}</b>（${bmiCategory(v)}）</div>`)}
        </div>
        <div class="form-row">
          ${UI.field("目标", UI.select("goal", [["减脂", "减脂 🔥"], ["保持", "保持 🧘"], ["增肌", "增肌 💪"]], b.goal))}
          ${UI.field("日常活动", UI.select("activity", [["久坐", "久坐"], ["轻度", "轻度"], ["中度", "中度"]], b.activity || "轻度"))}
        </div>
        ${UI.modalActions("保存")}
      </form>`;
    UI.openModal(html, box => {
      box.querySelector("[data-act=ok]").addEventListener("click", () => {
        const v2 = UI.serialize(box.querySelector("#body-form"));
        // 保留并兼容已有锻炼计划（旧数组转星期对象）
        const oldPlan = data.body.plan;
        let planSave = {};
        if (Array.isArray(oldPlan)) {
          oldPlan.forEach((it, i) => { planSave[String(i + 1)] = it; });
        } else {
          planSave = oldPlan || {};
        }
        data.body = {
          gender: v2.gender, age: Number(v2.age) || 18,
          height: Number(v2.height) || 175, weight: Number(v2.weight) || 65,
          bodyfat: v2.bodyfat ? Number(v2.bodyfat) : "",
          goal: v2.goal, activity: v2.activity || "轻度",
          plan: planSave,
        };
        Store.save(data);
        UI.closeModal();
        render();
        UI.toast("身体数据已保存，目标已重新计算");
      });
    });
  }

  /* ---------- 每日目标（个性化推荐） ---------- */
  function renderTarget(data) {
    const t = calcTargets(data.body);
    document.getElementById("fit-target").innerHTML = `
      <div class="fit-num">${t.target} <small>千卡/日 建议摄入</small></div>
      <div style="margin:8px 0;font-size:12.5px;color:#64748b">
        基础代谢 ${t.bmr} 千卡 · 全天消耗约 ${t.tdee} 千卡 · 目标：${data.body.goal}
      </div>
      <div class="target-row"><span>蛋白质</span><b>${t.protein} g</b></div>
      <div class="target-row"><span>碳水化合物</span><b>${t.carbs} g</b></div>
      <div class="target-row"><span>脂肪</span><b>${t.fat} g</b></div>
      <div class="target-row"><span>饮水（温和气候）</span><b>${t.water} ml</b></div>
      <div class="target-row"><span>蔬菜</span><b>300-500 g</b></div>
      <div class="target-row"><span>水果</span><b>200-350 g</b></div>
      <p style="font-size:11.5px;color:#64748b;margin:8px 0 0">
        蛋白质参考：${data.body.goal === "增肌" ? "1.6-1.8" : "1.2-1.4"} g/kg 体重；
        推荐按《中国居民膳食指南 2022》搭配：谷薯 250-400g、蔬果 ≥500g、奶及制品 300ml。
      </p>`;
  }

  /* ---------- 锻炼计划（周一~周日栏位 + 打勾） ---------- */
  function renderPlan(data) {
    // 兼容旧数组数据：转成 {1:..,2:..} 按星期存储
    let plan = {};
    if (Array.isArray(data.body.plan)) {
      data.body.plan.forEach((item, i) => { plan[String(i + 1)] = item; });
      data.body.plan = plan;
      Store.save(data);
    } else {
      plan = data.body.plan || {};
    }
    const key = Store.todayStr();
    const doneSet = new Set(data.workouts[key] || []);
    const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    const filled = days.map((_, i) => String(i + 1)).filter(idx => plan[idx] && plan[idx].trim());
    const allDone = filled.length > 0 && filled.every(idx => doneSet.has(idx));

    let html = `<div class="week-plan">`;
    days.forEach((d, i) => {
      const idx = String(i + 1);
      const val = plan[idx] || "";
      const checked = doneSet.has(idx);
      html += `<div class="week-plan-row">
        <span class="wp-day">${d}</span>
        <input class="input wp-input" data-day="${idx}" placeholder="填写该天训练内容，如：深蹲 4×8"
               value="${UI.esc(val)}">
        <span class="todo-check ${checked ? "done" : ""} ${val.trim() ? "" : "disabled"}"
              data-daycheck="${idx}">✓</span>
      </div>`;
    });
    html += `</div>`;
    html += `<div class="plan-status ${allDone ? "done" : ""}">
      ${allDone
        ? "🎉 打卡完毕！训练顺利完成，太厉害了！"
        : filled.length
          ? `今日打卡：${doneSet.size} / ${filled.length} 项`
          : "先填写每周训练内容，练完一项点一项打勾"}
    </div>`;
    document.getElementById("fit-plan").innerHTML = html;

    document.querySelectorAll(".wp-input").forEach(inp => {
      inp.addEventListener("change", () => {
        const idx = inp.dataset.day;
        const v = inp.value.trim();
        if (!data.body.plan) data.body.plan = {};
        if (v) data.body.plan[idx] = v; else delete data.body.plan[idx];
        Store.save(data);
        renderPlan(data);
      });
    });
    document.querySelectorAll("[data-daycheck]").forEach(el => {
      el.addEventListener("click", () => {
        const idx = el.dataset.daycheck;
        if (!(data.body.plan || {})[idx]) { UI.toast("先填写该天的训练内容再打卡"); return; }
        const arr = data.workouts[key] || [];
        const p = arr.indexOf(idx);
        if (p >= 0) arr.splice(p, 1); else arr.push(idx);
        data.workouts[key] = arr;
        Store.save(data);
        renderPlan(data);
      });
    });
  }

  /* ---------- 今日饮食（填写 + 自动估热量 + 喝水） ---------- */
  function renderDiet(data) {
    const key = Store.todayStr();
    const d = data.diet[key] || { water: 0, meals: {}, extra: 0 };
    const t = calcTargets(data.body);
    const mealTotal = MEALS.reduce((s, m) => s + Number((d.meals[m] || {}).kcal || 0), 0);
    const total = mealTotal + Number(d.extra || 0);

    let html = `<div class="diet-row"><div>今日已记录热量</div><b>${total} / ${t.target} 千卡</b></div>
      <div class="bar"><i style="width:${Math.min(100, (total / t.target) * 100)}%"></i></div>
      <div style="margin-top:8px">`;

    MEALS.forEach(m => {
      const meal = d.meals[m] || {};
      const est = meal.kcal || 0;
      html += `<div class="meal-block">
        <div class="meal-head"><b>${m}</b>
          <span class="tag ${est ? "tag-blue" : "tag-gray"}">${est ? "≈ " + est + " 千卡" : "未估算"}</span>
        </div>
        <div class="meal-form">
          <input class="input meal-input" data-meal="${m}" placeholder="吃了什么？如：米饭、鸡蛋、鸡胸肉"
                 value="${UI.esc(meal.text || "")}">
          <button class="btn ghost small" data-est="${m}">估算热量</button>
        </div>
        ${meal.found && meal.found.length ? `<div class="meal-est">${UI.esc(meal.found.join("、"))}</div>` : ""}
      </div>`;
    });

    html += `</div>
      <div class="diet-row">
        <div>喝水 <span class="tag tag-blue">${d.water} 杯（${d.water * 500} ml）</span></div>
        <div style="display:flex;gap:6px">
          <button class="check-btn" id="btn-water-minus">−</button>
          <button class="check-btn" id="btn-water-plus">+</button>
        </div>
      </div>
      <p class="hint">每杯按 500ml 计；《中国居民膳食指南》建议：成年男性每天 1700ml、女性 1500ml（右上角链接含不同人群推荐）。</p>`;
    document.getElementById("fit-diet").innerHTML = html;

    document.querySelectorAll("[data-est]").forEach(btn => {
      btn.addEventListener("click", () => {
        const m = btn.dataset.est;
        const input = document.querySelector(`[data-meal="${m}"]`);
        const text = input.value.trim();
        if (!text) { UI.toast("先填写吃了什么"); return; }
        const r = estimateKCal(text);
        if (!r.total) { UI.toast("没识别出常见食物，可加关键词如：米饭、鸡蛋、鸡胸肉"); return; }
        d.meals[m] = { text, kcal: r.total, found: r.found };
        data.diet[key] = d;
        Store.save(data);
        renderDiet(data);
        UI.toast(`${m} 大约 ${r.total} 千卡（${r.found.join("、")}）`);
      });
    });
    document.querySelectorAll(".meal-input").forEach(inp => {
      inp.addEventListener("change", () => {
        const m = inp.dataset.meal;
        const text = inp.value.trim();
        const prev = d.meals[m] || {};
        if (text) {
          d.meals[m] = { text, kcal: prev.kcal || 0, found: prev.found || [] };
        } else {
          delete d.meals[m];
        }
        data.diet[key] = d;
        Store.save(data);
        renderDiet(data);
      });
    });
    document.getElementById("btn-water-plus").addEventListener("click", () => {
      d.water = (d.water || 0) + 1;
      data.diet[key] = d;
      Store.save(data);
      renderDiet(data);
    });
    document.getElementById("btn-water-minus").addEventListener("click", () => {
      d.water = Math.max(0, (d.water || 0) - 1);
      data.diet[key] = d;
      Store.save(data);
      renderDiet(data);
    });
  }

  /* ---------- 体重曲线（每三天 / 每周 / 每月） ---------- */
  function daysBetween(a, b) {
    return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
  }

  function weekKey(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return Store.fmtDate(d);
  }

  function avg(arr) {
    return Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
  }

  function aggregateWeights(weights, range) {
    const sorted = weights.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!sorted.length) return [];
    if (range === "3d") {
      const pts = [];
      let cur = null;
      sorted.forEach(w => {
        if (!cur || daysBetween(cur.date, w.date) >= 3) {
          pts.push({ label: w.date.slice(5), value: Number(w.value) });
          cur = w;
        } else {
          cur = w;
        }
      });
      return pts;
    }
    if (range === "week") {
      const map = {};
      sorted.forEach(w => {
        const k = weekKey(w.date);
        (map[k] = map[k] || []).push(Number(w.value));
      });
      return Object.keys(map).sort().map(k => ({ label: k.slice(5), value: avg(map[k]) }));
    }
    const map = {};
    sorted.forEach(w => {
      const k = w.date.slice(0, 7);
      (map[k] = map[k] || []).push(Number(w.value));
    });
    return Object.keys(map).sort().map(k => ({ label: k, value: avg(map[k]) }));
  }

  function renderChart(data) {
    const points = aggregateWeights(data.weights || [], chartRange);
    const el = document.getElementById("fit-chart");
    if (!points.length) {
      el.innerHTML = `<div class="empty">暂无体重数据，点「+ 记录体重」开始记录，曲线会自动生成。</div>`;
      return;
    }
    const W = 760, H = 240, padL = 52, padR = 20, padT = 22, padB = 34;
    const vals = points.map(p => p.value);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = (max - min) || 1;
    const x = i => padL + (W - padL - padR) * (points.length === 1 ? 0.5 : i / (points.length - 1));
    const y = v => padT + (H - padT - padB) * (1 - (v - min) / span);
    const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");

    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">`;
    for (let i = 0; i <= 4; i++) {
      const v = min + span * i / 4;
      const yy = y(v);
      svg += `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" stroke="#e2e8f0" stroke-width="1"/>`;
      svg += `<text x="${padL - 8}" y="${(yy + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#64748b">${v.toFixed(1)}</text>`;
    }
    svg += `<path d="${path}" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    points.forEach((p, i) => {
      svg += `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="4" fill="#7c3aed" stroke="#fff" stroke-width="1.5"/>`;
      svg += `<text x="${x(i).toFixed(1)}" y="${(y(p.value) - 9).toFixed(1)}" text-anchor="middle" font-size="10" fill="#1e293b" font-weight="700">${p.value}</text>`;
    });
    const step = Math.ceil(points.length / 6);
    points.forEach((p, i) => {
      if (i % step !== 0 && i !== points.length - 1) return;
      svg += `<text x="${x(i).toFixed(1)}" y="${H - 12}" text-anchor="middle" font-size="10" fill="#64748b">${p.label}</text>`;
    });
    svg += `</svg>`;
    el.innerHTML = svg;

    document.querySelectorAll("#chart-tabs .filter-chip").forEach(chip => {
      chip.classList.toggle("active", chip.dataset.range === chartRange);
    });
  }

  function openWeightForm() {
    const data = Store.load();
    const html = `<h2>记录体重</h2>
      <form id="weight-form">
        ${UI.field("日期", UI.dateInput("date", Store.todayStr()))}
        ${UI.field("体重（kg）", `<input class="input" type="number" step="0.1" name="value" placeholder="65.0">`)}
        ${UI.modalActions("保存")}
      </form>`;
    UI.openModal(html, box => {
      box.querySelector("[data-act=ok]").addEventListener("click", () => {
        const v = UI.serialize(box.querySelector("#weight-form"));
        if (!v.value) { UI.toast("请输入体重"); return; }
        data.weights = data.weights || [];
        data.weights = data.weights.filter(w => w.date !== v.date);
        data.weights.push({ date: v.date, value: Number(v.value) });
        Store.save(data);
        UI.closeModal();
        renderChart(data);
        renderBody(data);
        UI.toast("体重已记录");
      });
    });
  }

  /* ---------- 体重记录管理（修改/删除） ---------- */
  function openWeightManage() {
    const data = Store.load();
    const weights = (data.weights || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    if (!weights.length) {
      UI.openModal(`<h2>体重记录</h2>
        <div class="empty">暂无记录，先点「+ 记录体重」添加。</div>
        <div class="modal-actions"><button type="button" class="btn ghost" data-act="cancel">关闭</button></div>`);
      return;
    }
    const html = `<h2>体重记录管理</h2>
      <div class="weight-manage">` + weights.map(w => `
        <div class="weight-row">
          <span class="wr-date">${w.date}</span>
          <b>${w.value} kg</b>
          <div style="display:flex;gap:6px;margin-left:auto">
            <button type="button" class="btn ghost small" data-wedit="${w.date}">修改</button>
            <button type="button" class="btn danger small" data-wdel="${w.date}">删除</button>
          </div>
        </div>`).join("") + `</div>
      <div class="modal-actions"><button type="button" class="btn ghost" data-act="cancel">关闭</button></div>`;
    UI.openModal(html, box => {
      box.querySelectorAll("[data-wdel]").forEach(btn => {
        btn.addEventListener("click", () => {
          const date = btn.dataset.wdel;
          if (!confirm(`删除 ${date} 的体重记录？`)) return;
          data.weights = (data.weights || []).filter(w => w.date !== date);
          Store.save(data);
          openWeightManage();
          renderChart(data);
          renderBody(data);
          UI.toast("记录已删除");
        });
      });
      box.querySelectorAll("[data-wedit]").forEach(btn => {
        btn.addEventListener("click", () => {
          const date = btn.dataset.wedit;
          const rec = (data.weights || []).find(w => w.date === date);
          if (!rec) return;
          const html2 = `<h2>修改体重</h2>
            <form id="weight-edit-form">
              ${UI.field("日期", UI.dateInput("date", date))}
              ${UI.field("体重（kg）", `<input class="input" type="number" step="0.1" name="value" value="${rec.value}">`)}
              ${UI.modalActions("保存")}
            </form>`;
          UI.openModal(html2, box2 => {
            box2.querySelector("[data-act=ok]").addEventListener("click", () => {
              const v = UI.serialize(box2.querySelector("#weight-edit-form"));
              if (!v.value) { UI.toast("请输入体重"); return; }
              data.weights = (data.weights || []).filter(w => w.date !== date);
              data.weights.push({ date: v.date, value: Number(v.value) });
              Store.save(data);
              UI.closeModal();
              openWeightManage();
              renderChart(data);
              renderBody(data);
              UI.toast("体重已修改");
            });
          });
        });
      });
    });
  }

  /* ---------- 仪表盘：本周健身 ---------- */
  function weekSummary() {
    const data = Store.load();
    const workouts = data.workouts || {};
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const key = Store.todayStr(-i);
      if (workouts[key] && workouts[key].length) count++;
    }
    return { count };
  }

  function bindEvents() {
    document.getElementById("btn-add-weight").addEventListener("click", openWeightForm);
    document.getElementById("btn-manage-weights").addEventListener("click", openWeightManage);
    document.getElementById("btn-clear-plan").addEventListener("click", () => {
      if (!confirm("确定清空所有已填写的训练计划？")) return;
      const data = Store.load();
      data.body.plan = {};
      data.workouts = data.workouts || {};
      delete data.workouts[Store.todayStr()];
      Store.save(data);
      renderPlan(data);
      UI.toast("锻炼计划已清空");
    });
    document.querySelectorAll("#chart-tabs .filter-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        chartRange = chip.dataset.range;
        renderChart(Store.load());
      });
    });
  }

  return { render, openBodyForm, weekSummary, bindEvents };
})();
