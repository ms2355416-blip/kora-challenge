(() => {
'use strict';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDEDLvC4wKI9_HX7WUG6th4zuUOwxxB54k",
  authDomain: "kora-e220c.firebaseapp.com",
  databaseURL: "https://kora-e220c-default-rtdb.firebaseio.com",
  projectId: "kora-e220c",
  storageBucket: "kora-e220c.firebasestorage.app",
  messagingSenderId: "535044321885",
  appId: "1:535044321885:web:b89615d5eb01a93e1613b4"
};

const BUDGET = 100;
const TURN_MS = 30000;   // وقت كل دور للرد
const GRACE_MS = 1500;   // مهلة قبل ما الخصم ينهي دورك لو إنت مش متصل
let clockOffset = 0;
const now = () => Date.now() + clockOffset;
const CAP = { GK: 1, DEF: 4, MID: 3, ATT: 3 };
const POS_AR = { GK: 'حارس', DEF: 'مدافع', MID: 'وسط', ATT: 'مهاجم' };
const SLOTS = { 
  GK: [[50, 88]], DEF: [[12, 70], [37, 73], [63, 73], [88, 70]],
  MID: [[22, 47], [50, 43], [78, 47]], ATT: [[18, 19], [50, 14], [82, 19]]
};

const POOL = `Courtois|GK|89,Alisson|GK|89,Donnarumma|GK|88,Ter Stegen|GK|88,Ederson|GK|87,Oblak|GK|87,Maignan|GK|87,Neuer|GK|86,Bounou|GK|85,
Van Dijk|DEF|89,Rúben Dias|DEF|88,Marquinhos|DEF|87,Rüdiger|DEF|86,Saliba|DEF|86,Bastoni|DEF|86,Hakimi|DEF|86,Alexander-Arnold|DEF|86,Theo Hernández|DEF|85,Cancelo|DEF|85,Militão|DEF|85,Stones|DEF|85,Carvajal|DEF|85,Gvardiol|DEF|85,Davies|DEF|84,Walker|DEF|84,Araújo|DEF|84,Robertson|DEF|84,Kim Min-jae|DEF|84,Grimaldo|DEF|83,Konaté|DEF|83,
De Bruyne|MID|91,Rodri|MID|91,Bellingham|MID|90,Valverde|MID|88,Bernardo Silva|MID|88,Ødegaard|MID|88,Wirtz|MID|88,Foden|MID|88,Pedri|MID|87,Kimmich|MID|87,Musiala|MID|87,Rice|MID|87,Bruno Fernandes|MID|87,Modrić|MID|86,Barella|MID|86,Mac Allister|MID|85,Vitinha|MID|85,Camavinga|MID|84,Tchouaméni|MID|84,Gavi|MID|83,
Mbappé|ATT|91,Haaland|ATT|91,Messi|ATT|91,Vinícius Jr|ATT|90,Kane|ATT|90,Salah|ATT|89,Ronaldo|ATT|88,Lewandowski|ATT|88,Yamal|ATT|88,Raphinha|ATT|88,Saka|ATT|87,Lautaro|ATT|87,Dembélé|ATT|87,Osimhen|ATT|86,Son|ATT|86,Neymar|ATT|86,Griezmann|ATT|85,Marmoush|ATT|83`
  .split(',').map(s => s.trim().split('|')).map(([n, p, r], i) => ({ id: i, n, p, r: +r }));

const $ = id => document.getElementById(id);
const toast = m => { const t = $('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); };
const show = s => ['lobby', 'waiting', 'game'].forEach(x => $(x).classList.toggle('hidden', x !== s));

const configured = true;
$('cfgWarn').classList.toggle('hidden', configured);
let db, initErr = null;
try { if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG); db = firebase.database(); }
catch (e) { initErr = e; console.error(e); }
if (db) db.ref('.info/serverTimeOffset').on('value', s => { clockOffset = s.val() || 0; });

const net = p => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))]);
const fail = e => { console.error(e); toast(e.message === 'timeout'
  ? 'مفيش رد من Firebase: تأكد إن Realtime Database متفعلة وإن databaseURL صح'
  : 'خطأ: ' + (e.code || e.message)); };

