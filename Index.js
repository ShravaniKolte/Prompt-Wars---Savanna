// ═══════════════════════════════════════════
//  SAVANNA FRONTEND — Live API client
//  Backend: https://prompt-wars-savanna-production.up.railway.app
// ═══════════════════════════════════════════

const API = "https://prompt-wars-savanna-production.up.railway.app";

function getToken() { return localStorage.getItem("savanna_token"); }
function setToken(t) { localStorage.setItem("savanna_token", t); }
function clearToken() { localStorage.removeItem("savanna_token"); }

async function apiFetch(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  const res = await fetch(API + path, { ...opts, headers });
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "API error");
  return data;
}

let currentUser = null;

function openModal() { document.getElementById("authModal").classList.add("open"); }
function closeModal() { document.getElementById("authModal").classList.remove("open"); }
function switchTab(tab) {
  document.getElementById("login-form").style.display  = tab === "login"  ? "block" : "none";
  document.getElementById("signup-form").style.display = tab === "signup" ? "block" : "none";
  document.querySelectorAll(".modal-tab").forEach((t,i) =>
    t.classList.toggle("active", (i===0 && tab==="login")||(i===1 && tab==="signup")));
}

async function doSignup() {
  const name  = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const pass  = document.getElementById("signup-pass").value;
  const err   = document.getElementById("signup-error");
  err.style.display = "none";
  if (!name || !email || pass.length < 6) {
    err.textContent = "Please fill all fields (min. 6 char password).";
    err.style.display = "block"; return;
  }
  try {
    const data = await apiFetch("/auth/signup", {
      method: "POST", body: JSON.stringify({ name, email, password: pass })
    });
    setToken(data.access_token); currentUser = data.user;
    closeModal(); updateNavAuth(); loadUserData();
    showToast("Welcome to SAVANNA, " + data.user.name + "! 🌿");
  } catch(e) { err.textContent = e.message; err.style.display = "block"; }
}

async function doLogin() {
  const email = document.getElementById("login-email").value.trim();
  const pass  = document.getElementById("login-pass").value;
  const err   = document.getElementById("login-error");
  err.style.display = "none";
  try {
    const data = await apiFetch("/auth/login", {
      method: "POST", body: JSON.stringify({ email, password: pass })
    });
    setToken(data.access_token); currentUser = data.user;
    closeModal(); updateNavAuth(); loadUserData();
    showToast("Welcome back, " + data.user.name + "! 🌿");
  } catch(e) { err.textContent = e.message; err.style.display = "block"; }
}

async function doLogout() {
  currentUser = null; clearToken(); updateNavAuth();
  document.getElementById("history-list").innerHTML =
    '<p style="color:var(--muted);font-size:14px;">No logs yet. Save your first day above.</p>';
  document.getElementById("ledger-rows").innerHTML =
    '<div style="padding:20px;color:var(--muted);font-size:14px;">No entries yet.</div>';
  document.getElementById("lb-your-kg").textContent = "— kg";
  showToast("Signed out. See you tomorrow.");
}

function updateNavAuth() {
  const si = document.getElementById("signin-btn");
  const st = document.getElementById("start-btn");
  const so = document.getElementById("signout-btn");
  const ni = document.getElementById("nav-user-info");
  if (currentUser) {
    si.style.display = "none"; st.style.display = "none";
    so.style.display = "inline-block"; ni.textContent = currentUser.name;
  } else {
    si.style.display = "inline-block"; st.style.display = "inline-block";
    so.style.display = "none"; ni.textContent = "";
  }
}

async function tryRestoreSession() {
  if (!getToken()) return;
  try {
    currentUser = await apiFetch("/auth/me");
    updateNavAuth(); loadUserData();
  } catch { clearToken(); }
}

function selectCard(el, groupId) {
  document.querySelectorAll("#" + groupId + " .log-card").forEach(c => c.classList.remove("selected"));
  el.classList.add("selected"); updateTotal(); updateLoggedCount();
}
function selectDeed(el) {
  document.querySelectorAll("#deed-cards .log-deed-card").forEach(c => c.classList.remove("selected"));
  el.classList.add("selected"); updateTotal(); updateLoggedCount();
}

function getVal(groupId, isDeeds) {
  const sel = isDeeds
    ? document.querySelector("#deed-cards .log-deed-card.selected")
    : document.querySelector("#" + groupId + " .log-card.selected");
  return sel ? parseFloat(sel.dataset.val) || 0 : 0;
}

