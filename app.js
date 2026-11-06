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
const THEMES = ['dark', 'light', 'system'];
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5, 0.25];
const BARS = { 20: '20 kg', 15: '15 kg', 25: '25 kg squat' };
const defaultPlates = () => ({ bar: 20, collar: 0, avail: PLATES.slice(), target: 100 });
const blank = () => ({ program: defaultProgram(), logs: {}, maxes: { sq: null, bp: null, dl: null }, week: 0, theme: 'dark', names: [], plates: defaultPlates() });

function normalize(s) {
  const b = blank();
  if (!s || typeof s !== 'object') return b;
  const program = {};
  for (const d of DAYS) program[d] = Array.isArray(s.program && s.program[d]) ? s.program[d] : b.program[d];
  return {
    program,
    logs: s.logs && typeof s.logs === 'object' ? s.logs : {},
    maxes: Object.assign(b.maxes, s.maxes || {}),
    week: [0, 1, 2, 3].includes(s.week) ? s.week : 0,
    theme: THEMES.includes(s.theme) ? s.theme : 'dark',
    names: Array.isArray(s.names) ? s.names.filter(n => typeof n === 'string') : [],
    plates: normPlates(s.plates)
  };
}
function normPlates(p) {
  const d = defaultPlates();
  if (!p || typeof p !== 'object') return d;
  return {
    bar: BARS[p.bar] ? +p.bar : d.bar,
    collar: p.collar === 2.5 ? 2.5 : 0,
    avail: Array.isArray(p.avail) ? PLATES.filter(x => p.avail.includes(x)) : d.avail,
    target: Number.isFinite(p.target) && p.target >= 0 ? p.target : d.target
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
const ui = { tab: 'train', day: currentTrainingDay(), edit: false, weekOnly: false, restHide: 0, prevPlates: [] };
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

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
  done: '<svg viewBox="0 0 24 24"><path d="M4.5 12.5l5 5 10-11"/></svg>',
  swap: '<svg viewBox="0 0 24 24"><path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
  plate: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  pencil: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4"/></svg>'
};

/* ---------- Train view ---------- */
function renderTrain(anim) {
  const d = ui.day, w = state.week, list = state.program[d];
  document.body.dataset.day = d;
  const cards = list.length
    ? list.map((ex, i) => ui.edit ? editCard(ex, i, list.length) : setCard(ex)).join('')
    : `<div class="card empty">No exercises on this day yet.${ui.edit ? '' : ' Tap Edit to add one.'}</div>`;

  $('#train').innerHTML = `
    <div class="pills" role="group" aria-label="Week">
      ${WEEKS.map((n, i) => `<button class="pill ${i === w ? 'on' : ''}" data-act="week" data-w="${i}" aria-pressed="${i === w}">${n}</button>`).join('')}
    </div>
    <div class="days" role="group" aria-label="Day">
      ${DAYS.map(k => `<button class="daybtn ${k === d ? 'on' : ''}" style="--c: var(--${k}); --g: var(--${k}-grad)" data-act="day" data-d="${k}" aria-pressed="${k === d}">
        <span class="dn">${DAY_META[k].short}</span><span class="dc" data-dc="${k}"></span></button>`).join('')}
    </div>
    <div class="dayhead">
      <div><h2 class="grad-text">${DAY_META[d].name}</h2><p>${WEEKS[w]} · ${DAY_META[d].note}</p></div>
      <button class="btn ${ui.edit ? 'primary' : 'soft'}" data-act="edit">${ui.edit ? ICON.done + 'Done' : ICON.edit + 'Edit'}</button>
    </div>
    ${ui.edit ? `<div class="editbar">
      <p>Change names, reps and percentages below. Reps and sets update all 4 weeks unless you tick the box. Percentages only change ${WEEKS[w]}.</p>
      <label><input type="checkbox" data-act="weekonly" ${ui.weekOnly ? 'checked' : ''}>
      Only change sets and reps in ${WEEKS[w]}</label></div>
      <datalist id="ex-names">${exerciseNames().map(n => `<option value="${esc(n)}">`).join('')}</datalist>` : ''}
    <div class="cards">${cards}</div>
    ${ui.edit ? `<div class="efoot">
      <button class="btn primary block" data-act="addex">${ICON.plus}Add exercise</button>
      <button class="btn danger block" data-act="restoreday">Restore ${DAY_META[d].name} to the original plan</button>
    </div>` : ''}`;
  if (anim) stagger($('#train .cards'));
  updateCounts(true);
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
      ${LIFT_DAY[ex.lift] ? `<div class="pl-line" data-pl>${plateLine(L.weight != null ? L.weight : sug, L.weight == null)}</div>` : ''}
    </div>`;
  }).join('');
  return `<article class="card ${ex.lift !== 'none' ? 'main' : ''}" data-ex="${ex.id}">
    <div class="card-h"><h3><button class="exname" data-act="swap" aria-label="Swap ${esc(ex.name)}">${esc(ex.name)}</button></h3>
      ${ex.lift !== 'none' ? `<span class="chip lift">${LIFTS[ex.lift]}</span>` : ''}
      <span class="count" data-cc="${ex.id}"></span>
      <button class="pen" data-act="swap" aria-label="Swap ${esc(ex.name)} for another exercise" title="Swap">${ICON.swap}</button>
      <button class="pen" data-act="editcard" aria-label="Edit ${esc(ex.name)}" title="Edit">${ICON.pencil}</button></div>
    ${rows || '<div class="empty">No sets this week.</div>'}
  </article>`;
}

function editCard(ex, i, n) {
  const w = state.week, sets = ex.weeks[w] || [];
  return `<article class="card edit" data-ex="${ex.id}">
    <div class="erow">
      <input class="field grow ename" data-field="name" list="ex-names" value="${esc(ex.name)}" aria-label="Exercise name" placeholder="Exercise name">
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
      ${sets.length ? `<div class="eset ehead"><span>Set</span><span>Reps</span><span>% of max</span></div>` : ''}
      ${sets.map((s, j) => `<div class="eset"><span>${j + 1}</span>
        <input class="field" data-field="reps" data-i="${j}" value="${esc(s.reps)}" aria-label="Set ${j + 1} reps">
        <div class="pctwrap"><input class="field" data-field="pct" data-i="${j}" type="text" inputmode="decimal" autocomplete="off"
          value="${s.p != null ? +(s.p * 100).toFixed(1) : ''}" placeholder="None" aria-label="Set ${j + 1} percent of max"></div></div>`).join('') || '<div class="empty">No sets this week.</div>'}
    </div>
    <div class="erow">
      <button class="btn grow" data-act="rmset" ${sets.length ? '' : 'disabled'}>${ICON.minus}Remove set</button>
      <button class="btn grow" data-act="addset">${ICON.plus}Add set</button>
    </div>
  </article>`;
}

const COMMON = ['Squat', 'Front Squat', 'Pause Squat', 'Bench Press', 'Pause Bench', 'Close Grip Bench', 'Deadlift', 'Deficit Deadlift',
  'Romanian Deadlift', 'Overhead Press', 'Barbell Rows', 'Pendlay Rows', 'Chest Supported Row', 'Lat Pulldown', 'Pull Ups', 'Chin Ups',
  'Incline DB Press', 'Dips', 'Leg Press', 'Leg Curls', 'Leg Extensions', 'Lunges', 'Hip Thrusts', 'Back Extensions', 'Lateral Raises',
  'Rear Delt Flyes', 'Face Pulls', 'Barbell Curls', 'EZ Bar Curls', 'Hammer Curls', 'Skull Crushers', 'Tricep Pushdowns',
  'Decline Tricep Press', 'Plank', 'Ab Wheel'];
function exerciseNames() {
  const set = new Set(COMMON);
  for (const n of state.names) set.add(n);
  for (const d of DAYS) for (const ex of state.program[d]) set.add(ex.name);
  return [...set].sort((a, b) => a.localeCompare(b));
}
function rememberName(name) {
  const known = COMMON.concat(state.names).some(n => n.toLowerCase() === name.toLowerCase());
  if (!known) state.names.push(name);
  else { const i = state.names.findIndex(n => n.toLowerCase() === name.toLowerCase()); if (i > -1) state.names.push(...state.names.splice(i, 1)); }
}

/* ---------- Swap / add sheet ---------- */
// mode 'swap' replaces an exercise (fresh log, same sets), mode 'add' adds a new one to the current day.
let sheet = null;
function openSheet(mode, exId) {
  const f = exId ? findEx(exId) : null;
  sheet = { mode, exId };
  const lift = f ? f.ex.lift : 'none';
  const dlg = $('#sheet');
  dlg.innerHTML = `<form class="sheet-in" data-form="sheet" autocomplete="off">
    <div class="sheet-h"><h2>${mode === 'swap' ? 'Swap exercise' : 'Add exercise'}</h2>
      <button type="button" class="pen" data-act="closesheet" aria-label="Close">${ICON.close}</button></div>
    ${mode === 'swap' ? `<p class="hint">Replacing <b>${esc(f.ex.name)}</b>. Sets, reps and percentages stay the same and the new one starts a fresh log.</p>`
      : `<p class="hint">Adds to ${DAY_META[ui.day].name} with 3 sets of 3. Change them in Edit.</p>`}
    <input class="field ename" id="sheet-name" placeholder="Type any exercise" enterkeyhint="done" aria-label="Exercise name">
    <div class="sugs" id="sheet-sugs"></div>
    <div class="erow"><label for="sheet-lift" class="grow sheet-lbl">Counts toward</label>
      <select id="sheet-lift" class="field">${Object.entries(LIFTS).map(([k, v]) => `<option value="${k}" ${lift === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
    <button class="btn primary block" type="submit">${mode === 'swap' ? ICON.swap + 'Swap' : ICON.plus + 'Add'}</button>
  </form>`;
  renderSugs('');
  if (!dlg.open) dlg.showModal();
  $('#sheet-name').focus();
}
function renderSugs(q) {
  const cur = sheet && sheet.exId ? findEx(sheet.exId).ex.name.toLowerCase() : '';
  const query = q.trim().toLowerCase();
  const mine = state.names.slice().reverse(); // your own names first, newest at the front
  const all = [...new Set(mine.concat(exerciseNames()))];
  const names = all.filter(n => n.toLowerCase() !== cur && (!query || n.toLowerCase().includes(query)));
  const exact = names.some(n => n.toLowerCase() === query);
  const typed = query && !exact ? `<button type="button" class="sug new" data-act="pick" data-name="${esc(q.trim())}">Use “${esc(q.trim())}”</button>` : '';
  $('#sheet-sugs').innerHTML = typed + names.slice(0, query ? 30 : 16).map(n => `<button type="button" class="sug" data-act="pick" data-name="${esc(n)}">${esc(n)}</button>`).join('');
}
function closeSheet() { const d = $('#sheet'); if (d.open) d.close(); sheet = null; }
function submitSheet(name) {
  name = (name || '').trim().replace(/\s+/g, ' ');
  if (!name) { $('#sheet-name').focus(); return toast('Type an exercise name'); }
  const lift = $('#sheet-lift').value;
  rememberName(name);
  if (sheet.mode === 'swap') {
    const f = findEx(sheet.exId);
    const old = f.ex.name;
    f.ex.id = uid(); f.ex.name = name; f.ex.lift = lift;
    toast(`Swapped ${old} for ${name}`);
  } else {
    state.program[ui.day].push({ id: uid(), name, lift, weeks: allWeeks(3, 3) });
    toast(`${name} added`);
  }
  save(); closeSheet(); renderTrain();
}

function setText(el, text, quiet) {
  if (el.textContent === text) return;
  el.textContent = text;
  if (quiet || reduceMotion.matches) return;
  el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
function updateCounts(quiet) {
  const w = state.week;
  for (const d of DAYS) {
    const el = $(`[data-dc="${d}"]`);
    if (!el) continue;
    const c = dayCount(d, w);
    setText(el, `${c.done}/${c.total}`, quiet);
    el.parentElement.classList.toggle('full', c.total > 0 && c.done === c.total);
  }
  for (const ex of state.program[ui.day]) {
    const el = $(`[data-cc="${ex.id}"]`);
    if (!el) continue;
    const c = exCount(ex, w);
    setText(el, `${c.done}/${c.total}`, quiet);
    el.classList.toggle('full', c.total > 0 && c.done === c.total);
  }
}

function setLog(k, patch) {
  const L = Object.assign({}, state.logs[k], patch);
  if (patch.done === true) L.t = Date.now();
  if (patch.done === false) delete L.t;
  if (L.weight == null && !L.done) delete state.logs[k];
  else state.logs[k] = L;
  save();
  updateCounts();
  if ('done' in patch) { lastT = computeLastT(); tick(); }
}
function refreshRowPlates(row) {
  const el = $('[data-pl]', row);
  if (!el) return;
  const inp = $('.wt', row), v = parseW(inp.value);
  el.innerHTML = plateLine(v != null ? v : (inp.dataset.sug ? +inp.dataset.sug : null), v == null);
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
  let g = `<defs>${lifts.map(l => `<linearGradient id="g-${l}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" style="stop-color: var(--${LIFT_DAY[l]}-b)"/><stop offset="1" style="stop-color: var(--${LIFT_DAY[l]}-a)"/></linearGradient>`).join('')}</defs>`;
  for (let v = 0; v <= top; v += tickStep) {
    g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11">${v}</text>`;
  }
  weekTop.forEach((o, w) => {
    const gx = L + gw * w + (gw - bw * 3 - 8) / 2;
    lifts.forEach((l, j) => {
      const x = gx + j * (bw + 4), v = o[l];
      if (v) {
        g += `<rect x="${x}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="6" fill="url(#g-${l})" class="bar-r" style="--i:${w * 3 + j}"><title>${LIFTS[l]} ${WEEKS[w]}: ${fmtW(v)} kg</title></rect>`;
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
  const tile = (l) => `<div class="tile" style="--g: var(--${LIFT_DAY[l]}-grad)"><small>Best ${LIFTS[l].toLowerCase()}</small>
    <b><span data-count="${best[l]}">0</span><i>kg</i></b>
    <div class="sub">${state.maxes[l] ? `Max set to ${fmtW(state.maxes[l])} kg` : 'Heaviest set checked'}</div></div>`;

  const dayRows = DAYS.map(d => {
    let done = 0, tot = 0;
    const per = [0, 1, 2, 3].map(w => { const c = dayCount(d, w); done += c.done; tot += c.total; return c; });
    return `<div class="dayrow" style="--c: var(--${d}); --g: var(--${d}-grad)">
      <div class="dayrow-h"><b class="grad-text">${DAY_META[d].name}</b>
        <span class="n">${done}/${tot} sets</span></div>
      <div class="bar"><i style="width:${tot ? (done / tot) * 100 : 0}%"></i></div>
      <div class="weekdots">${per.map((c, w) => `<span class="chip">${w < 3 ? 'W' + (w + 1) : 'Deload'} ${c.done}/${c.total}</span>`).join('')}</div></div>`;
  }).join('');

  document.body.dataset.day = ui.day;
  $('#progress').innerHTML = `
    <div class="tiles">${tile('sq')}${tile('bp')}${tile('dl')}
      <div class="tile total"><small>Total</small><b><span data-count="${total}">0</span><i>kg</i></b><div class="sub">Best squat + bench + deadlift</div></div>
    </div>
    <div class="cols">
      <div class="panel"><h2>Top weight per week</h2><p class="hint">Heaviest checked set for each lift.</p>
        <div class="legend">${['sq', 'bp', 'dl'].map(l => `<span><i style="background: var(--${LIFT_DAY[l]}-grad)"></i>${LIFTS[l]}</span>`).join('')}</div>
        ${chartSVG(weekTop)}</div>
      <div class="panel"><h2>Sets done per day</h2><p class="hint">Across all four weeks.</p>${dayRows}</div>
    </div>`;
  countUp($('#progress'));
  stagger($('#progress'), '.tile, .panel');
}

/* ---------- Plates ---------- */
// Competition style colours. h = height as % of a full plate, t = thickness units.
const PLATE_STYLE = {
  25: { c: '#e5232b', h: 100, t: 26 }, 20: { c: '#1f5fd6', h: 100, t: 22 }, 15: { c: '#f2c418', h: 92, t: 20 },
  10: { c: '#1f9d4b', h: 84, t: 17 }, 5: { c: '#f1f2f4', h: 62, t: 14 }, 2.5: { c: '#26262d', h: 50, t: 11 },
  1.25: { c: '#b8bcc6', h: 42, t: 9 }, 0.5: { c: '#c9ccd4', h: 34, t: 7 }, 0.25: { c: '#d9dbe1', h: 30, t: 6 }
};
function loadBar(total) {
  const P = state.plates;
  const base = P.bar + 2 * P.collar;
  if (total == null) return null;
  if (total < base) return { under: true, base, list: [] };
  let rem = (total - base) / 2;
  const list = [];
  for (const p of P.avail) while (rem >= p - 1e-9) { list.push(p); rem = Math.round((rem - p) * 1000) / 1000; }
  const perSide = list.reduce((a, b) => a + b, 0);
  return { list, rem, perSide, base, loaded: base + perSide * 2 };
}
function groupPlates(list) {
  const out = [];
  for (const p of list) { const last = out[out.length - 1]; if (last && last.p === p) last.n++; else out.push({ p, n: 1 }); }
  return out;
}
// Small inline plate picture plus text, used on set rows and the dashboard.
function plateLine(w, ghost) {
  if (w == null) return '';
  const r = loadBar(w);
  if (r.under) return `<span class="pl-txt">Under the bar (${fmtW(r.base)} kg)</span>`;
  if (!r.list.length) return `<span class="pl-txt">Empty bar</span>`;
  const pics = r.list.map(p => `<i class="mp" style="--pc:${PLATE_STYLE[p].c};--ph:${PLATE_STYLE[p].h}%;--pw:${Math.max(3, PLATE_STYLE[p].t / 4)}px"></i>`).join('');
  const txt = groupPlates(r.list).map(g => g.n > 1 ? `${fmtW(g.p)}×${g.n}` : fmtW(g.p)).join(' + ');
  return `<span class="mps ${ghost ? 'ghost' : ''}">${pics}</span><span class="pl-txt">${txt} <em>per side${state.plates.collar ? ' + collars' : ''}</em>${r.rem ? ` <strong>${fmtW(r.rem)} short</strong>` : ''}</span>`;
}
function barViz(r) {
  const list = r && !r.under ? r.list : [];
  const units = list.reduce((a, p) => a + PLATE_STYLE[p].t, 0) + (state.plates.collar ? 10 : 0);
  const k = Math.min(1.5, 118 / Math.max(units, 1));
  const prev = ui.prevPlates;
  const side = cls => list.map((p, i) => `<i class="plate ${prev[i] === p ? '' : 'in'}" style="--pc:${PLATE_STYLE[p].c};--h:${PLATE_STYLE[p].h}%;--w:${(PLATE_STYLE[p].t * k).toFixed(1)}px;--i:${i}"
      title="${fmtW(p)} kg">${PLATE_STYLE[p].t * k >= 15 ? `<b>${fmtW(p)}</b>` : ''}</i>`).join('')
    + (state.plates.collar ? `<i class="collar ${prev.collar ? '' : 'in'}" style="--i:${list.length}"></i>` : '');
  ui.prevPlates = list.slice(); ui.prevPlates.collar = !!state.plates.collar;
  return `<div class="barbell"><div class="side left"><i class="stop"></i>${side()}</div>
    <div class="shaft"><span>${BARS[state.plates.bar]} bar</span></div>
    <div class="side right"><i class="stop"></i>${side()}</div></div>`;
}
function plateSummary(r) {
  const P = state.plates;
  if (!r) return '<p class="hint">Enter a weight.</p>';
  if (r.under) return `<p class="pt-warn">That's less than the bar${P.collar ? ' and collars' : ''} (${fmtW(r.base)} kg).</p>`;
  const chips = groupPlates(r.list).map(g => `<span class="pchip"><i style="--pc:${PLATE_STYLE[g.p].c}"></i>${fmtW(g.p)} kg${g.n > 1 ? ` <b>× ${g.n}</b>` : ''}</span>`).join('');
  return `<div class="pchips">${chips || '<span class="pchip">Just the bar</span>'}</div>
    <p class="pt-math">Bar ${fmtW(P.bar)}${P.collar ? ` + collars ${fmtW(P.collar * 2)}` : ''} + plates ${fmtW(r.perSide * 2)} = <b>${fmtW(r.loaded)} kg</b> · ${fmtW(r.perSide)} kg per side</p>
    ${r.rem ? `<p class="pt-warn">Can't make it exactly with your plates. Closest is ${fmtW(r.loaded)} kg.</p>` : ''}`;
}
function renderPlates(anim) {
  const P = state.plates;
  ui.prevPlates = [];
  const r = loadBar(P.target);
  const quick = ['sq', 'bp', 'dl'].filter(l => state.maxes[l]).map(l => `<div class="qrow"><span class="qlbl" style="--g: var(--${LIFT_DAY[l]}-grad)">${LIFTS[l]}</span>
    <div class="qchips">${[50, 60, 70, 75, 80, 85, 90, 95, 100].map(pc => {
      const w = round25(state.maxes[l] * pc / 100);
      return `<button class="qchip" data-act="ptset" data-w="${w}">${pc}%<b>${fmtW(w)}</b></button>`;
    }).join('')}</div></div>`).join('');
  $('#plates').innerHTML = `
    <section class="panel plate-hero">
      <div class="pt-row">
        <button class="step big" data-act="ptstep" data-d="-1" aria-label="Minus 2.5 kg">${ICON.minus}</button>
        <label class="pt-w"><input id="pt-w" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="done" value="${fmtW(P.target)}" aria-label="Target weight in kg"><span>kg</span></label>
        <button class="step big" data-act="ptstep" data-d="1" aria-label="Plus 2.5 kg">${ICON.plus}</button>
      </div>
      <div class="viz" id="viz">${barViz(r)}</div>
      <div id="pt-out">${plateSummary(r)}</div>
    </section>
    <div class="cols">
      <div class="panel"><h2>Quick load</h2>
        ${quick ? `<p class="hint">Percent of your maxes, rounded to 2.5 kg.</p>${quick}` : '<p class="hint">Add your maxes in Setup and you\'ll get one tap buttons for 50% to 100% here.</p>'}</div>
      <div class="panel"><h2>Bar and plates</h2>
        <p class="hint sm">Bar</p>
        <div class="seg">${Object.entries(BARS).map(([w, n]) => `<button class="${P.bar === +w ? 'on' : ''}" data-act="ptbar" data-w="${w}" aria-pressed="${P.bar === +w}">${n}</button>`).join('')}</div>
        <p class="hint sm">Collars</p>
        <div class="seg two">${[[0, 'None'], [2.5, '2.5 kg each']].map(([c, n]) => `<button class="${P.collar === c ? 'on' : ''}" data-act="ptcollar" data-c="${c}" aria-pressed="${P.collar === c}">${n}</button>`).join('')}</div>
        <p class="hint sm">Plates you have (tap to turn off)</p>
        <div class="ptogs">${PLATES.map(p => `<button class="ptog ${P.avail.includes(p) ? 'on' : ''}" data-act="ptavail" data-p="${p}" aria-pressed="${P.avail.includes(p)}">
          <i style="--pc:${PLATE_STYLE[p].c}"></i>${fmtW(p)}</button>`).join('')}</div>
      </div>
    </div>`;
  if (anim) stagger($('#plates'), '.panel');
}
function updatePlates() {
  const r = loadBar(state.plates.target);
  $('#viz').innerHTML = barViz(r);
  $('#pt-out').innerHTML = plateSummary(r);
}
function setTarget(v, fromInput) {
  state.plates.target = Math.max(0, Math.round(v * 100) / 100);
  save();
  if (!fromInput) $('#pt-w').value = fmtW(state.plates.target);
  updatePlates();
}

/* ---------- Live dashboard ---------- */
let lastT = 0;
function computeLastT() {
  let m = 0;
  for (const L of Object.values(state.logs)) if (L && L.done && L.t > m) m = L.t;
  return m;
}
const repsNum = r => parseInt(r, 10) || 0;
function sessionInfo(d, w) {
  let first = Infinity, last = 0, vol = 0, top = null;
  for (const ex of state.program[d]) (ex.weeks[w] || []).forEach((s, i) => {
    const L = state.logs[logKey(ex.id, w, i)];
    if (!L || !L.done) return;
    if (L.t) { first = Math.min(first, L.t); last = Math.max(last, L.t); }
    if (L.weight) {
      vol += L.weight * repsNum(s.reps);
      if (!top || L.weight > top.w) top = { w: L.weight, reps: s.reps, name: ex.name };
    }
  });
  return { first: first === Infinity ? null : first, last: last || null, vol, top };
}
function nextSet(d, w) {
  for (const ex of state.program[d]) {
    const sets = ex.weeks[w] || [];
    for (let i = 0; i < sets.length; i++) {
      const k = logKey(ex.id, w, i), L = state.logs[k] || {};
      if (!L.done) return { ex, i, s: sets[i], k, n: sets.length, weight: L.weight != null ? L.weight : suggest(ex, sets[i]), typed: L.weight != null };
    }
  }
  return null;
}
function estMaxes() {
  const best = { sq: 0, bp: 0, dl: 0 };
  for (const d of DAYS) for (const ex of state.program[d]) {
    if (!LIFT_DAY[ex.lift]) continue;
    ex.weeks.forEach((sets, w) => (sets || []).forEach((s, i) => {
      const L = state.logs[logKey(ex.id, w, i)];
      if (!L || !L.done || !L.weight) return;
      const r = Math.max(1, repsNum(s.reps));
      const e = r === 1 ? L.weight : L.weight * (1 + r / 30); // Epley
      best[ex.lift] = Math.max(best[ex.lift], Math.round(e * 2) / 2);
    }));
  }
  return best;
}
const mmss = ms => { const t = Math.floor(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const hmm = ms => { const m = Math.floor(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`; };
function sessionText() {
  const info = sessionInfo(ui.day, state.week), c = dayCount(ui.day, state.week), now = Date.now();
  if (!info.first) return 'Not started yet';
  if (c.done < c.total && now - info.last < 30 * 60000) return `<i class="dot"></i>Live · ${hmm(now - info.first)}`;
  return `${c.done === c.total ? 'Finished' : 'Trained'} in ${hmm(info.last - info.first)}`;
}
function ring(pct, size, sw, cls = '') {
  const r = (size - sw) / 2, C = 2 * Math.PI * r;
  return `<svg class="ring ${cls}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">
    <circle class="ring-bg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}"/>
    <circle class="ring-fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${sw}" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - pct)}"/></svg>`;
}
function renderToday(anim) {
  const d = ui.day, w = state.week, c = dayCount(d, w), pct = c.total ? c.done / c.total : 0;
  const info = sessionInfo(d, w), nx = nextSet(d, w), em = estMaxes();
  const isToday = DAY_META[d].dow === new Date().getDay();
  document.body.dataset.day = d;
  $('#today').innerHTML = `
    <section class="hero" style="--g: var(--${d}-grad)">
      <div class="ring-wrap">${ring(pct, 136, 12, 'big')}
        <div class="ring-c"><b data-count="${c.done}">0</b><span>of ${c.total} sets</span></div></div>
      <div class="hero-t">
        <small>${isToday ? 'Today' : 'Up next'} · ${WEEKS[w]}</small>
        <h2>${DAY_META[d].name}</h2>
        <div class="live" data-live="session">${sessionText()}</div>
        <button class="btn glass" data-act="tab" data-tab="train">${ICON.bolt}${c.done ? 'Back to workout' : 'Start workout'}</button>
      </div>
    </section>
    <div class="wstrip">${DAYS.map(k => { const dc = dayCount(k, w); return `<button class="wday ${k === d ? 'on' : ''}" data-act="dashday" data-d="${k}" style="--c: var(--${k}); --g: var(--${k}-grad)" aria-pressed="${k === d}">
      ${ring(dc.total ? dc.done / dc.total : 0, 46, 5, 'mini')}<span>${DAY_META[k].short}</span><small>${dc.done}/${dc.total}</small></button>`; }).join('')}</div>
    <div class="stats">
      <div class="stat"><small>Volume</small><b><span data-count="${Math.round(info.vol)}" data-fmt="int">0</span><i>kg</i></b></div>
      <div class="stat"><small>Top set</small><b>${info.top ? `${fmtW(info.top.w)}<i>× ${esc(info.top.reps)}</i>` : '<i>None yet</i>'}</b></div>
      <div class="stat rest"><small>Rest</small><b data-live="rest">0:00</b></div>
    </div>
    <section class="panel next">
      ${nx ? `<small class="eyebrow">Next set</small>
        <div class="next-h"><h2>${esc(nx.ex.name)}</h2><span class="chip">Set ${nx.i + 1} of ${nx.n}</span></div>
        <div class="next-b"><div class="next-w"><b>${nx.weight != null ? fmtW(nx.weight) : '?'}</b><span>${nx.weight != null ? 'kg' : ''} ${nx.typed ? '' : nx.weight != null ? 'suggested' : 'pick a weight'}</span></div>
          <div class="next-r"><b>${esc(nx.s.reps)}</b> reps${nx.s.p != null ? ` · <em>${fmtPct(nx.s.p)}</em>` : ''}</div></div>
        ${LIFT_DAY[nx.ex.lift] && nx.weight != null ? `<div class="pl-line big">${plateLine(nx.weight)}</div>` : ''}
        <div class="erow"><button class="btn primary grow" data-act="goto" data-k="${nx.k}">Go to set</button>
          ${LIFT_DAY[nx.ex.lift] ? `<button class="btn grow" data-act="loadplates" data-w="${nx.weight != null ? nx.weight : ''}">${ICON.plate}Load plates</button>` : ''}</div>`
      : `<small class="eyebrow">All done</small><h2>${c.total ? `${DAY_META[d].name} is finished. Nice work.` : 'Nothing planned.'}</h2>`}
    </section>
    <section class="panel"><h2>Estimated maxes</h2><p class="hint">From your best ticked set of each lift (Epley).</p>
      <div class="emax">${['sq', 'bp', 'dl'].map(l => `<div class="emx" style="--g: var(--${LIFT_DAY[l]}-grad)"><small>${LIFTS[l]}</small>
        <b>${em[l] ? `<span data-count="${em[l]}">0</span><i>kg</i>` : '<i>No sets yet</i>'}</b></div>`).join('')}</div>
    </section>`;
  const root = $('#today');
  requestAnimationFrame(() => {
    root.querySelectorAll('.ring-fg').forEach(c => c.style.strokeDashoffset = c.dataset.off);
    countUp(root);
  });
  if (anim) stagger(root, '.hero, .wstrip, .stat, .panel');
  tick();
}

/* ---------- Motion helpers ---------- */
function stagger(root, sel = '.card') {
  if (!root || reduceMotion.matches) return;
  root.querySelectorAll(sel).forEach((el, i) => {
    el.style.setProperty('--i', Math.min(i, 10));
    el.classList.remove('rise'); void el.offsetWidth; el.classList.add('rise');
  });
}
function countUp(root) {
  root.querySelectorAll('[data-count]').forEach(el => {
    const to = +el.dataset.count, int = el.dataset.fmt === 'int';
    const out = v => int ? Math.round(v).toLocaleString() : fmtW(v);
    if (reduceMotion.matches || !to) { el.textContent = out(to); return; }
    const t0 = performance.now(), dur = 750;
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = k < 1 ? (int ? Math.round(to * e).toLocaleString() : String(Math.round(to * e))) : out(to);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
function celebrate() {
  if (reduceMotion.matches) return;
  const box = document.createElement('div');
  box.className = 'confetti';
  const cols = DAYS.flatMap(d => [`var(--${d}-a)`, `var(--${d}-b)`]);
  for (let i = 0; i < 44; i++) {
    const p = document.createElement('i');
    p.style.cssText = `--x:${(Math.random() * 2 - 1) * 46}vw;--y:${-(18 + Math.random() * 26)}vh;--r:${Math.random() * 720 - 360}deg;--d:${Math.random() * 120}ms;background:${cols[i % cols.length]}`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1900);
}
function tick() {
  const now = Date.now(), since = now - lastT;
  const pill = $('#rest');
  const showPill = lastT && since < 15 * 60000 && ui.restHide !== lastT && ui.tab === 'train';
  pill.hidden = !showPill;
  document.body.classList.toggle('resting', !!showPill);
  if (showPill) { $('b', pill).textContent = mmss(since); pill.classList.toggle('long', since > 180000); }
  const r = $('[data-live="rest"]');
  if (r && ui.tab === 'today') { r.textContent = lastT && since < 60 * 60000 ? mmss(since) : '0:00'; r.parentElement.classList.toggle('long', lastT && since > 180000 && since < 60 * 60000); }
  const s = $('[data-live="session"]');
  if (s && ui.tab === 'today') s.innerHTML = sessionText();
}

/* ---------- Setup view ---------- */
function renderSetup() {
  document.body.dataset.day = ui.day;
  $('#setup').innerHTML = `
    <div class="cols">
      <div class="panel"><h2>Starting maxes</h2>
        <p class="hint">Optional. If you set one, lifts with a percentage show a suggested weight in the box (rounded to 2.5 kg). Nothing gets filled in for you.</p>
        <div class="maxes">${['sq', 'bp', 'dl'].map(l => `<div class="maxrow">
          <label for="max-${l}"><i style="background: var(--${LIFT_DAY[l]}-grad)"></i>${LIFTS[l]}</label>
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
      <div class="panel"><h2>Theme</h2>
        <p class="hint">Dark is the default. System follows your phone.</p>
        <div class="seg" role="group" aria-label="Theme">${THEMES.map(t => `<button class="${state.theme === t ? 'on' : ''}" data-act="theme" data-theme="${t}" aria-pressed="${state.theme === t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
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
  lastT = computeLastT();
  save();
  applyTheme();
  renderSetup();
  toast('Backup restored');
}

/* ---------- Tabs and toast ---------- */
const TABS = ['today', 'train', 'plates', 'progress', 'setup'];
function show(tab) {
  ui.tab = tab;
  disarm();
  for (const t of TABS) $('#' + t).hidden = t !== tab;
  document.querySelectorAll('.tab').forEach(b => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  $('.tabs').style.setProperty('--ti', TABS.indexOf(tab));
  window.scrollTo(0, 0);
  const view = $('#' + tab);
  if (!reduceMotion.matches) { view.classList.remove('enter'); void view.offsetWidth; view.classList.add('enter'); }
  ({ today: renderToday, train: renderTrain, plates: renderPlates, progress: renderProgress, setup: renderSetup })[tab](true);
  tick();
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
  if (act === 'swap') return openSheet('swap', b.closest('[data-ex]').dataset.ex);
  if (act === 'pick') return submitSheet(b.dataset.name);
  if (act === 'closesheet') return closeSheet();
  if (act === 'week') { state.week = +b.dataset.w; save(); return renderTrain(true); }
  if (act === 'day') { ui.day = b.dataset.d; return renderTrain(true); }
  if (act === 'edit') { ui.edit = !ui.edit; return renderTrain(true); }
  if (act === 'dashday') { ui.day = b.dataset.d; return renderToday(true); }
  if (act === 'goto') {
    show('train');
    const row = $(`.set[data-k="${b.dataset.k}"]`);
    if (row) {
      row.scrollIntoView({ block: 'center', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash');
    }
    return;
  }
  if (act === 'loadplates') { if (b.dataset.w) { state.plates.target = +b.dataset.w; save(); } return show('plates'); }
  if (act === 'ptstep') {
    const cur = parseW($('#pt-w').value);
    return setTarget((cur == null ? state.plates.target : cur) + STEP * +b.dataset.d);
  }
  if (act === 'ptset') return setTarget(+b.dataset.w);
  if (act === 'ptbar') { state.plates.bar = +b.dataset.w; save(); return renderPlates(); }
  if (act === 'ptcollar') { state.plates.collar = +b.dataset.c; save(); return renderPlates(); }
  if (act === 'ptavail') {
    const p = +b.dataset.p, A = state.plates.avail;
    state.plates.avail = A.includes(p) ? A.filter(x => x !== p) : PLATES.filter(x => A.includes(x) || x === p);
    save(); return renderPlates();
  }
  if (act === 'resthide') { ui.restHide = lastT; return tick(); }
  if (act === 'editcard') {
    const id = b.closest('[data-ex]').dataset.ex;
    ui.edit = true; renderTrain();
    const c = $(`[data-ex="${id}"]`);
    if (c) c.scrollIntoView({ block: 'start', behavior: 'smooth' });
    return;
  }
  if (act === 'theme') { state.theme = b.dataset.theme; save(); applyTheme(); return renderSetup(); }
  if (act === 'weekonly') { ui.weekOnly = b.checked; return; }

  if (act === 'plus' || act === 'minus') {
    const row = b.closest('.set'), inp = $('.wt', row);
    let v = parseW(inp.value);
    if (v == null) v = startWeight(row);
    else v = act === 'plus' ? v + STEP : Math.max(0, v - STEP);
    inp.value = fmtW(v);
    setLog(row.dataset.k, { weight: v });
    return refreshRowPlates(row);
  }
  if (act === 'check') {
    const row = b.closest('.set');
    const done = !row.classList.contains('done');
    row.classList.toggle('done', done);
    b.setAttribute('aria-pressed', done);
    if (done && navigator.vibrate) navigator.vibrate(12);
    setLog(row.dataset.k, { done });
    if (done) {
      if (ui.restHide) ui.restHide = 0;
      const c = dayCount(ui.day, state.week);
      if (c.total && c.done === c.total) { celebrate(); toast(`${DAY_META[ui.day].name} done. Nice work!`); }
    }
    return;
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
  if (act === 'addex') return openSheet('add');
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
      state = blank(); lastT = 0; save(); applyTheme(); renderSetup(); toast('Everything reset');
    });
  }
});

document.addEventListener('submit', e => {
  if (e.target.dataset.form === 'sheet') { e.preventDefault(); submitSheet($('#sheet-name').value); }
});
document.addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); }); // tap outside the panel
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'sheet-name') return renderSugs(t.value);
  if (t.classList.contains('wt')) {
    const row = t.closest('.set');
    setLog(row.dataset.k, { weight: parseW(t.value) });
    return refreshRowPlates(row);
  }
  if (t.id === 'pt-w') { const v = parseW(t.value); if (v != null) setTarget(v, true); return; }
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
  if (t.id === 'pt-w') { t.value = fmtW(state.plates.target); return; }
  if (!f) return;
  const found = findEx(t.closest('[data-ex]').dataset.ex);
  if (!found) return;
  const ex = found.ex;
  if (f === 'name') {
    const name = t.value.trim();
    if (name) { ex.name = name; rememberName(name); } else t.value = ex.name;
  }
  if (f === 'lift') ex.lift = t.value;
  if (f === 'reps') {
    const reps = t.value.trim();
    const i = +t.dataset.i;
    if (!reps) { t.value = ex.weeks[state.week][i].reps; return; }
    for (const w of weeksToEdit()) if (ex.weeks[w] && ex.weeks[w][i]) ex.weeks[w][i].reps = reps;
  }
  if (f === 'pct') {
    const i = +t.dataset.i, set = ex.weeks[state.week][i];
    const raw = t.value.trim().replace('%', '');
    if (!raw) set.p = null;
    else {
      const v = parseW(raw);
      if (v == null || v > 150) { t.value = set.p != null ? +(set.p * 100).toFixed(1) : ''; return toast('Enter a percentage like 82.5'); }
      set.p = Math.round(v * 10) / 1000;
      t.value = +(set.p * 100).toFixed(1);
    }
  }
  save();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.matches('input.wt, input.field, #pt-w') && e.target.id !== 'sheet-name') e.target.blur();
});

/* ---------- Theme ---------- */
const darkMQ = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const root = document.documentElement;
  root.dataset.theme = state.theme;
  const dark = state.theme === 'dark' || (state.theme === 'system' && darkMQ.matches);
  $('meta[name="theme-color"]').content = dark ? '#07080f' : '#f3f4fb';
}
darkMQ.addEventListener && darkMQ.addEventListener('change', applyTheme);

/* ---------- Boot ---------- */
applyTheme();
lastT = computeLastT();
show('train');
setInterval(tick, 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
