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

const BUDGET = 100, PRICE = 11;
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
let db; if (configured) { firebase.initializeApp(FIREBASE_CONFIG); db = firebase.database(); }

let code = null, role = null, ref = null, prev = null;
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
function decide(r, buy) {
  const { pid, owner } = r.offer, buyer = other(owner), P = POOL[pid];
  r.A.p = picksOf(r, 'A'); r.B.p = picksOf(r, 'B');
  const canBuy = r[buyer].b >= PRICE && hasRoom(r[buyer].p, P.p);
  let repl = null;
  if (buy && canBuy) {
    r[buyer].p.push(pid); r[buyer].b -= PRICE;
    repl = draw(r, owner, pid); r[owner].p.push(repl);
    r.last = { t: 'buy', pid, repl, owner };
  } else {
    r[owner].p.push(pid);
    r.last = { t: 'pass', pid, owner };
  }
  r.n++;
  const o = nextOwner(r);
  if (o) r.offer = { pid: draw(r, o, -1), owner: o };
  else { r.offer = null; r.status = 'done'; }
}

const genCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random() * 32 | 0]).join('');
const newRoom = () => ({ status: 'waiting', n: 0, A: { b: BUDGET, p: [] }, B: { b: BUDGET, p: [] } });

async function createRoom() {
  for (let i = 0; i < 5; i++) {
    const c = genCode(), rf = db.ref('rooms/' + c);
    const res = await rf.transaction(cur => cur ? undefined : newRoom());
    if (res.committed) { enter(c, 'A'); return; }
  }
  toast('حصلت مشكلة، جرب تاني');
}
async function joinRoom() {
  const c = $('codeInput').value.trim().toUpperCase();
  if (c.length !== 5) return toast('اكتب كود الغرفة (5 حروف)');
  const rf = db.ref('rooms/' + c);
  const snap = await rf.get();
  if (!snap.exists()) return toast('الغرفة مش موجودة');
  const res = await rf.transaction(r => {
    if (!r) return r;
    if (r.status !== 'waiting') return;
    r.status = 'playing'; r.n = 0;
    r.A.p = []; r.B.p = [];
    r.offer = { pid: draw(r, 'A', -1), owner: 'A' };
    return r;
  });
  if (res.committed) enter(c, 'B');
  else if (sessionStorage.getItem('kc-' + c) === 'B') enter(c, 'B');
  else toast('الغرفة ممتلئة أو اللعبة بدأت');
}
function enter(c, r) {
  code = c; role = r; sessionStorage.setItem('kc-' + c, r);
  $('roomChip').textContent = c; $('roomChip').classList.remove('hidden');$('bigCode').textContent = c;
  ref = db.ref('rooms/' + c);
  ref.on('value', s => render(s.val()));
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
  if (r.status === 'waiting') return show('waiting');
  show('game');
  const me = role, op = other(me);
  const mine = picksOf(r, me), theirs = picksOf(r, op);
  const old = prev ? new Set([...picksOf(prev, me), ...picksOf(prev, op)]) : new Set();
  prev = r;
  const fresh = new Set([...mine, ...theirs].filter(i => !old.has(i)));

  $('myPitch').innerHTML = pitchHTML(mine, fresh);$('oppPitch').innerHTML = pitchHTML(theirs, fresh);
  $('myBudget').textContent = money(r[me].b);$('oppBudget').textContent = money(r[op].b);
  $('roundNo').textContent = Math.min(r.n + 1, 22) + ' / 22';$('myScore').textContent = mine.length ? `مجموع ${total(mine)} • ${mine.length}/11` : '0/11';
  $('oppScore').textContent = theirs.length ? `مجموع ${total(theirs)} • ${theirs.length}/11` : '0/11';

  const L = r.last;
  if (L) {
    const who = L.owner === me ? 'ليك' : 'للخصم', P = POOL[L.pid];
    $('lastEv').innerHTML = L.t === 'buy'
      ? `${L.owner === me ? 'الخصم' : 'إنت'} خطفت <b>${P.n}</b> بـ ${money(PRICE)} — والبديل ${who}: <b>${POOL[L.repl].n}</b>`
      : `<b>${P.n}</b> راح ${who} مجاناً`;
  } else $('lastEv').textContent = '';

  const res = $('result');
  if (r.status === 'done') {
    const a = total(mine), b = total(theirs);
    res.classList.remove('hidden'); $('offer').classList.add('hidden');
    res.innerHTML = `<h2>${a === b ? '<span>تعادل!</span>' : a > b ? '🏆 <span>كسبت!</span>' : 'الخصم كسب 😅'}</h2><p>تشكيلتك ${a} مقابل ${b} للخصم</p><br><a class="btn btn-primary" href="myteam.html">لعبة جديدة</a>`;
    return;
  }
  res.classList.add('hidden'); $('offer').classList.remove('hidden');

  const o = r.offer, P = POOL[o.pid], mineOffer = o.owner === me;
  $('pcard').innerHTML = `<b>${P.r}</b><small>${POS_AR[P.p]}</small>`;
  $('oName').textContent = P.n;
  $('oActions').classList.toggle('hidden', mineOffer);
  if (mineOffer) {
    $('oText').textContent = 'اللاعب ده مجاني ليك — مستني قرار الخصم (يخطفه ولا يسيبه)...';
  } else {
    const okMoney = r[me].b >= PRICE, okSlot = hasRoom(mine, P.p);
    $('oText').textContent = 'اللاعب ده مجاني للخصم. تقدر تخطفه منه، ولو خطفته هو بياخد بديل عشوائي.';
    $('buyBtn').textContent = `اخطفه بـ ${money(PRICE)}`;
    $('buyBtn').disabled = !(okMoney && okSlot);
  }
}

async function act(buy) {
  $('buyBtn').disabled =$('passBtn').disabled = true;
  await ref.transaction(r => {
    if (!r) return r;
    if (r.status !== 'playing' || !r.offer || r.offer.owner === role) return;
    decide(r, buy); return r;
  });
  $('passBtn').disabled = false;
}

$('createBtn').onclick = createRoom;
$('joinBtn').onclick = joinRoom;
$('codeInput').onkeydown = e => e.key === 'Enter' && joinRoom();$('buyBtn').onclick = () => act(true);
$('passBtn').onclick = () => act(false);$('copyBtn').onclick = () => { navigator.clipboard && navigator.clipboard.writeText(code); toast('تم نسخ الكود'); };
})();