let code = null, role = null, ref = null, prev = null, conn = null, hadOpp = false;
const other = k => k === 'A' ? 'B' : 'A';
const picksOf = (r, k) => (r[k] && r[k].p) || [];
const countPos = (ids, pos) => ids.filter(i => POOL[i].p === pos).length;
const hasRoom = (ids, pos) => countPos(ids, pos) < CAP[pos];

function draw(r, owner, skip) {
  const taken = new Set([...picksOf(r, 'A'), ...picksOf(r, 'B'), skip]);
  const mine = picksOf(r, owner);
  const c = POOL.filter(x => !taken.has(x.id) && hasRoom(mine, x.p));
  return c[Math.floor(Math.random() * c.length)].id;
}
// لاعب بنفس المركز للطرف التاني (من غير مزايدة)
function drawSamePos(r, pos, skip) {
  const taken = new Set([...picksOf(r, 'A'), ...picksOf(r, 'B'), skip]);
  const c = POOL.filter(x => x.p === pos && !taken.has(x.id));
  return c[Math.floor(Math.random() * c.length)].id;
}
function nextOwner(r) {
  const a = picksOf(r, 'A').length, b = picksOf(r, 'B').length;
  if (a + b >= 22) return null;
  return a < b ? 'A' : b < a ? 'B' : (r.n % 2 ? 'B' : 'A');
}
const newOffer = (r, o) => ({ pid: draw(r, o, -1), owner: o, bid: 0, turn: other(o), deadline: now() + TURN_MS });

function decide(r, who, action, amount, timedOut) {
  const of = r.offer, { pid, owner } = of, P = POOL[pid];
  if (of.turn !== who) return false;
  r.A.p = picksOf(r, 'A'); r.B.p = picksOf(r, 'B');
  if (action === 'raise') {
    if (!Number.isInteger(amount) || amount <= of.bid || amount > r[who].b || !hasRoom(r[who].p, P.p)) return false;
    of.bid = amount; of.bidder = who; of.turn = other(who); of.deadline = now() + TURN_MS;
    return true;
  }
  const winner = of.bidder || owner, bid = of.bidder ? of.bid : 0;
  r[winner].p.push(pid); r[winner].b -= bid;
  // الطرف التاني دايمًا ياخد لاعب بنفس المركز، فالتشكيلتين بيتبنوا بنفس المراكز
  const loser = other(winner);
  const repl = drawSamePos(r, P.p, pid);
  r[loser].p.push(repl);
  r.last = { pid, owner, winner, loser, bid, repl, timedOut: !!timedOut, by: who };
  r.n++;
  const o = nextOwner(r);
  if (o) r.offer = newOffer(r, o); else { r.offer = null; r.status = 'done'; }
  return true;
}

const genCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random() * 32 | 0]).join('');

function newRoom() {
  return { status: 'waiting', n: 0, A: { b: BUDGET, p: [] }, B: { b: BUDGET, p: [] } };
}
async function createRoom() {
  if (!db) return toast('Firebase مش متحمّل — اتأكد من النت وافتح الصفحة من استضافة مش file://');
  try { await createRoom2(); } catch (e) { fail(e); }
}
async function createRoom2() {
  for (let i = 0; i < 5; i++) {
    const c = genCode(), rf = db.ref('rooms/' + c);
    const res = await net(rf.transaction(cur => cur ? undefined : newRoom()));
    if (res.committed) { enter(c, 'A'); return; }
  }
  toast('حصلت مشكلة، جرب تاني');
}
async function joinRoom() {
  if (!db) return toast('Firebase مش متحمّل — اتأكد من النت وافتح الصفحة من استضافة مش file://');
  try { await joinRoom2(); } catch (e) { fail(e); }
}
async function joinRoom2() {
  const c = $('codeInput').value.trim().toUpperCase();
  if (c.length !== 5) return toast('اكتب كود الغرفة (5 حروف)');
  const saved = sessionStorage.getItem('kc-' + c);
  if (saved) return enter(c, saved);
  const rf = db.ref('rooms/' + c);
  const snap = await net(rf.get());
  if (!snap.exists()) return toast('الغرفة مش موجودة');
  const v = snap.val(), here = v.presence || {};
  if (!here.A) return enter(c, 'A');
  if (!here.B) return enter(c, 'B');
  toast('الغرفة ممتلئة (اتنين لاعبين موجودين)');
}
async function startGame() {
  $('startBtn').disabled = true;
  try {
    await net(ref.transaction(r => {
      if (!r) return r;
      const p = r.presence || {};
      if (r.status !== 'waiting' || !p.A || !p.B) return;
      r.status = 'playing'; r.n = 0; r.A.p = []; r.B.p = [];
      r.offer = newOffer(r, 'A');
      return r;
    }));
  } catch (e) { fail(e); }
}
function enter(c, r) {
  code = c; role = r; sessionStorage.setItem('kc-' + c, r); sessionStorage.setItem('kc-last', c);
  $('roomChip').textContent = c; $('roomChip').classList.remove('hidden');$('bigCode').textContent = c;
  ref = db.ref('rooms/' + c);
  ref.on('value', s => render(s.val()));
  const me = ref.child('presence/' + r);
  conn = db.ref('.info/connected'); conn.on('value', s => { if (s.val()) { me.set(true); me.onDisconnect().remove(); } });
  history.pushState({ kc: 1 }, '');
}

