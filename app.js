'use strict';

/* ---------- Constants ---------- */
const KEY = 'badenBarbell.v1';
const STEP = 2.5;
const DAYS = ['sun', 'tue', 'thu', 'fri'];
const DAY_META = {
  sun: { short: 'Sun', name: 'Sunday', dow: 0, note: 'Deadlift and back. Flexible start, heaviest day.' },
  tue: { short: 'Tue', name: 'Tuesday', dow: 2, note: 'Bench and submax deadlift. 4:00 AM start.' },
  thu: { short: 'Thu', name: 'Thursday', dow: 4, note: 'Squat. 4:00 AM start.' },
  fri: { short: 'Fri', name: 'Friday', dow: 5, note: 'Upper body hypertrophy. 4:00 AM start.' }
};
const WEEKS = ['Week 1', 'Week 2', 'Week 3', 'Deload'];
const LIFTS = { sq: 'Squat', bp: 'Bench', dl: 'Deadlift', none: 'Accessory' };
const LIFT_DAY = { sq: 'thu', bp: 'tue', dl: 'sun' }; // colour for each lift

/* ---------- Default program ---------- */
const S = (reps, p = null) => ({ reps: String(reps), p });
const rep = (n, reps, p = null) => Array.from({ length: n }, () => S(reps, p));
const allWeeks = (n, reps) => [0, 1, 2, 3].map(() => rep(n, reps));
const pctWeeks = (n, reps, ps) => ps.map(p => rep(n, reps, p));

function defaultProgram() {
  const ramp = top => [S(3, .5), S(2, .65), S(1, .75), S(1, .85), S(1, top)];
  return {
    sun: [
      { id: 'sun-dl', name: 'Deadlift', lift: 'dl',
        weeks: [ramp(.9), ramp(.93), ramp(.95), [S(3, .5), S(2, .6), S(1, .7), S(1, .8)]] },
      { id: 'sun-row', name: 'Barbell Rows', lift: 'none', weeks: allWeeks(4, 3) },
      { id: 'sun-lat', name: 'Lat Pulldown', lift: 'none', weeks: allWeeks(3, 3) },
      { id: 'sun-dtp', name: 'Decline Tricep Press', lift: 'none', weeks: allWeeks(3, 3) },
      { id: 'sun-curl', name: 'Barbell Curls', lift: 'none', weeks: allWeeks(3, 3) }
    ],
    tue: [
      { id: 'tue-bp', name: 'Bench Press', lift: 'bp', weeks: pctWeeks(3, 3, [.8, .825, .85, .65]) },
      { id: 'tue-dl', name: 'Deadlift (submax)', lift: 'dl',
        weeks: [rep(4, 2, .75), rep(4, 2, .78), rep(4, 1, .85), rep(3, 2, .65)] },
      { id: 'tue-cgb', name: 'Close Grip Bench', lift: 'none', weeks: allWeeks(3, 3) },
      { id: 'tue-idb', name: 'Incline DB Press', lift: 'none', weeks: allWeeks(3, 3) }
    ],
    thu: [
      { id: 'thu-sq', name: 'Squat', lift: 'sq', weeks: pctWeeks(3, 3, [.8, .825, .85, .65]) },
      { id: 'thu-lc', name: 'Leg Curls', lift: 'none', weeks: allWeeks(3, 3) },
      { id: 'thu-csr', name: 'Chest Supported Row', lift: 'none', weeks: allWeeks(3, 3) }
    ],
    fri: [
      { id: 'fri-ohp', name: 'Overhead Press', lift: 'none', weeks: allWeeks(4, 3) },
      { id: 'fri-lat', name: 'Lateral Raises', lift: 'none', weeks: allWeeks(4, '6 to 8') },
      { id: 'fri-rdf', name: 'Rear Delt Flyes', lift: 'none', weeks: allWeeks(3, '6 to 8') },
      { id: 'fri-ez', name: 'EZ Bar Curls', lift: 'none', weeks: allWeeks(3, 3) },
      { id: 'fri-sc', name: 'Skull Crushers', lift: 'none', weeks: allWeeks(3, 3) },
      { id: 'fri-hc', name: 'Hammer Curls', lift: 'none', weeks: allWeeks(3, 3) }
    ]
  };
}

/* ---------- State ---------- */
const clone = o => JSON.parse(JSON.stringify(o));
const blank = () => ({ program: defaultProgram(), logs: {}, maxes: { sq: null, bp: null, dl: null }, week: 0 });

