const $ = (id) => document.getElementById(id);
let me = null;
let billFilter = "unpaid";

const ICONS = {
  home: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  file: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  checkBig: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>',
  undo: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  bill: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6"/></svg>',
  cal: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  search: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  heart: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8 3.4 4 7.2 4c2 0 3.6 1.1 4.8 2.7C13.2 5.1 14.8 4 16.8 4 20.6 4 23 8 21.5 11.8 19.5 16.4 12 21 12 21z"/></svg>',
};

const SUGGESTIONS = [
  { text: "What bills are due in the next two weeks?", icon: "bill", color: "amber" },
  { text: "What's on our calendar this weekend?", icon: "cal", color: "green" },
  { text: "Find our car insurance policy", icon: "search", color: "blue" },
  { text: "Find a free evening next week for date night", icon: "heart", color: "pink" },
];

async function api(path, opts = {}) {
  const r = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  if (r.status === 401) { location.href = "/login"; throw new Error("signed out"); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof data.detail === "string" ? data.detail : `Error ${r.status}`);
  return data;
}

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Small, safe markdown: bold, italics, code, links, bullet and numbered lists, paragraphs.
function md(text) {
  const inline = (s) => esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out = [];
  let list = null;
  const close = () => { if (list) { out.push(`</${list}>`); list = null; } };
  for (const raw of String(text).split("\n")) {
    const line = raw.trimEnd();
    let m;
    if ((m = line.match(/^\s*[-*•]\s+(.*)/))) {
      if (list !== "ul") { close(); out.push("<ul>"); list = "ul"; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\s*\d+[.)]\s+(.*)/))) {
      if (list !== "ol") { close(); out.push("<ol>"); list = "ol"; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if (!line.trim()) {
      close();
    } else {
      close();
      out.push(`<p>${inline(line.replace(/^#+\s*/, ""))}</p>`);
    }
  }
  close();
  return out.join("");
}

function scrollDown() { const m = $("main"); m.scrollTop = m.scrollHeight; }

function addMessage(role, content, extras = {}) {
  const hero = document.querySelector("#messages .hero");
  if (hero) hero.remove();
  const wrap = document.createElement("div");
  wrap.className = `msg ${role}`;
  if (role !== "user") wrap.innerHTML = `<div class="avatar">${ICONS.home}</div>`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (role === "user") bubble.textContent = content;
  else bubble.innerHTML = md(content);
  const chips = [];
  for (const a of extras.actions || []) chips.push(`<span class="chip action">${ICONS.check} ${esc(a)}</span>`);
  for (const s of extras.sources || []) {
    chips.push(`<a class="chip file" target="_blank" title="${esc(s.path)}" href="/files/download?path=${encodeURIComponent(s.path)}">${ICONS.file} ${esc(s.name)}</a>`);
  }
  if (chips.length) bubble.insertAdjacentHTML("beforeend", `<div class="chips">${chips.join("")}</div>`);
  wrap.appendChild(bubble);
  $("messages").appendChild(wrap);
  scrollDown();
  return bubble;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function showEmpty() {
  const first = me?.user?.display_name || "there";
  $("messages").innerHTML = `
    <div class="hero">
      <h2>${greeting()},<br><span class="grad-text">${esc(first)}</span></h2>
      <p>Ask me about files on the NAS, your calendars, or bills.</p>
      <div class="suggest">
        ${SUGGESTIONS.map((s) => `<button class="c-${s.color}"><span class="ic">${ICONS[s.icon]}</span>${esc(s.text)}</button>`).join("")}
      </div>
    </div>`;
  document.querySelectorAll(".suggest button").forEach((b) => {
    b.onclick = () => { $("input").value = b.textContent.trim(); send(); };
  });
}

async function loadHistory() {
  const { messages } = await api("/api/history");
  $("messages").innerHTML = "";
  if (!messages.length) return showEmpty();
  for (const m of messages) addMessage(m.role, m.content);
}

async function send(e) {
  if (e) e.preventDefault();
  const text = $("input").value.trim();
  if (!text) return;
  switchView("chat");
  $("input").value = "";
  autosize();
  addMessage("user", text);
  const pending = addMessage("assistant", "");
  pending.innerHTML = '<span class="typing"><span></span><span></span><span></span></span><div class="slow-note"></div>';
  const notes = [
    [20000, "Still thinking. Slower computers can take a minute or two."],
    [75000, "Nearly there, probably. Bigger questions take longer."],
  ];
  const timers = notes.map(([ms, msg]) => setTimeout(() => {
    const n = pending.querySelector(".slow-note");
    if (n) n.textContent = msg;
  }, ms));
  $("send").disabled = true;
  try {
    const res = await api("/api/chat", { method: "POST", body: JSON.stringify({ message: text }) });
    pending.parentElement.remove();
    addMessage("assistant", res.reply, res);
  } catch (err) {
    pending.innerHTML = `<span class="err">${esc(err.message)}</span>`;
  } finally {
    timers.forEach(clearTimeout);
    $("send").disabled = false;
    $("input").focus();
  }
}

function autosize() {
  const t = $("input");
  t.style.height = "auto";
  t.style.height = Math.min(t.scrollHeight, 140) + "px";
}

// ---------------------------------------------------------------- views

function switchView(name) {
  document.querySelectorAll(".tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  $("composer").style.display = name === "chat" ? "" : "none";
  if (name === "bills") { loadBills(); pollScan(); }
  if (name === "settings") loadSettings();
  if (name === "chat") scrollDown();
  history.replaceState(null, "", name === "chat" ? "/" : `#${name}`);
}

// ---------------------------------------------------------------- bills

function money(amount, currency) {
  if (amount == null) return "?";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(amount);
  } catch { return `${amount} ${currency || ""}`; }
}

function daysUntil(iso) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  return Math.round((d - today) / 86400000);
}