function pitchHTML(ids, fresh) {
  let h = '<div class="circle"></div><div class="box t"></div><div class="box b"></div>';
  const used = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  ids.forEach(id => {
    const P = POOL[id], pt = SLOTS[P.p][used[P.p]++];
    h += `<div class="slot full ${fresh.has(id) ? 'new' : ''}" style="left:${pt[0]}%;top:${pt[1]}%"><i>${P.r}</i><span>${P.n}</span></div>`;
  });
  for (const pos in SLOTS) for (let k = used[pos]; k < SLOTS[pos].length; k++) {
    const pt = SLOTS[pos][k];
    h += `<div class="slot empty" style="left:${pt[0]}%;top:${pt[1]}%"><i>${pos}</i></div>`;
  }
  return h;
}
const total = ids => ids.reduce((s, i) => s + POOL[i].r, 0);
const money = n => '€' + n + 'M';



// ---------- اللعب ضد الكمبيوتر (من غير Firebase) ----------
const BOT_LEVELS = {
  easy:   { label: 'سهل',   mult: 0.7,  noise: 0.35, step: 3, think: [1000, 2000] },
  medium: { label: 'متوسط', mult: 1,    noise: 0.18, step: 2, think: [900, 1800] },
  hard:   { label: 'صعب',   mult: 1.15, noise: 0.05, step: 1, think: [800, 1500] }
};
let solo = null, local = null, botTimer = null;
const stopBot = () => { clearTimeout(botTimer); botTimer = null; };

// قرار الكمبيوتر: يزايد لحد سعر هو شايف إن اللاعب يستاهله، وإلا يسيبه
function botDecide(r, level) {
  const L = BOT_LEVELS[level] || BOT_LEVELS.medium, o = r.offer, P = POOL[o.pid], me = r.B, bid = o.bid || 0;
  if (!hasRoom(picksOf(r, 'B'), P.p)) return { action: 'leave' };
  const slotsLeft = Math.max(1, 11 - picksOf(r, 'B').length);
  const perSlot = me.b / slotsLeft;
  const need = CAP[P.p] - countPos(picksOf(r, 'B'), P.p);
  let worth = perSlot * clamp(0.4 + (P.r - 80) * 0.16, 0.2, 2.4) * L.mult;
  if (level === 'hard') worth *= 1 + 0.05 * need;
  worth *= 1 + (Math.random() * 2 - 1) * L.noise;
  const maxBid = Math.min(me.b, Math.floor(worth));
  if (maxBid <= bid) return { action: 'leave' };
  const amount = bid
    ? Math.min(maxBid, bid + 1 + Math.floor(Math.random() * L.step))
    : Math.max(1, Math.min(maxBid, Math.floor(maxBid * (0.2 + Math.random() * 0.25))));
  return { action: 'raise', amount };
}

const pushLocal = () => render(JSON.parse(JSON.stringify(local)));