function normalize(s) {
  const b = blank();
  if (!s || typeof s !== 'object') return b;
  const program = {};
  for (const d of DAYS) program[d] = Array.isArray(s.program && s.program[d]) ? s.program[d] : b.program[d];
  return {
    program,
    logs: s.logs && typeof s.logs === 'object' ? s.logs : {},
    maxes: Object.assign(b.maxes, s.maxes || {}),
    week: [0, 1, 2, 3].includes(s.week) ? s.week : 0
  };
}
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch (e) { /* fall through */ }
  return blank();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { toast('Could not save. Storage might be full or blocked.'); }
}

let state = load();
const ui = { tab: 'train', day: currentTrainingDay(), edit: false, weekOnly: false };

function currentTrainingDay() {
  const dow = new Date().getDay();
  for (let i = 0; i < 7; i++) {
    const d = DAYS.find(k => DAY_META[k].dow === (dow + i) % 7);
    if (d) return d;
  }
  return 'sun';
}

/* ---------- Helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const round25 = v => Math.round(v / STEP) * STEP;
const fmtW = v => String(Math.round(v * 100) / 100);
const fmtPct = p => `${+(p * 100).toFixed(1)}%`;
const logKey = (id, w, i) => `${id}|${w}|${i}`;
const uid = () => 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const parseW = str => {
  const v = parseFloat(String(str).replace(',', '.'));
  return Number.isFinite(v) && v >= 0 ? v : null;
};
const findEx = id => {
  for (const d of DAYS) {
    const i = state.program[d].findIndex(e => e.id === id);
    if (i > -1) return { day: d, i, ex: state.program[d][i] };
  }
  return null;
};

function suggest(ex, set) {
  if (set.p == null || !LIFT_DAY[ex.lift]) return null;
  const max = state.maxes[ex.lift];
  return max ? round25(max * set.p) : null;
}

function dayCount(d, w) {
  let done = 0, total = 0;
  for (const ex of state.program[d]) {
    const sets = ex.weeks[w] || [];
    total += sets.length;
    sets.forEach((_, i) => { if ((state.logs[logKey(ex.id, w, i)] || {}).done) done++; });
  }
  return { done, total };
}
function exCount(ex, w) {
  const sets = ex.weeks[w] || [];
  let done = 0;
  sets.forEach((_, i) => { if ((state.logs[logKey(ex.id, w, i)] || {}).done) done++; });
  return { done, total: sets.length };
}

const ICON = {
  minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5 10-11"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>',
  done: '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5 10-11"/></svg>'
};

/* ---------- Train view ---------- */
function renderTrain() {
  const d = ui.day, w = state.week, list = state.program[d];
  document.body.dataset.day = d;
  const cards = list.length
    ? list.map((ex, i) => ui.edit ? editCard(ex, i, list.length) : setCard(ex)).join('')
    : `<div class="card empty">No exercises on this day yet.${ui.edit ? '' : ' Tap Edit exercises to add one.'}</div>`;

  $('#train').innerHTML = `
    <div class="pills" role="group" aria-label="Week">
      ${WEEKS.map((n, i) => `<button class="pill ${i === w ? 'on' : ''}" data-act="week" data-w="${i}" aria-pressed="${i === w}">${n}</button>`).join('')}
    </div>
    <div class="days" role="group" aria-label="Day">
      ${DAYS.map(k => `<button class="daybtn ${k === d ? 'on' : ''}" style="--c: var(--${k})" data-act="day" data-d="${k}" aria-pressed="${k === d}">
        <span class="dn">${DAY_META[k].short}</span><span class="dc" data-dc="${k}"></span></button>`).join('')}
    </div>
    <div class="dayhead">
      <div><h2>${DAY_META[d].name}</h2><p>${WEEKS[w]} · ${DAY_META[d].note}</p></div>
      <button class="btn ${ui.edit ? 'primary' : 'soft'}" data-act="edit">${ui.edit ? ICON.done + 'Done' : ICON.edit + 'Edit exercises'}</button>
    </div>
    ${ui.edit ? `<div class="editbar"><label><input type="checkbox" data-act="weekonly" ${ui.weekOnly ? 'checked' : ''}>
      Only change sets and reps in ${WEEKS[w]}</label></div>` : ''}
    <div class="cards">${cards}</div>
    ${ui.edit ? `<div class="efoot">
      <button class="btn primary block" data-act="addex">${ICON.plus}Add exercise</button>
      <button class="btn danger block" data-act="restoreday">Restore ${DAY_META[d].name} to the original plan</button>
    </div>` : ''}`;
  updateCounts();
}