function niceDate(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function billState(b) {
  if (b.status === "paid") return { cls: "paid", pill: '<span class="pill gray">Paid</span>' };
  if (!b.due_date) return { cls: "", pill: '<span class="pill gray">No due date</span>' };
  const n = daysUntil(b.due_date);
  if (n < 0) return { cls: "overdue", pill: `<span class="pill red">Overdue ${-n} day${n === -1 ? "" : "s"}</span>` };
  if (n === 0) return { cls: "soon", pill: '<span class="pill amber">Due today</span>' };
  if (n <= 7) return { cls: "soon", pill: `<span class="pill amber">Due in ${n} day${n === 1 ? "" : "s"}</span>` };
  return { cls: "", pill: `<span class="pill green">Due ${niceDate(b.due_date)}</span>` };
}

async function loadStats() {
  const { bills } = await api("/api/bills?status=unpaid");
  const cur = bills.find((b) => b.currency)?.currency || "USD";
  const total = bills.reduce((s, b) => s + (b.amount || 0), 0);
  const overdue = bills.filter((b) => b.due_date && daysUntil(b.due_date) < 0).length;
  const week = bills.filter((b) => b.due_date && daysUntil(b.due_date) >= 0 && daysUntil(b.due_date) <= 7).length;
  $("billStats").innerHTML = `
    <div class="stat s1"><div class="n">${esc(money(total, cur))}</div><div class="l">Unpaid total</div></div>
    <div class="stat s2"><div class="n">${overdue}</div><div class="l">Overdue</div></div>
    <div class="stat s3"><div class="n">${week}</div><div class="l">Due this week</div></div>`;
}

async function loadBills() {
  document.querySelectorAll("[data-bills]").forEach((b) => b.classList.toggle("on", b.dataset.bills === billFilter));
  loadStats();
  const { bills } = await api(`/api/bills?status=${billFilter}`);
  if (!bills.length) {
    $("billList").innerHTML = `<div class="empty-state"><div class="big">🎉</div>
      <p>No ${billFilter === "all" ? "" : billFilter + " "}bills here.<br>Tap <strong>Check email</strong> to look for new ones.</p></div>`;
    return;
  }
  $("billList").innerHTML = bills.map((b) => {
    const st = billState(b);
    const btn = b.status === "unpaid"
      ? `<button class="icon-btn check" data-act="paid" data-id="${b.id}" title="Mark paid">${ICONS.checkBig}</button>`
      : `<button class="icon-btn" data-act="unpaid" data-id="${b.id}" title="Mark unpaid">${ICONS.undo}</button>`;
    return `<div class="bill ${st.cls}">
      <div class="info">
        <div class="payee">${esc(b.payee)}</div>
        <div class="pills">${st.pill}${b.autopay ? '<span class="pill violet">Autopay</span>' : ""}</div>
        <div class="sub">${b.found_by ? "From " + esc(b.found_by) + "'s email" : ""}${b.subject ? " · " + esc(b.subject) : ""}</div>
      </div>
      <div class="amount">${esc(money(b.amount, b.currency))}</div>
      ${btn}
      <button class="icon-btn" data-act="delete" data-id="${b.id}" title="Remove">${ICONS.x}</button>
    </div>`;
  }).join("");
  $("billList").querySelectorAll("[data-act]").forEach((el) => {
    el.onclick = async () => {
      if (el.dataset.act === "delete" && !confirm("Remove this bill from the list?")) return;
      await api(`/api/bills/${el.dataset.id}`, { method: "POST", body: JSON.stringify({ action: el.dataset.act }) });
      loadBills();
    };
  });
}

let scanTimer = null;

async function pollScan() {
  const btn = $("scanBills");
  const label = btn.querySelector("span");
  const st = await api("/api/bills-scan");
  if (st.running) {
    btn.disabled = true;
    label.textContent = `Checking... ${st.checked} emails, ${st.found} bills`;
    clearTimeout(scanTimer);
    scanTimer = setTimeout(pollScan, 5000);
    return;
  }
  btn.disabled = false;
  label.textContent = "Check email";
  if (scanTimer) {
    scanTimer = null;
    if (st.error) alert(st.error);
    loadBills();
  }
}

async function scanBills() {
  try {
    const res = await api("/api/bills-scan", { method: "POST" });
    if (!res.started) alert(res.message);
    scanTimer = setTimeout(pollScan, 500);
  } catch (err) {
    alert(err.message);
  }
}

// ---------------------------------------------------------------- status and settings

async function loadStatus() {
  try {
    const s = await api("/api/status");
    const o = s.ollama;
    $("aiDot").className = `dot ${o.ok ? "ok" : "bad"}`;
    $("aiText").textContent = o.ok ? "AI online" : "AI offline (is the PC on?)";
    return s;
  } catch {
    $("aiDot").className = "dot bad";
    $("aiText").textContent = "AI offline";
    return null;
  }
}

async function loadSettings() {
  me = await api("/api/me");
  $("whoami").textContent = `Signed in as ${me.user.display_name} (${me.user.username})`;
  const gb = $("googleButtons");
  if (!me.google_configured) {
    $("googleStatus").textContent = "Not set up yet. See the README: add google_client_secret.json to the data folder.";
    gb.innerHTML = "";
  } else if (me.google_email) {
    $("googleStatus").textContent = `Connected as ${me.google_email}`;
    gb.innerHTML = `<a class="btn small ghost" href="/auth/google/start">Reconnect</a>
                    <button class="btn small ghost" id="gDisconnect">Disconnect</button>`;
    $("gDisconnect").onclick = async () => { await api("/api/google/disconnect", { method: "POST" }); loadSettings(); };
  } else {
    $("googleStatus").textContent = "Connect to use your calendar and email.";
    gb.innerHTML = `<a class="btn small" href="/auth/google/start">Connect Google</a>`;
  }
  $("householdList").innerHTML = me.household.map((m) => `
    <div class="member">
      <div class="av">${esc((m.display_name || "?")[0].toUpperCase())}</div>
      <div><div style="font-weight:700">${esc(m.display_name)}</div>
      <div class="muted">${m.google_email ? esc(m.google_email) : "Google not connected"}</div></div>
    </div>`).join("");

  const s = await loadStatus();
  if (!s) { $("ollamaStatus").textContent = "Couldn't check."; return; }
  const o = s.ollama;
  $("ollamaStatus").innerHTML = `<span class="dot ${o.ok ? "ok" : "bad"}"></span>&nbsp; ${esc(o.model)} at ${esc(o.url)}` +
    (o.error ? `<br><span class="err">${esc(o.error)}</span>` : "");
  const i = s.index;
  $("indexStatus").textContent = i.running
    ? `Indexing now... ${i.scanned.toLocaleString()} files looked at, ${i.updated.toLocaleString()} updated.`
    : `${i.files.toLocaleString()} files indexed. Last run: ${i.last_index ? new Date(i.last_index).toLocaleString() : "never"}.` +
      (i.error ? ` Last error: ${i.error}` : "");
}

// ---------------------------------------------------------------- wiring

document.querySelectorAll(".tabbar button").forEach((b) => (b.onclick = () => switchView(b.dataset.view)));
document.querySelectorAll("[data-bills]").forEach((b) => (b.onclick = () => { billFilter = b.dataset.bills; loadBills(); }));
$("scanBills").onclick = scanBills;
$("composer").onsubmit = send;
$("input").addEventListener("input", autosize);
$("input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) send(e);
});
$("logout").onclick = async () => { await api("/api/logout", { method: "POST" }); location.href = "/login"; };
$("clearChat").onclick = async () => {
  if (!confirm("Clear your chat history?")) return;
  await api("/api/history/clear", { method: "POST" });
  showEmpty();
  switchView("chat");
};
$("reindex").onclick = async () => { await api("/api/index", { method: "POST" }); setTimeout(loadSettings, 1500); };

(async () => {
  me = await api("/api/me");
  document.title = me.assistant;
  $("appName").textContent = me.assistant;
  loadStatus();
  setInterval(loadStatus, 60000);
  await loadHistory();
  const hash = location.hash.slice(1);
  if (["bills", "settings"].includes(hash)) switchView(hash);
})();