function scheduleBot() {
  stopBot();
  if (!solo || !local || local.status !== 'playing' || !local.offer || local.offer.turn !== 'B') return;
  const L = BOT_LEVELS[solo], wait = L.think[0] + Math.random() * (L.think[1] - L.think[0]);
  botTimer = setTimeout(() => {
    if (!solo || !local || !local.offer || local.offer.turn !== 'B') return;
    const d = botDecide(local, solo);
    if (!decide(local, 'B', d.action, d.amount)) decide(local, 'B', 'leave', 0);
    pushLocal(); scheduleBot();
  }, wait);
}

function startSolo(level) {
  if (!BOT_LEVELS[level]) level = 'medium';
  stopBot(); stopSim();
  solo = level; role = 'A'; code = 'SOLO' + Date.now().toString(36);
  local = { status: 'playing', n: 0, A: { b: BUDGET, p: [] }, B: { b: BUDGET, p: [] }, presence: { A: true, B: true } };
  local.offer = newOffer(local, 'A');
  prev = null; hadOpp = true;
  $('result').dataset.sim = ''; $('result').classList.add('hidden');
  $('roomChip').textContent = '🤖 ' + BOT_LEVELS[level].label; $('roomChip').classList.remove('hidden');
  history.pushState({ kc: 1 }, '');
  pushLocal(); scheduleBot();
}

// ---------- محاكاة المباراة (نفس النتيجة للاعبين من غير أي تدخل) ----------
let simTimer = null;
const stopSim = () => { clearTimeout(simTimer); simTimer = null; };

function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return h >>> 0;
}
function makeRng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const avgPos = (ids, pos, fallback) => {
  const a = ids.filter(i => POOL[i].p === pos).map(i => POOL[i].r);
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : fallback;
};
const strengthOf = ids => ({ att: avgPos(ids, 'ATT', 60), mid: avgPos(ids, 'MID', 60), def: avgPos(ids, 'DEF', 60), gk: avgPos(ids, 'GK', 50) });
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

function pickWeighted(rand, ids, weights, exclude) {
  const list = ids.filter(i => i !== exclude)
    .map(i => ({ i, w: (weights[POOL[i].p] || 0) * Math.pow(POOL[i].r / 80, 4) })).filter(x => x.w > 0);
  if (!list.length) return null;
  let t = list.reduce((s, x) => s + x.w, 0) * rand();
  for (const x of list) { t -= x.w; if (t <= 0) return x.i; }
  return list[list.length - 1].i;
}

function simulateMatch(idsA, idsB, seedStr) {
  const rand = makeRng(hashSeed(seedStr));
  const ids = { A: idsA, B: idsB }, S = { A: strengthOf(idsA), B: strengthOf(idsB) };
  const goals = { A: 0, B: 0 }, shots = { A: 0, B: 0 }, events = [];
  const pA = 1 / (1 + Math.exp(-(S.A.mid - S.B.mid) / 5));   // نسبة الاستحواذ

  for (let min = 1; min <= 90; min++) {
    if (rand() < 0.25) {
      const atk = rand() < pA ? 'A' : 'B', dfn = atk === 'A' ? 'B' : 'A', a = S[atk], d = S[dfn];
      const shooter = pickWeighted(rand, ids[atk], { ATT: 6, MID: 2.5, DEF: 0.4 });
      if (shooter != null) {
        shots[atk]++;
        const gkId = pickWeighted(rand, ids[dfn], { GK: 1 });
        const pGoal = clamp(0.07 + (a.att - d.def) * 0.012 + (POOL[shooter].r - d.gk) * 0.01, 0.03, 0.3);
        const x = rand();
        if (x < pGoal) {
          goals[atk]++;
          const assist = rand() < 0.7 ? pickWeighted(rand, ids[atk], { MID: 3, ATT: 2, DEF: 1 }, shooter) : null;
          events.push({ min, side: atk, type: 'goal', shooter, assist, score: { A: goals.A, B: goals.B } });
        } else if (x < pGoal + 0.3) events.push({ min, side: atk, type: 'save', shooter, keeper: gkId });
        else if (x < pGoal + 0.5) events.push({ min, side: atk, type: 'miss', shooter });
      }
    }
    if (min === 45) events.push({ min: 45, type: 'ht' });
  }
  events.push({ min: 90, type: 'ft' });

  let winner = goals.A > goals.B ? 'A' : goals.B > goals.A ? 'B' : null;
  let pens = null;
  if (!winner) {
    const takers = side => ids[side].slice().sort((p, q) => POOL[q].r - POOL[p].r);
    const list = { A: takers('A'), B: takers('B') }, pk = { A: 0, B: 0 }, taken = { A: 0, B: 0 }, pe = [];
    const kick = side => {
      const opp = side === 'A' ? 'B' : 'A', arr = list[side];
      if (!arr.length) { taken[side]++; pe.push({ type: 'pk', side, shooter: null, ok: false, pk: { ...pk } }); return; }
      const taker = arr[taken[side]++ % arr.length];
      const gk = pickWeighted(rand, ids[opp], { GK: 1 });
      const p = clamp(0.76 + (POOL[taker].r - (gk != null ? POOL[gk].r : 80)) * 0.01, 0.55, 0.92);
      const ok = rand() < p;
      if (ok) pk[side]++;
      pe.push({ type: 'pk', side, shooter: taker, keeper: gk, ok, pk: { ...pk } });
    };
    for (let round = 0; round < 5 && !winner; round++) {
      for (const side of ['A', 'B']) {
        kick(side);
        if (pk.A > pk.B + (5 - taken.B) || pk.B > pk.A + (5 - taken.A)) { winner = pk.A > pk.B ? 'A' : 'B'; break; }
      }
    }
    for (let round = 0; round < 20 && !winner; round++) {
      kick('A'); kick('B');
      if (pk.A !== pk.B) winner = pk.A > pk.B ? 'A' : 'B';
    }
    if (!winner) winner = rand() < 0.5 ? 'A' : 'B';
    pens = { events: pe, score: pk };
  }

  return { events, goals, shots, pens, winner, possession: Math.round(pA * 100) };
}

