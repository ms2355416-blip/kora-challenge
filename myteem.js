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
if ($('cfgWarn'))$('cfgWarn').classList.toggle('hidden', configured);
let db, initErr = null;
try { firebase.initializeApp(FIREBASE_CONFIG); db = firebase.database(); }
catch (e) { initErr = e; console.error(e); }

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
function nextOwner(r) {
  const a = picksOf(r, 'A').length, b = picksOf(r, 'B').length;
  if (a + b >= 22) return null;
  return a < b ? 'A' : b < a ? 'B' : (r.n % 2 ? 'B' : 'A');
}
const newOffer = (r, o) => ({ pid: draw(r, o, -1), owner: o, bid: 0, turn: other(o) });

function decide(r, who, action, amount) {
  const of = r.offer, { pid, owner } = of, P = POOL[pid];
  if (of.turn !== who) return false;
  r.A.p = picksOf(r, 'A'); r.B.p = picksOf(r, 'B');
  if (action === 'raise') {
    if (!Number.isInteger(amount) || amount <= of.bid || amount > r[who].b || !hasRoom(r[who].p, P.p)) return false;
    of.bid = amount; of.bidder = who; of.turn = other(who);
    return true;
  }
  const winner = of.bidder || owner, bid = of.bidder ? of.bid : 0;
  r[winner].p.push(pid); r[winner].b -= bid;
  let repl = null;
  if (winner !== owner) { repl = draw(r, owner, pid); r[owner].p.push(repl); }
  r.last = { pid, owner, winner, bid, repl };
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
  if (!db) return toast('Firebase مش متحمّل — اتأكد من النت');
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
  if (!db) return toast('Firebase مش متحمّل — اتأكد من النت');
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
  if (v.status === 'waiting' && !here.A) return enter(c, 'A');
  if (v.status === 'playing' && !here.A) return enter(c, 'A');
  if (v.status === 'playing' && !here.B) return enter(c, 'B');
  const res = await net(rf.transaction(r => {
    if (!r) return r;
    if (r.status !== 'waiting' || !(r.presence && r.presence.A)) return;
    r.status = 'playing'; r.n = 0;
    r.A.p = []; r.B.p = [];
    r.offer = newOffer(r, 'A');
    return r;
  }));
  if (res.committed) enter(c, 'B');
  else if (sessionStorage.getItem('kc-' + c) === 'B') enter(c, 'B');
  else toast('الغرفة ممتلئة أو اللعبة بدأت');
}
function enter(c, r) {
  code = c; role = r; sessionStorage.setItem('kc-' + c, r); sessionStorage.setItem('kc-last', c);
  if ($('roomChip')) { $('roomChip').textContent = c; $('roomChip').classList.remove('hidden'); }
  if ($('bigCode'))$('bigCode').textContent = c;
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

function render(r) {
  if (!r) return;
  const pres = r.presence || {}, joined = (pres.A ? 1 : 0) + (pres.B ? 1 : 0), oppHere = !!pres[other(role)];
  if ($('plChip')) {
    $('plChip').style.display = '';$('plChip').textContent = '👥 اللاعبين: ' + joined + '/2';
    $('plChip').style.color = r.status === 'playing' && !oppHere ? 'var(--red)' : '';
  }
  if ($('waitCount'))$('waitCount').textContent = joined + '/2';
  if (r.status === 'playing') { 
    if (hadOpp && !oppHere) toast('الخصم خرج من الغرفة — مستنيينه يرجع'); 
    if (!hadOpp && oppHere && prev) toast('الخصم رجع'); 
    hadOpp = oppHere; 
  }
  if (r.status === 'waiting') return show('waiting');
  show('game');
  const me = role, op = other(me);
  const mine = picksOf(r, me), theirs = picksOf(r, op);
  const old = prev ? new Set([...picksOf(prev, me), ...picksOf(prev, op)]) : new Set();
  prev = r;
  const fresh = new Set([...mine, ...theirs].filter(i => !old.has(i)));

  if ($('myPitch'))$('myPitch').innerHTML = pitchHTML(mine, fresh);
  if ($('oppPitch'))$('oppPitch').innerHTML = pitchHTML(theirs, fresh);
  if ($('myBudget'))$('myBudget').textContent = money(r[me].b); 
  if ($('oppBudget'))$('oppBudget').textContent = money(r[op].b);
  if ($('roundNo'))$('roundNo').textContent = Math.min(r.n + 1, 22) + ' / 22';
  if ($('myScore'))$('myScore').textContent = mine.length ? `مجموع ${total(mine)} • ${mine.length}/11` : '0/11';
  if ($('oppScore'))$('oppScore').textContent = theirs.length ? `مجموع ${total(theirs)} • ${theirs.length}/11` : '0/11';

  const L = r.last;
  if (L && $('lastEv')) {
    const P = POOL[L.pid], w = L.winner === me ? 'إنت' : 'الخصم';
    $('lastEv').innerHTML = L.bid
      ? `${w} كسب <b>${P.n}</b> بـ ${money(L.bid)}` + (L.repl ? ` — والبديل ${L.owner === me ? 'ليك' : 'للخصم'}: <b>${POOL[L.repl].n}</b>` : '')
      : `<b>${P.n}</b> راح ${L.owner === me ? 'ليك' : 'للخصم'} مجاناً`;
  } else if ($('lastEv')) {$('lastEv').textContent = ''; }

  const res = $('result');
  if (r.status === 'done') {
    const a = total(mine), b = total(theirs);
    if (res) res.classList.remove('hidden'); 
    if ($('offer'))$('offer').classList.add('hidden');
    if (res) res.innerHTML = `<h2>${a === b ? '<span>تعادل!</span>' : a > b ? '🏆 <span>كسبت!</span>' : 'الخصم كسب 😅'}</h2><p>تشكيلتك ${a} مقابل ${b} للخصم</p><br><a class="btn btn-primary" href="myteem.html">لعبة جديدة</a>`;
    return;
  }
  if (res) res.classList.add('hidden'); 
  if ($('offer'))$('offer').classList.remove('hidden');

  const o = r.offer, P = POOL[o.pid], myTurn = o.turn === me, bid = o.bid || 0;
  if ($('pcard'))$('pcard').innerHTML = `<b>${P.r}</b><small>${POS_AR[P.p]}</small>`;
  if ($('oName'))$('oName').textContent = P.n;
  if ($('oActions'))$('oActions').classList.toggle('hidden', !myTurn);
  const iAmOwner = o.owner === me, high = bid ? `المزايدة الحالية: <b style="color:var(--green)">${money(bid)}</b> (${o.bidder === me ? 'إنت' : 'الخصم'})` : '';
  if (!myTurn) {
    if ($('oText'))$('oText').innerHTML = (bid ? high + ' — ' : '') + 'مستني رد الخصم...';
  } else {
    const okSlot = hasRoom(mine, P.p), can = okSlot && r[me].b > bid;
    if ($('oText')) {$('oText').innerHTML = !bid
        ? 'اللاعب ده مجاني للخصم. اكتب سعرك وزايد عليه، أو سيبه ياخده مجاناً.'
        : `الخصم زايد بـ <b style="color:var(--green)">${money(bid)}</b> — تزايد أكتر ولا تسيبه${iAmOwner ? ' (هياخده بالسعر ده وانت تاخد بديل عشوائي)' : ' (هياخده الخصم بالسعر اللي رفع له)'}؟`;
      if (!okSlot) $('oText').innerHTML += '<br>مركز ' + POS_AR[P.p] + ' مكتمل عندك — مش هتقدر تزايد.';
    }
    if ($('bid')) {$('bid').min = bid + 1; $('bid').max = r[me].b; $('bid').placeholder = (bid + 1) + ' – ' + r[me].b; }
    if ($('bid') &&$('buyBtn')) { $('bid').disabled =$('buyBtn').disabled = !can; }
  }
}

async function act(raise) {
  const amount = raise ? parseInt($('bid').value, 10) : 0, o = prev && prev.offer;
  if (!o || o.turn !== role) return;
  if (raise && !(amount > (o.bid || 0))) return toast('لازم سعرك يكون أعلى من ' + (o.bid || 0) + ' مليون');
  if (raise && amount > prev[role].b) return toast('ميزانيتك ' + prev[role].b + ' مليون بس');
  if ($('buyBtn') &&$('passBtn')) { $('buyBtn').disabled =$('passBtn').disabled = true; }
  try {
    await net(ref.transaction(r => {
      if (!r) return r;
      if (r.status !== 'playing' || !r.offer) return;
      return decide(r, role, raise ? 'raise' : 'leave', amount) ? r : undefined;
    }));
  } catch (e) { fail(e); }
  if ($('passBtn'))$('passBtn').disabled = false; 
  if ($('bid'))$('bid').value = '';
}

if ($('createBtn'))$('createBtn').onclick = createRoom;
if ($('joinBtn'))$('joinBtn').onclick = joinRoom;
if ($('codeInput'))$('codeInput').onkeydown = e => e.key === 'Enter' && joinRoom();
if ($('buyBtn'))$('buyBtn').onclick = () => act(true);
if ($('passBtn'))$('passBtn').onclick = () => act(false);
if ($('copyBtn'))$('copyBtn').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(code); toast('تم نسخ الكود'); };

