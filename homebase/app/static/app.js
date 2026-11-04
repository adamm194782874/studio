const $ = (id) => document.getElementById(id);
let me = null;
let billFilter = "unpaid";

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
  const empty = document.querySelector("#messages .empty");
  if (empty) empty.remove();
  const wrap = document.createElement("div");
  wrap.className = `msg ${role}`;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  if (role === "user") bubble.textContent = content;
  else bubble.innerHTML = md(content);
  const chips = [];
  for (const a of extras.actions || []) chips.push(`<span class="chip action">✓ ${esc(a)}</span>`);
  for (const s of extras.sources || []) {
    chips.push(`<a class="chip" target="_blank" title="${esc(s.path)}" href="/files/download?path=${encodeURIComponent(s.path)}">📄 ${esc(s.name)}</a>`);
  }
  if (chips.length) bubble.insertAdjacentHTML("beforeend", `<div class="chips">${chips.join("")}</div>`);
  wrap.appendChild(bubble);
  $("messages").appendChild(wrap);
  scrollDown();
  return bubble;
}

function showEmpty() {
  const first = me?.user?.display_name || "there";
  $("messages").innerHTML = `
    <div class="empty">
      <p>Hi ${esc(first)}. What can I help with?</p>
      <div class="suggest">
        <button>What bills are due in the next two weeks?</button>
        <button>What's on our calendar this weekend?</button>
        <button>Find our car insurance policy</button>
        <button>Find a free evening next week for date night</button>
      </div>
    </div>`;
  document.querySelectorAll(".suggest button").forEach((b) => {
    b.onclick = () => { $("input").value = b.textContent; send(); };
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
  pending.innerHTML = '<span class="thinking">Thinking...</span>';
  $("send").disabled = true;
  try {
    const res = await api("/api/chat", { method: "POST", body: JSON.stringify({ message: text }) });
    pending.parentElement.remove();
    addMessage("assistant", res.reply, res);
  } catch (err) {
    pending.innerHTML = `<span class="overdue">${esc(err.message)}</span>`;
  } finally {
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
  document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  $("composer").style.display = name === "chat" ? "" : "none";
  if (name === "bills") loadBills();
  if (name === "settings") loadSettings();
  if (name === "chat") scrollDown();
  history.replaceState(null, "", name === "chat" ? "/" : `#${name}`);
}

// ---------------------------------------------------------------- bills

function money(b) {
  if (b.amount == null) return "?";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: b.currency || "USD" }).format(b.amount);
  } catch { return `${b.amount} ${b.currency || ""}`; }
}

async function loadBills() {
  document.querySelectorAll("[data-bills]").forEach((b) => b.classList.toggle("ghost", b.dataset.bills !== billFilter));
  const { bills } = await api(`/api/bills?status=${billFilter}`);
  const today = new Date().toISOString().slice(0, 10);
  if (!bills.length) {
    $("billList").innerHTML = `<p class="muted">No ${billFilter === "all" ? "" : billFilter + " "}bills. Tap "Check my email" to look for new ones.</p>`;
    return;
  }
  $("billList").innerHTML = bills.map((b) => {
    const overdue = b.status === "unpaid" && b.due_date && b.due_date < today;
    const due = b.due_date ? `Due ${b.due_date}` : "No due date";
    const btn = b.status === "unpaid"
      ? `<button class="btn small" data-act="paid" data-id="${b.id}">Paid</button>`
      : `<button class="btn small ghost" data-act="unpaid" data-id="${b.id}">Undo</button>`;
    return `<div class="bill">
      <div class="info">
        <div class="payee">${esc(b.payee)}${b.autopay ? ' <span class="muted">(autopay)</span>' : ""}</div>
        <div class="muted ${overdue ? "overdue" : ""}">${overdue ? "Overdue, " : ""}${esc(due)}${b.found_by ? " · " + esc(b.found_by) : ""}</div>
        ${b.subject ? `<div class="muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(b.subject)}</div>` : ""}
      </div>
      <div class="amount">${esc(money(b))}</div>
      ${btn}
      <button class="btn small ghost" data-act="delete" data-id="${b.id}" title="Remove">✕</button>
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

async function scanBills() {
  const btn = $("scanBills");
  btn.disabled = true;
  btn.textContent = "Checking...";
  try {
    const res = await api("/api/bills-scan", { method: "POST" });
    btn.textContent = `Found ${res.new_bills.length} new`;
    loadBills();
  } catch (err) {
    alert(err.message);
    btn.textContent = "Check my email";
  } finally {
    btn.disabled = false;
    setTimeout(() => { btn.textContent = "Check my email"; }, 4000);
  }
}

// ---------------------------------------------------------------- settings

async function loadSettings() {
  me = await api("/api/me");
  $("whoami").textContent = `Signed in as ${me.user.display_name} (${me.user.username}).`;
  const gb = $("googleButtons");
  if (!me.google_configured) {
    $("googleStatus").textContent = "Google isn't set up yet. See the README: add google_client_secret.json to the data folder.";
    gb.innerHTML = "";
  } else if (me.google_email) {
    $("googleStatus").textContent = `Connected as ${me.google_email}.`;
    gb.innerHTML = `<a class="btn small ghost" href="/auth/google/start">Reconnect</a>
                    <button class="btn small ghost" id="gDisconnect">Disconnect</button>`;
    $("gDisconnect").onclick = async () => { await api("/api/google/disconnect", { method: "POST" }); loadSettings(); };
  } else {
    $("googleStatus").textContent = "Not connected. Connect to use your calendar and email.";
    gb.innerHTML = `<a class="btn small" href="/auth/google/start">Connect Google</a>`;
  }
  $("householdList").innerHTML = me.household.map((m) =>
    `<div>${esc(m.display_name)}: ${m.google_email ? "Google connected" : "Google not connected"}</div>`).join("");

  try {
    const s = await api("/api/status");
    const o = s.ollama;
    $("ollamaStatus").innerHTML = `<span class="dot ${o.ok ? "ok" : "bad"}"></span> ${esc(o.model)} at ${esc(o.url)}` +
      (o.error ? `<br><span class="overdue">${esc(o.error)}</span>` : "");
    const i = s.index;
    $("indexStatus").textContent = i.running
      ? `Indexing now... ${i.scanned} files looked at, ${i.updated} updated.`
      : `${i.files.toLocaleString()} files indexed from ${i.roots.join(", ")}. Last run: ${i.last_index || "never"}.` +
        (i.error ? ` Last error: ${i.error}` : "");
  } catch (err) {
    $("ollamaStatus").textContent = err.message;
  }
}

// ---------------------------------------------------------------- wiring

document.querySelectorAll("nav button").forEach((b) => (b.onclick = () => switchView(b.dataset.view)));
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
  await loadHistory();
  const hash = location.hash.slice(1);
  if (["bills", "settings"].includes(hash)) switchView(hash);
})();