function eventLine(ev, me) {
  const who = ev.side === me ? 'إنت' : 'الخصم', n = id => id == null ? 'لاعب' : POOL[id].n;
  switch (ev.type) {
    case 'goal': return `⚽ <b>${ev.min}'</b> جووول لـ${who}! <b>${n(ev.shooter)}</b>` + (ev.assist != null ? ` (تمريرة ${n(ev.assist)})` : '');
    case 'save': return `🧤 <b>${ev.min}'</b> تسديدة من <b>${n(ev.shooter)}</b> وتصدي رائع من <b>${ev.keeper != null ? n(ev.keeper) : 'الحارس'}</b>`;
    case 'miss': return `💨 <b>${ev.min}'</b> فرصة ضايعة لـ${who}: <b>${n(ev.shooter)}</b>`;
    case 'ht': return '⏸ نهاية الشوط الأول';
    case 'ft': return '🏁 صافرة النهاية';
    case 'pk': return `🎯 ركلة ${who}: <b>${n(ev.shooter)}</b> ${ev.ok ? 'سجّل ✅' : 'ضاعت ❌'}`;
  }
  return '';
}

function showMatchIntro(r, mine, theirs) {
  const res = $('result');
  res.innerHTML = `<h2>انتهى <span>الاختيار</span> ⚽</h2>
    <p>قوة تشكيلتك ${total(mine)} مقابل ${total(theirs)} للخصم</p>
    <p>المباراة هتتلعب بالمحاكاة بين الفريقين من غير تدخل من أي لاعب، والنتيجة نفسها للطرفين.</p><br>
    <button class="btn btn-primary" id="simBtn">🎮 ابدأ المباراة</button>`;
  $('simBtn').onclick = () => playMatch(r);
}