if ($('roomChip')) {$('roomChip').title = 'اخرج من الغرفة';
  $('roomChip').style.cursor = 'pointer';
}
function leave(fromPop) {
  if (!ref) return;
  const inGame = prev && prev.status === 'playing';
  if (inGame && !confirm('اللعبة شغالة — تخرج من الغرفة؟')) { if (fromPop) history.pushState({ kc: 1 }, ''); return; }
  ref.off(); conn && conn.off();
  ref.child('presence/' + role).remove().catch(() => {});
  if (role === 'A' && (!prev || prev.status === 'waiting')) ref.remove().catch(() => {});
  sessionStorage.removeItem('kc-last'); sessionStorage.removeItem('kc-' + code);
  ref = role = code = prev = conn = null; hadOpp = false;
  if ($('roomChip'))$('roomChip').classList.add('hidden'); 
  if ($('plChip'))$('plChip').style.display = 'none';
  show('lobby');
  if (!fromPop) history.back();
}
if ($('roomChip'))$('roomChip').onclick = () => leave(false);
if ($('backBtn'))$('backBtn').onclick = () => leave(false);
window.addEventListener('popstate', () => leave(true));

const last = sessionStorage.getItem('kc-last');
if (db && last && sessionStorage.getItem('kc-' + last)) enter(last, sessionStorage.getItem('kc-' + last));

if (configured) { const p = new URLSearchParams(location.search).get('room'); if (p && $('codeInput'))$('codeInput').value = p.toUpperCase(); }
})();