function setCard(ex) {
  const w = state.week, sets = ex.weeks[w] || [];
  const rows = sets.map((s, i) => {
    const k = logKey(ex.id, w, i), L = state.logs[k] || {};
    const sug = suggest(ex, s);
    return `<div class="set ${L.done ? 'done' : ''}" data-k="${k}">
      <div class="lbl"><b>${esc(s.reps)}</b><span>reps</span>${s.p != null ? `<em>${fmtPct(s.p)}</em>` : ''}</div>
      <button class="step" data-act="minus" aria-label="Minus 2.5 kg">${ICON.minus}</button>
      <input class="wt" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done"
        value="${L.weight != null ? fmtW(L.weight) : ''}" placeholder="${sug != null ? fmtW(sug) : 'kg'}"
        ${sug != null ? `data-sug="${sug}"` : ''} aria-label="${esc(ex.name)} set ${i + 1} weight in kg">
      <button class="step" data-act="plus" aria-label="Plus 2.5 kg">${ICON.plus}</button>
      <button class="check" data-act="check" aria-pressed="${!!L.done}" aria-label="Set ${i + 1} done">${ICON.check}</button>
    </div>`;
  }).join('');
  return `<article class="card" data-ex="${ex.id}">
    <div class="card-h"><h3>${esc(ex.name)}</h3>
      <span class="chip ${ex.lift !== 'none' ? 'lift' : ''}">${LIFTS[ex.lift] || 'Accessory'}</span>
      <span class="count" data-cc="${ex.id}"></span></div>
    ${rows || '<div class="empty">No sets this week.</div>'}
  </article>`;
}

function editCard(ex, i, n) {
  const w = state.week, sets = ex.weeks[w] || [];
  return `<article class="card edit" data-ex="${ex.id}">
    <div class="erow">
      <input class="field grow" data-field="name" value="${esc(ex.name)}" aria-label="Exercise name">
    </div>
    <div class="erow">
      <select class="field grow" data-field="lift" aria-label="Counts toward">
        ${Object.entries(LIFTS).map(([k, v]) => `<option value="${k}" ${ex.lift === k ? 'selected' : ''}>${v}</option>`).join('')}
      </select>
      <button class="btn iconbtn" data-act="up" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>${ICON.up}</button>
      <button class="btn iconbtn" data-act="down" aria-label="Move down" ${i === n - 1 ? 'disabled' : ''}>${ICON.down}</button>
      <button class="btn danger" data-act="delex">Delete</button>
    </div>
    <div class="esets">
      ${sets.map((s, j) => `<div class="eset"><span>Set ${j + 1}</span>
        <input class="field" data-field="reps" data-i="${j}" value="${esc(s.reps)}" aria-label="Set ${j + 1} reps">
        <span class="${s.p != null ? 'pct' : ''}">${s.p != null ? fmtPct(s.p) : 'reps'}</span></div>`).join('') || '<div class="empty">No sets this week.</div>'}
    </div>
    <div class="erow">
      <button class="btn grow" data-act="rmset" ${sets.length ? '' : 'disabled'}>${ICON.minus}Remove set</button>
      <button class="btn grow" data-act="addset">${ICON.plus}Add set</button>
    </div>
  </article>`;
}

function updateCounts() {
  const w = state.week;
  for (const d of DAYS) {
    const el = $(`[data-dc="${d}"]`);
    if (!el) continue;
    const c = dayCount(d, w);
    el.textContent = `${c.done}/${c.total}`;
    el.parentElement.classList.toggle('full', c.total > 0 && c.done === c.total);
  }
  for (const ex of state.program[ui.day]) {
    const el = $(`[data-cc="${ex.id}"]`);
    if (!el) continue;
    const c = exCount(ex, w);
    el.textContent = `${c.done}/${c.total}`;
    el.classList.toggle('full', c.total > 0 && c.done === c.total);
  }
}

function setLog(k, patch) {
  const L = Object.assign({}, state.logs[k], patch);
  if (L.weight == null && !L.done) delete state.logs[k];
  else state.logs[k] = L;
  save();
  updateCounts();
}