function playMatch(r) {
  stopSim();
  const me = role, op = other(me), res = $('result');
  const sim = simulateMatch(picksOf(r, 'A'), picksOf(r, 'B'), code + '|' + picksOf(r, 'A').join(',') + '|' + picksOf(r, 'B').join(','));
  const timeline = sim.events.concat(sim.pens ? [{ type: 'pkstart' }].concat(sim.pens.events) : []);

  res.innerHTML = `<div class="mt-board">
      <div class="mt-team"><small>إنت</small><b id="mtMe">0</b></div>
      <div class="mt-clock"><span id="mtMin">0'</span><small id="mtState">بداية المباراة</small></div>
      <div class="mt-team"><small>الخصم</small><b id="mtOp">0</b></div>
    </div>
    <div class="mt-feed" id="mtFeed"></div>
    <div class="mt-actions" id="mtActions"><button class="btn btn-outline" id="mtSkip">تخطي ⏭</button></div>`;

  let i = 0, skip = false;
  const setScore = sc => { $('mtMe').textContent = sc[me]; $('mtOp').textContent = sc[op]; };
  const add = html => { const d = document.createElement('div'); d.innerHTML = html; $('mtFeed').prepend(d); };
  $('mtSkip').onclick = () => { skip = true; stopSim(); step(); };

  function finish() {
    const win = sim.winner === me;
    const pens = sim.pens ? `<p>انتهت بالتعادل ${sim.goals[me]}-${sim.goals[op]} وحسمتها ركلات الترجيح ${sim.pens.score[me]}-${sim.pens.score[op]}</p>` : '';
    $('mtState').textContent = 'انتهت المباراة';
    $('mtMin').textContent = "90'";
    setScore(sim.goals);
    $('mtActions').innerHTML = `<h2>${win ? '🏆 <span>كسبت المباراة!</span>' : 'الخصم كسب المباراة 😅'}</h2>
      <p>النتيجة ${sim.goals[me]} - ${sim.goals[op]}</p>${pens}
      <p>الاستحواذ ${me === 'A' ? sim.possession : 100 - sim.possession}% • التسديدات ${sim.shots[me]} مقابل ${sim.shots[op]}</p><br>
      <a class="btn btn-primary" href="myteem.html">لعبة جديدة</a>
      <button class="btn btn-outline" id="mtReplay">شوف المباراة تاني</button>`;
    $('mtReplay').onclick = () => playMatch(r);
  }

  function step() {
    if (!$('mtFeed')) return;
    if (i >= timeline.length) return finish();
    const ev = timeline[i++];
    let delay = 900;
    if (ev.type === 'pkstart') { $('mtState').textContent = 'ركلات الترجيح'; add('🎯 <b>تعادل!</b> ركلات الترجيح'); delay = 1400; }
    else {
      if (ev.min) $('mtMin').textContent = ev.min + "'";
      if (ev.type === 'goal') { setScore(ev.score); delay = 1700; }
      if (ev.type === 'ht') $('mtState').textContent = 'استراحة';
      if (ev.type === 'pk') { setScore(ev.pk); delay = 1200; }
      add(`<div class="mt-ev ${ev.type}">${eventLine(ev, me)}</div>`);
      if (ev.type === 'ht') $('mtState').textContent = 'الشوط الثاني';
    }
    if (skip) return step();
    simTimer = setTimeout(step, delay);
  }
  step();
}