function getLabel(groupId, isDeeds) {
  const sel = isDeeds
    ? document.querySelector("#deed-cards .log-deed-card.selected .deed-name")
    : document.querySelector("#" + groupId + " .log-card.selected .log-card-name");
  return sel ? sel.textContent : "";
}

function updateTotal() {
  const t = getVal("travel-cards") + getVal("food-cards") + getVal("energy-cards") +
            getVal("shop-cards") + getVal("", true);
  const diff = t - 2.30;
  document.getElementById("today-val").textContent = t.toFixed(2);
  const el = document.getElementById("paris-diff");
  el.textContent = (diff >= 0 ? "+" : "") + diff.toFixed(2) + " kg";
  el.style.color = diff > 0 ? "var(--red-debt)" : "var(--green-credit)";
  const hs = document.getElementById("hero-status");
  hs.textContent = diff <= 0 ? "On track" : "Over target";
  hs.style.background = diff <= 0 ? "#3DB85C" : "#B84C3A";
  const avg = t, twin = Math.max(0.8, avg * 0.62).toFixed(1);
  const gap = (avg - parseFloat(twin)).toFixed(1);
  const pct = Math.round((avg - parseFloat(twin)) / (avg || 1) * 100);
  document.getElementById("twin-you").textContent = avg.toFixed(1);
  document.getElementById("twin-val").textContent = twin;
  document.getElementById("twin-gap").textContent = gap;
  document.getElementById("twin-pct").textContent = "−" + pct + "% vs. you";
  document.getElementById("lb-your-kg").textContent = avg.toFixed(2) + " kg";
}

function updateLoggedCount() {
  const groups = ["travel-cards","food-cards","energy-cards","shop-cards"];
  let count = groups.filter(g => document.querySelector("#"+g+" .log-card.selected")).length;
  if (document.querySelector("#deed-cards .log-deed-card.selected")) count++;
  document.getElementById("logged-count").textContent = count + " / 5 logged";
}

function resetDay() {
  ["travel-cards","food-cards","energy-cards","shop-cards"].forEach(g =>
    document.querySelectorAll("#"+g+" .log-card").forEach((c,i) => c.classList.toggle("selected", i===0)));
  document.querySelectorAll("#deed-cards .log-deed-card").forEach((c,i) => c.classList.toggle("selected", i===0));
  updateTotal(); updateLoggedCount(); showToast("Day reset.");
}

async function saveDay() {
  if (!currentUser) { openModal(); return; }
  const today = new Date().toISOString().split("T")[0];
  const payload = {
    date: today,
    travel_kg:   getVal("travel-cards"), food_kg:  getVal("food-cards"),
    energy_kg:   getVal("energy-cards"), shop_kg:  getVal("shop-cards"),
    deed_kg:     getVal("", true),
    travel_name: getLabel("travel-cards"), food_name:  getLabel("food-cards"),
    energy_name: getLabel("energy-cards"), shop_name:  getLabel("shop-cards"),
    deed_name:   getLabel("", true),
  };
  try {
    const log = await apiFetch("/logs/", { method: "POST", body: JSON.stringify(payload) });
    showToast("Day saved! " + log.total_kg.toFixed(2) + " kg CO₂ logged. 🌿");
    loadUserData();
  } catch(e) { showToast("Error: " + e.message); }
}

async function loadUserData() {
  if (!currentUser) return;
  try { await Promise.all([renderHistory(), renderLedger(), loadTwin(), loadLeaderboard()]); }
  catch(e) { console.warn("loadUserData:", e); }
}

async function renderHistory() {
  const summary = await apiFetch("/logs/summary?days=7");
  const logs = summary.logs || [];
  const list = document.getElementById("history-list");
  if (!logs.length) {
    list.innerHTML = '<p style="color:var(--muted);font-size:14px;">No logs yet. Save your first day above.</p>';
    return;
  }
  list.innerHTML = logs.map(l => `
    <div class="history-item">
      <span class="history-date">${l.date}</span>
      <span style="color:var(--text);font-size:14px;">${l.travel_name}, ${(l.food_name||"").toLowerCase()}</span>
      <span class="history-kg ${l.total_kg <= 2.3 ? "good" : "bad"}">${l.total_kg.toFixed(2)} kg</span>
    </div>`).join("");
}

