/* ============================================================
 * store.js —— 数据存储层
 * localStorage 存结构化数据；IndexedDB 存图片/视频素材
 * ============================================================ */

const Store = (function () {
  const BASE_KEY = "college-life-assistant-v1";
  const USERS_KEY = "college-users";
  const CURRENT_KEY = "college-current-user";

  /* ---------- 用户与登录 ---------- */
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); }
    catch (e) { return {}; }
  }

  function saveUsers(users) {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
    catch (e) { /* ignore */ }
  }

  function getCurrentUser() {
    return localStorage.getItem(CURRENT_KEY) || "";
  }

  function setCurrentUser(name) {
    if (name) localStorage.setItem(CURRENT_KEY, name);
    else localStorage.removeItem(CURRENT_KEY);
  }

  /* 简单散列（本地演示级，非加密用途） */
  function hashPwd(pwd) {
    let h = 5381;
    const s = "yusheng#" + pwd + "#2026";
    for (let i = 0; i < s.length; i++) {
      h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
    }
    return h.toString(16);
  }

  function userDataKey() {
    const name = getCurrentUser();
    return name ? BASE_KEY + "_" + encodeURIComponent(name) : BASE_KEY;
  }

  function migrateLegacy() {
    const legacy = localStorage.getItem(BASE_KEY);
    const dest = userDataKey();
    if (legacy && !localStorage.getItem(dest)) {
      localStorage.setItem(dest, legacy);
    }
  }

  function register(name, pwd) {
    const n = String(name || "").trim();
    if (!n) return { ok: false, msg: "请输入姓名" };
    const users = getUsers();
    if (users[n]) return { ok: false, msg: "该姓名已注册，请直接登录" };
    users[n] = { hash: hashPwd(String(pwd || "")), createdAt: new Date().toISOString() };
    saveUsers(users);
    setCurrentUser(n);
    migrateLegacy();
    return { ok: true };
  }

  function login(name, pwd) {
    const n = String(name || "").trim();
    const users = getUsers();
    const u = users[n];
    if (!u) return { ok: false, msg: "该姓名未注册" };
    if (u.hash !== hashPwd(String(pwd || ""))) return { ok: false, msg: "密码错误" };
    setCurrentUser(n);
    migrateLegacy();
    return { ok: true };
  }

  function logout() {
    setCurrentUser("");
  }

  /* ---------- localStorage 通用读写 ---------- */
  const defaults = {
    courses: [],      // 课程 [{id,name,day,start,end,weeks,place,teacher,color}]
    plans: [],        // 日程安排 [{id,date,start,end,type,note}]
    events: [],       // 重要事项 [{id,date,title}]
    body: { height: 175, weight: 65, age: 18, gender: "男", goal: "减脂", activity: "轻度", bodyfat: "", plan: {} },
    diet: {},         // { "YYYY-MM-DD": { 早餐:true, 午餐:true, 晚餐:true, 水: 杯数 } }
    workouts: {},     // { "YYYY-MM-DD": [训练名] }
    weights: [],      // [{date, value}]
    budget: 2000,     // 每月预算（元）
    finance: [],      // [{id, date, type:'in'|'out', cat, amount, note}]
    todos: [],        // [{id, title, cat, due, priority, done}]
    periods: [        // 节次开始时间，河南财政金融学院官方 2025 秋季起：13 节，每节 45 分钟
      "08:00", "08:55", "10:00", "10:55", "11:50",
      "14:00", "14:55", "16:00", "16:55",
      "18:10", "19:05", "20:00", "20:55"
    ],
  };

  function load() {
    try {
      const raw = localStorage.getItem(userDataKey());
      const data = raw ? JSON.parse(raw) : {};
      // 深拷贝默认值，避免调用方修改污染共享数组
      const merged = Object.assign(JSON.parse(JSON.stringify(defaults)), data);
      // 节次数量变化时（旧版 12 节 → 新版 13 节），自动迁移为官方时间
      if (!Array.isArray(merged.periods) || merged.periods.length !== defaults.periods.length) {
        merged.periods = defaults.periods.slice();
      }
      return merged;
    } catch (e) {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  function save(data) {
    try { localStorage.setItem(userDataKey(), JSON.stringify(data)); }
    catch (e) { UI.toast("保存失败：浏览器存储空间不足或已禁用"); }
  }

  /* ---------- 工具 ---------- */
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function todayStr(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return fmtDate(d);
  }

  function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function weekdayCn(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][d.getDay()];
  }

  function monthStr(dateStr) {
    return (dateStr || todayStr()).slice(0, 7);
  }

  /* ---------- IndexedDB 媒体素材 ---------- */
  const DB_NAME = "vlog-media-db";
  const DB_STORE = "media";
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(DB_STORE, mode);
      const store = t.objectStore(DB_STORE);
      const req = fn(store);
      if (req && typeof req.onsuccess !== "undefined") {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } else {
        t.oncomplete = () => resolve();
        t.onerror = () => reject(t.error);
      }
    }));
  }

  return {
    load, save, uid, todayStr, fmtDate, weekdayCn, monthStr,
    getCurrentUser, register, login, logout,
    media: {
      add: (item) => tx("readwrite", s => s.add(item)),
      put: (item) => tx("readwrite", s => s.put(item)),
      del: (id) => tx("readwrite", s => s.delete(id)),
      get: (id) => tx("readonly", s => s.get(id)),
      all: () => tx("readonly", s => s.getAll()),
    },
  };
})();