function startWeight(row) {
  // Nearest earlier set in the same exercise that has a weight, else the suggestion, else 20.
  let prev = row.previousElementSibling;
  while (prev && prev.classList.contains('set')) {
    const v = parseW($('.wt', prev).value);
    if (v != null) return v;
    prev = prev.previousElementSibling;
  }
  const sug = $('.wt', row).dataset.sug;
  return sug ? +sug : 20;
}

/* ---------- Editing ---------- */
function weeksToEdit() { return ui.weekOnly ? [state.week] : [0, 1, 2, 3]; }

function editAction(act, ex, day, i) {
  const list = state.program[day];
  if (act === 'up' && i > 0) [list[i - 1], list[i]] = [list[i], list[i - 1]];
  if (act === 'down' && i < list.length - 1) [list[i + 1], list[i]] = [list[i], list[i + 1]];
  if (act === 'addset') {
    for (const w of weeksToEdit()) {
      const sets = ex.weeks[w] || (ex.weeks[w] = []);
      const last = sets[sets.length - 1] || ex.weeks[state.week][ex.weeks[state.week].length - 1] || S(3);
      sets.push(clone(last));
    }
  }
  if (act === 'rmset') for (const w of weeksToEdit()) if (ex.weeks[w] && ex.weeks[w].length) ex.weeks[w].pop();
  save();
  renderTrain();
}

/* ---------- Two-tap confirm ---------- */
let armed = null;
function confirmTap(btn, label, fn) {
  if (armed && armed.btn === btn) {
    clearTimeout(armed.t); armed = null; fn(); return;
  }
  if (armed) disarm();
  const orig = btn.innerHTML;
  btn.classList.add('armed');
  btn.textContent = label;
  armed = { btn, orig, t: setTimeout(disarm, 3500) };
}
function disarm() {
  if (!armed) return;
  clearTimeout(armed.t);
  armed.btn.classList.remove('armed');
  armed.btn.innerHTML = armed.orig;
  armed = null;
}

/* ---------- Progress view ---------- */
function progressData() {
  const best = { sq: 0, bp: 0, dl: 0 };
  const weekTop = [0, 1, 2, 3].map(() => ({ sq: 0, bp: 0, dl: 0 }));
  for (const d of DAYS) for (const ex of state.program[d]) {
    if (!LIFT_DAY[ex.lift]) continue;
    ex.weeks.forEach((sets, w) => (sets || []).forEach((_, i) => {
      const L = state.logs[logKey(ex.id, w, i)];
      if (L && L.done && L.weight) {
        best[ex.lift] = Math.max(best[ex.lift], L.weight);
        weekTop[w][ex.lift] = Math.max(weekTop[w][ex.lift], L.weight);
      }
    }));
  }
  return { best, weekTop };
}