function render(r) {
  if (!r) return;
  const pres = r.presence || {}, joined = (pres.A ? 1 : 0) + (pres.B ? 1 : 0), oppHere = !!pres[other(role)];
  $('plChip').style.display = '';$('plChip').textContent = '👥 اللاعبين: ' + joined + '/2';
  $('plChip').style.color = r.status === 'playing' && !oppHere ? 'var(--red)' : '';
  for (const k of ['A', 'B']) {
    const on = !!pres[k], el = $('seat' + k);
    el.className = 'seat' + (on ? ' on' : '');
    el.innerHTML = `<span>اللاعب ${k === 'A' ? '1' : '2'}${k === role ? ' (إنت)' : ''}</span><b>${on ? '✅ منضم' : '⏳ في الانتظار...'}</b>`;
  }
  $('startBtn').disabled = joined < 2;
  $('startBtn').textContent = joined < 2 ? 'ابدأ التحدي (محتاج لاعبين اتنين)' : 'ابدأ التحدي ⚽';
  if (r.status === 'playing') { if (hadOpp && !oppHere) toast('الخصم خرج من الغرفة — مستنيينه يرجع'); if (!hadOpp && oppHere && prev) toast('الخصم رجع'); hadOpp = oppHere; }
  if (r.status === 'waiting') return show('waiting');
  show('game');
  const me = role, op = other(me);
  const mine = picksOf(r, me), theirs = picksOf(r, op);
  const old = prev ? new Set([...picksOf(prev, me), ...picksOf(prev, op)]) : new Set();
  prev = r;
  const fresh = new Set([...mine, ...theirs].filter(i => !old.has(i)));

  $('myPitch').innerHTML = pitchHTML(mine, fresh);$('oppPitch').innerHTML = pitchHTML(theirs, fresh);
  $('myBudget').textContent = money(r[me].b);$('oppBudget').textContent = money(r[op].b);
  $('roundNo').textContent = Math.min(r.n + 1, 11) + ' / 11';$('myScore').textContent = mine.length ? `مجموع ${total(mine)} • ${mine.length}/11` : '0/11';
  $('oppScore').textContent = theirs.length ? `مجموع ${total(theirs)} • ${theirs.length}/11` : '0/11';

  const L = r.last;
  if (L) {
    const P = POOL[L.pid], w = L.winner === me ? 'إنت' : 'الخصم';
    const tm = L.timedOut ? `⏱ انتهى وقت ${L.by === me ? 'إنت' : 'الخصم'} — ` : '';
    $('lastEv').innerHTML = tm + (L.bid
      ? `${w} كسب <b>${P.n}</b> بـ ${money(L.bid)}`
      : `<b>${P.n}</b> راح ${L.owner === me ? 'ليك' : 'للخصم'} مجاناً`)
      + (L.repl ? ` — و${L.winner === me ? 'الخصم' : 'إنت'} جاله نفس المركز: <b>${POOL[L.repl].n}</b>` : '');
  } else $('lastEv').textContent = '';

  const res = $('result');
  if (r.status === 'done') {
    $('offer').classList.add('hidden'); res.classList.remove('hidden');
    // الشاشة بتتبني مرة واحدة عشان المحاكاة ما تتقطعش لما بيانات الغرفة تتغير
    if (res.dataset.sim) return;
    res.dataset.sim = '1';
    showMatchIntro(r, mine, theirs);
    return;
  }
  res.dataset.sim = '';
  res.classList.add('hidden'); $('offer').classList.remove('hidden');

  const o = r.offer, P = POOL[o.pid], myTurn = o.turn === me, bid = o.bid || 0;
  $('pcard').innerHTML = `<b>${P.r}</b><small>${POS_AR[P.p]}</small>`;
  $('oName').textContent = P.n;
  $('oActions').classList.toggle('hidden', !myTurn);
  const iAmOwner = o.owner === me, high = bid ? `المزايدة الحالية: <b style="color:var(--green)">${money(bid)}</b> (${o.bidder === me ? 'إنت' : 'الخصم'})` : '';
  if (!myTurn) {
    $('oText').innerHTML = (bid ? high + ' — ' : '') + 'مستني رد الخصم...';
  } else {
    const okSlot = hasRoom(mine, P.p), can = okSlot && r[me].b > bid;
    $('oText').innerHTML = !bid
      ? 'اللاعب ده مجاني للخصم. اكتب سعرك وزايد عليه، أو سيبه ياخده مجاناً.'
      : `الخصم زايد بـ <b style="color:var(--green)">${money(bid)}</b> — تزايد أكتر ولا تسيبه${iAmOwner ? ' (هياخده بالسعر ده وانت تاخد بديل عشوائي)' : ' (هياخده الخصم بالسعر اللي رفع له)'}؟`;
    if (!okSlot) $('oText').innerHTML += '<br>مركز ' + POS_AR[P.p] + ' مكتمل عندك — مش هتقدر تزايد.';
    $('bid').min = bid + 1; $('bid').max = r[me].b; $('bid').placeholder = (bid + 1) + ' – ' + r[me].b;
    $('bid').disabled =$('buyBtn').disabled = !can;
  }
}

async function act(raise) {
  const amount = raise ? parseInt($('bid').value, 10) : 0, o = prev && prev.offer;
  if (!o || o.turn !== role) return;
  if (raise && !(amount > (o.bid || 0))) return toast('لازم سعرك يكون أعلى من ' + (o.bid || 0) + ' مليون');
  if (raise && amount > prev[role].b) return toast('ميزانيتك ' + prev[role].b + ' مليون بس');
  if (solo) {
    if (decide(local, role, raise ? 'raise' : 'leave', amount)) { $('bid').value = ''; pushLocal(); scheduleBot(); }
    return;
  }
  $('buyBtn').disabled =$('passBtn').disabled = true;
  try {
    await net(ref.transaction(r => {
      if (!r) return r;
      if (r.status !== 'playing' || !r.offer) return;
      return decide(r, role, raise ? 'raise' : 'leave', amount) ? r : undefined;
    }));
  } catch (e) { fail(e); }
  $('passBtn').disabled = false; $('bid').value = '';
}