async function renderLedger() {
  const logs = await apiFetch("/logs/?limit=30");
  if (!logs.length) return;
  let balance = 0;
  const rows = logs.slice(0,5).map(l => {
    const delta = l.vs_paris; balance += delta;
    const sign = delta >= 0 ? "+" : "", cls = delta >= 0 ? "pos" : "neg";
    const entry = [l.travel_name, l.food_name].filter(Boolean).join(", ").toLowerCase();
    return `<div class="ledger-row">
      <div class="ledger-date">${l.date}</div>
      <div class="ledger-entry">${entry}</div>
      <div class="ledger-delta ${cls}">${sign}${delta.toFixed(1)}</div>
      <div class="ledger-balance">${balance.toFixed(1)}</div></div>`;
  }).join("");
  document.getElementById("ledger-rows").innerHTML = rows;
  const balEl = document.getElementById("ledger-balance-val");
  balEl.textContent = (balance >= 0 ? "+" : "") + balance.toFixed(1) + " kg";
  balEl.style.color = balance <= 0 ? "var(--green-credit)" : "var(--red-debt)";
  document.getElementById("ledger-balance-sub").textContent =
    balance <= 0 ? "credit · banked this month" : "debt · above target";
  const onTrack = logs.filter(l => l.on_track).length;
  document.getElementById("ledger-quote").textContent = balance <= 0
    ? `You've stayed under the Paris target for ${onTrack} of ${logs.length} days. Keep it up.`
    : `You're ${balance.toFixed(1)} kg over target across ${logs.length} days. One good day can turn it around.`;
}

async function loadTwin() {
  try {
    const t = await apiFetch("/twin/");
    document.getElementById("twin-you").textContent = t.your_avg_kg.toFixed(1);
    document.getElementById("twin-val").textContent = t.twin_avg_kg.toFixed(1);
    document.getElementById("twin-gap").textContent = t.gap_kg.toFixed(1);
    document.getElementById("twin-pct").textContent = "−" + t.pct_better + "% vs. you";
  } catch(e) { /* not enough data yet */ }
}

async function loadLeaderboard() {
  try {
    const data = await apiFetch("/community/leaderboard?days=7&limit=10");
    const you = data.leaderboard.find(r => r.is_you);
    if (you) {
      document.getElementById("lb-your-kg").textContent = you.avg_kg.toFixed(2) + " kg";
      document.getElementById("community-title").textContent =
        "You're #" + you.rank + " of " + data.total_users + " in your community this week.";
    }
  } catch(e) { /* not enough users yet */ }
}

const HABITS = [
  "Trade two drive-days for the 47 bus.",
  "Switch to plant-based lunches Mon–Wed.",
  "Line-dry laundry instead of tumble-drying.",
  "Walk the short commute once this week.",
  "Buy nothing new for 5 days straight.",
  "Turn off standby devices at the wall each night.",
  "Choose a local, seasonal meal three times.",
];
let habitIndex = 0, activeHabitId = null, habitDays = 0;

function nextHabit() {
  habitIndex = (habitIndex + 1) % HABITS.length;
  document.getElementById("habit-title").textContent = HABITS[habitIndex];
  showToast("New habit suggestion loaded.");
}

async function acceptHabit() {
  if (!currentUser) { openModal(); return; }
  try {
    const h = await apiFetch("/habits/", { method: "POST", body: JSON.stringify({ title: HABITS[habitIndex] }) });
    activeHabitId = h.id; habitDays = 1;
    document.getElementById("habit-progress").textContent = habitDays + " / 7 days";
    showToast("Habit accepted! 💪");
  } catch(e) { showToast("Error: " + e.message); }
}

function heroLog() {
  const input = document.getElementById("hero-input");
  const val = input.value.trim();
  if (!val) { document.querySelector("#daily-log").scrollIntoView({behavior:"smooth"}); return; }
  showToast('Noted: "' + val + '" — scroll down to log your choices.');
  input.value = "";
}

function scrollToLog(section) {
  const map = {travel:"travel-section",food:"food-section",energy:"energy-section",shop:"shop-section",deed:"deed-section"};
  document.getElementById(map[section])?.scrollIntoView({behavior:"smooth",block:"center"});
}

function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  tryRestoreSession();
  updateTotal(); updateLoggedCount();
  document.getElementById("authModal").addEventListener("click", (e) => {
    if (e.target === document.getElementById("authModal")) closeModal();
  });
});