function chartSVG(weekTop) {
  const lifts = ['sq', 'bp', 'dl'];
  const maxV = Math.max(...weekTop.flatMap(o => lifts.map(l => o[l])));
  if (!maxV) return '<p class="hint">Check off some squat, bench or deadlift sets with a weight and they\'ll show up here.</p>';
  const W = 400, H = 240, L = 34, R = 4, T = 18, B = 28;
  const tickStep = [10, 20, 25, 50, 100].find(s => maxV / s <= 5) || 100;
  const top = Math.ceil(maxV / tickStep) * tickStep;
  const y = v => T + (H - T - B) * (1 - v / top);
  const gw = (W - L - R) / 4, bw = Math.min(24, (gw - 18) / 3);
  let g = '';
  for (let v = 0; v <= top; v += tickStep) {
    g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11">${v}</text>`;
  }
  weekTop.forEach((o, w) => {
    const gx = L + gw * w + (gw - bw * 3 - 8) / 2;
    lifts.forEach((l, j) => {
      const x = gx + j * (bw + 4), v = o[l];
      if (v) {
        g += `<rect x="${x}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="5" style="fill: var(--${LIFT_DAY[l]})"><title>${LIFTS[l]} ${WEEKS[w]}: ${fmtW(v)} kg</title></rect>`;
        g += `<text class="val" x="${x + bw / 2}" y="${y(v) - 5}" text-anchor="middle">${fmtW(v)}</text>`;
      }
    });
    g += `<text x="${L + gw * w + gw / 2}" y="${H - 8}" text-anchor="middle" font-size="13">${WEEKS[w]}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Top weight per lift per week">${g}</svg>`;
}

function renderProgress() {
  const { best, weekTop } = progressData();
  const total = best.sq + best.bp + best.dl;
  const tile = (l) => `<div class="tile" style="--c: var(--${LIFT_DAY[l]})"><small>Best ${LIFTS[l].toLowerCase()}</small>
    <b>${best[l] ? fmtW(best[l]) : '0'}<i>kg</i></b>
    <div class="sub">${state.maxes[l] ? `Max set to ${fmtW(state.maxes[l])} kg` : 'Heaviest set checked'}</div></div>`;

  const dayRows = DAYS.map(d => {
    let done = 0, tot = 0;
    const per = [0, 1, 2, 3].map(w => { const c = dayCount(d, w); done += c.done; tot += c.total; return c; });
    return `<div class="dayrow" style="--c: var(--${d})">
      <div class="dayrow-h"><b style="color: color-mix(in srgb, var(--${d}), var(--ink-mix) var(--ink-amt))">${DAY_META[d].name}</b>
        <span class="n">${done}/${tot} sets</span></div>
      <div class="bar"><i style="width:${tot ? (done / tot) * 100 : 0}%"></i></div>
      <div class="weekdots">${per.map((c, w) => `<span class="chip">${w < 3 ? 'W' + (w + 1) : 'Deload'} ${c.done}/${c.total}</span>`).join('')}</div></div>`;
  }).join('');

  document.body.dataset.day = ui.day;
  $('#progress').innerHTML = `
    <div class="tiles">${tile('sq')}${tile('bp')}${tile('dl')}
      <div class="tile total"><small>Total</small><b>${total ? fmtW(total) : '0'}<i>kg</i></b><div class="sub">Best squat + bench + deadlift</div></div>
    </div>
    <div class="cols">
      <div class="panel"><h2>Top weight per week</h2><p class="hint">Heaviest checked set for each lift.</p>
        <div class="legend">${['sq', 'bp', 'dl'].map(l => `<span><i style="background: var(--${LIFT_DAY[l]})"></i>${LIFTS[l]}</span>`).join('')}</div>
        ${chartSVG(weekTop)}</div>
      <div class="panel"><h2>Sets done per day</h2><p class="hint">Across all four weeks.</p>${dayRows}</div>
    </div>`;
}

/* ---------- Setup view ---------- */
function renderSetup() {
  document.body.dataset.day = ui.day;
  $('#setup').innerHTML = `
    <div class="cols">
      <div class="panel"><h2>Starting maxes</h2>
        <p class="hint">Optional. If you set one, lifts with a percentage show a suggested weight in the box (rounded to 2.5 kg). Nothing gets filled in for you.</p>
        <div class="maxes">${['sq', 'bp', 'dl'].map(l => `<div class="maxrow">
          <label for="max-${l}"><i style="background: var(--${LIFT_DAY[l]})"></i>${LIFTS[l]}</label>
          <div class="kgwrap"><input id="max-${l}" class="field" type="text" inputmode="decimal" autocomplete="off"
            data-max="${l}" value="${state.maxes[l] ? fmtW(state.maxes[l]) : ''}" placeholder="None"></div></div>`).join('')}</div>
      </div>
      <div class="panel"><h2>Backup</h2>
        <p class="hint">Copy your backup, paste it somewhere safe (notes, email to yourself), then paste it here on another device to restore.</p>
        <div class="stack">
          <button class="btn primary block" data-act="copy">Copy backup</button>
          <textarea id="restore-text" class="field" placeholder="Paste a backup here" aria-label="Backup text"></textarea>
          <button class="btn block" data-act="restore">Restore from backup</button>
        </div>
      </div>
      <div class="panel"><h2>Reset</h2>
        <p class="hint">Wipes every logged set, your maxes and any program edits.</p>
        <button class="btn danger block" data-act="reset">Reset everything</button>
      </div>
    </div>`;
}

function backupText() {
  return JSON.stringify({ app: 'baden-barbell', version: 1, exportedAt: new Date().toISOString(), ...state });
}
async function copyBackup() {
  const text = backupText();
  try {
    await navigator.clipboard.writeText(text);
    toast('Backup copied');
  } catch (e) {
    const ta = $('#restore-text');
    ta.value = text; ta.focus(); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) { /* ignore */ }
    toast(ok ? 'Backup copied' : 'Backup is in the box. Select all and copy it.');
  }
}
function restoreBackup() {
  const raw = $('#restore-text').value.trim();
  if (!raw) return toast('Paste a backup first');
  let data;
  try { data = JSON.parse(raw); } catch (e) { return toast('That doesn\'t look like a backup'); }
  if (!data || !data.program || !DAYS.every(d => Array.isArray(data.program[d]))) return toast('That doesn\'t look like a Baden Barbell backup');
  state = normalize(data);
  save();
  renderSetup();
  toast('Backup restored');
}

/* ---------- Tabs and toast ---------- */
function show(tab) {
  ui.tab = tab;
  disarm();
  for (const t of ['train', 'progress', 'setup']) $('#' + t).hidden = t !== tab;
  document.querySelectorAll('.tab').forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  ({ train: renderTrain, progress: renderProgress, setup: renderSetup })[tab]();
  window.scrollTo(0, 0);
}

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const act = b.dataset.act;
  if (armed && armed.btn !== b) disarm();

  if (act === 'tab') return show(b.dataset.tab);
  if (act === 'week') { state.week = +b.dataset.w; save(); return renderTrain(); }
  if (act === 'day') { ui.day = b.dataset.d; return renderTrain(); }
  if (act === 'edit') { ui.edit = !ui.edit; return renderTrain(); }
  if (act === 'weekonly') { ui.weekOnly = b.checked; return; }

  if (act === 'plus' || act === 'minus') {
    const row = b.closest('.set'), inp = $('.wt', row);
    let v = parseW(inp.value);
    if (v == null) v = startWeight(row);
    else v = act === 'plus' ? v + STEP : Math.max(0, v - STEP);
    inp.value = fmtW(v);
    return setLog(row.dataset.k, { weight: v });
  }
  if (act === 'check') {
    const row = b.closest('.set');
    const done = !row.classList.contains('done');
    row.classList.toggle('done', done);
    b.setAttribute('aria-pressed', done);
    if (done && navigator.vibrate) navigator.vibrate(12);
    return setLog(row.dataset.k, { done });
  }

  const card = b.closest('[data-ex]');
  const found = card && findEx(card.dataset.ex);
  if (found && ['up', 'down', 'addset', 'rmset'].includes(act)) return editAction(act, found.ex, found.day, found.i);
  if (found && act === 'delex') {
    return confirmTap(b, 'Tap again to delete', () => {
      state.program[found.day].splice(found.i, 1);
      save(); renderTrain(); toast(`${found.ex.name} deleted`);
    });
  }
  if (act === 'addex') {
    const ex = { id: uid(), name: 'New exercise', lift: 'none', weeks: allWeeks(3, 3) };
    state.program[ui.day].push(ex);
    save(); renderTrain();
    const inp = $(`[data-ex="${ex.id}"] [data-field="name"]`);
    if (inp) { inp.scrollIntoView({ block: 'center' }); inp.focus(); inp.select(); }
    return;
  }
  if (act === 'restoreday') {
    return confirmTap(b, 'Tap again to restore', () => {
      state.program[ui.day] = defaultProgram()[ui.day];
      save(); renderTrain(); toast(`${DAY_META[ui.day].name} restored`);
    });
  }

  if (act === 'copy') return copyBackup();
  if (act === 'restore') return restoreBackup();
  if (act === 'reset') {
    return confirmTap(b, 'Tap again to wipe everything', () => {
      state = blank(); save(); renderSetup(); toast('Everything reset');
    });
  }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.classList.contains('wt')) {
    const row = t.closest('.set');
    return setLog(row.dataset.k, { weight: parseW(t.value) });
  }
  if (t.dataset.max) {
    state.maxes[t.dataset.max] = parseW(t.value) || null;
    return save();
  }
});

document.addEventListener('change', e => {
  const t = e.target, f = t.dataset.field;
  if (t.classList.contains('wt')) {
    const v = parseW(t.value);
    t.value = v != null ? fmtW(v) : '';
    return;
  }
  if (!f) return;
  const found = findEx(t.closest('[data-ex]').dataset.ex);
  if (!found) return;
  const ex = found.ex;
  if (f === 'name') {
    const name = t.value.trim();
    if (name) ex.name = name; else t.value = ex.name;
  }
  if (f === 'lift') ex.lift = t.value;
  if (f === 'reps') {
    const reps = t.value.trim();
    const i = +t.dataset.i;
    if (!reps) { t.value = ex.weeks[state.week][i].reps; return; }
    for (const w of weeksToEdit()) if (ex.weeks[w] && ex.weeks[w][i]) ex.weeks[w][i].reps = reps;
  }
  save();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('input.wt, input.field')) e.target.blur();
});

/* ---------- Boot ---------- */
show('train');

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