// ---------- عداد الدور (30 ثانية) ----------
let firedFor = null;
function ensureTimer() {
  if ($('turnTimer')) return;
  const box = document.createElement('div');
  box.id = 'turnTimer'; box.className = 'turn-timer hidden';
  box.innerHTML = '<div class="tt-top"><span id="ttLabel"></span><b id="ttNum"></b></div><div class="tt-bar"><i id="ttBar"></i></div>';
  $('oName').after(box);
}
async function timeoutLeave(deadline) {
  if (solo) {
    if (local && local.status === 'playing' && local.offer && local.offer.deadline === deadline && decide(local, local.offer.turn, 'leave', 0, true)) { pushLocal(); scheduleBot(); }
    return;
  }
  try {
    await net(ref.transaction(r => {
      if (!r) return r;
      if (r.status !== 'playing' || !r.offer || r.offer.deadline !== deadline) return;
      return decide(r, r.offer.turn, 'leave', 0, true) ? r : undefined;
    }));
  } catch (e) { setTimeout(() => { if (firedFor === deadline) firedFor = null; }, 2000); }
}
function tick() {
  ensureTimer();
  const box = $('turnTimer'), r = prev, o = r && r.status === 'playing' && r.offer;
  if ((!ref && !solo) || !o || !o.deadline) { box.classList.add('hidden'); return; }
  const ms = o.deadline - now(), myTurn = o.turn === role, sec = Math.max(0, Math.ceil(ms / 1000));
  box.classList.remove('hidden');
  box.classList.toggle('low', sec <= 10);
  box.classList.toggle('mine', myTurn);
  $('ttLabel').textContent = myTurn ? '⏱ وقتك للرد' : '⏱ وقت الخصم للرد';
  $('ttNum').textContent = sec + ' ث';
  $('ttBar').style.width = Math.max(0, Math.min(100, ms / TURN_MS * 100)) + '%';
  if (ms <= 0 && firedFor !== o.deadline && (myTurn || ms <= -GRACE_MS)) {
    firedFor = o.deadline;
    timeoutLeave(o.deadline);
  }
}
setInterval(tick, 250);

$('soloBtn').onclick = () => startSolo($('botLevel').value);
$('createBtn').onclick = createRoom;
$('joinBtn').onclick = joinRoom;
$('codeInput').onkeydown = e => e.key === 'Enter' && joinRoom();$('buyBtn').onclick = () => act(true);
$('passBtn').onclick = () => act(false);$('startBtn').onclick = startGame;
$('copyBtn').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(code); toast('تم نسخ الكود'); };

$('roomChip').title = 'اخرج من الغرفة';
$('roomChip').style.cursor = 'pointer';
function leave(fromPop) {
  if (!ref && !solo) return;
  const inGame = prev && prev.status === 'playing';
  if (inGame && !confirm('اللعبة شغالة — تخرج من الغرفة؟')) { if (fromPop) history.pushState({ kc: 1 }, ''); return; }
  stopSim(); $('result').dataset.sim = ''; $('result').classList.add('hidden');
  stopBot(); solo = local = null;
  if (ref) {
    ref.off(); conn && conn.off();
    ref.child('presence/' + role).remove().catch(() => {});
    sessionStorage.removeItem('kc-last'); sessionStorage.removeItem('kc-' + code);
  }
  ref = role = code = prev = conn = null; hadOpp = false;
  $('roomChip').classList.add('hidden');$('plChip').style.display = 'none';
  show('lobby');
  if (!fromPop) history.back();
}
$('roomChip').onclick = () => leave(false);$('backBtn').onclick = () => leave(false);
window.addEventListener('popstate', () => leave(true));

const last = sessionStorage.getItem('kc-last');
if (db && last && sessionStorage.getItem('kc-' + last)) enter(last, sessionStorage.getItem('kc-' + last));

if (configured) { const p = new URLSearchParams(location.search).get('room'); if (p) $('codeInput').value = p.toUpperCase(); }
})();
