/* Kora Challenge — تحدي المعلومات الكروية
   - ضد الكمبيوتر (محلي) أو أونلاين بغرفة وكود (Firebase Realtime Database: triviarooms/<CODE>)
   - 10 أسئلة اختيارات، 50 ثانية للسؤال، +10 نقاط لكل إجابة صح (الشريط بيوصل 100% بعد 10 إجابات صح)
   - الوضعين بيشغّلوا نفس كود العرض: الكمبيوتر بيحاكي "الغرفة" محليًا بنفس شكل البيانات. */
(() => {
  'use strict';
  const TOTAL = 10, PTS = 10, ROUND_S = 50, WARN_S = 5, REVEAL_MS = 3200;
  const SITE = { online: { ok: 4, win: 20 }, bot: { ok: 2, win: 10 } }, DAILY_CAP = 500;
  const STATS_KEY = 'koraChallengeStats', PAID_KEY = 'koraTriviaPaid', DAILY_KEY = 'koraTriviaDaily', SEEN_KEY = 'koraTriviaSeen';
  const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', BASE = 'triviarooms/';
  const BOT = { easy: { p: 0.45, min: 6, max: 30 }, mid: { p: 0.65, min: 4, max: 24 }, hard: { p: 0.85, min: 3, max: 16 } };
  const LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];
  const RING = 2 * Math.PI * 19;
  const BANK = window.TRIVIA_QS || [];
  const other = r => (r === 'A' ? 'B' : 'A');
  const $ = id => document.getElementById(id);
  const toast = m => { const t = $('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); };
  const net = p => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))]);
  const show = s => ['lobby', 'waiting', 'game', 'end'].forEach(x => $(x).classList.toggle('hidden', x !== s));
  const SVG_OK = '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>';
  const SVG_NO = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const SVG_DOTS = '<svg viewBox="0 0 24 24"><path d="M6 12h.01M12 12h.01M18 12h.01"/></svg>';
  const SVG_BOT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9 17h6"/></svg>';
  const SVG_TROPHY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>';

  let mode = 'bot', botLevel = 'mid', myName = 'لاعب', uid = null, db = null, online = false, clockOffset = 0;
  let code = null, role = 'A', op = 'B', ref = null, conn = null, st = null;
  let botTimer = null, builtKey = '', lastAdv = 0, opMissingSince = 0, awardedKey = '';
  const photos = {}, qCache = {};
  const serverNow = () => Date.now() + clockOffset;

  /* ---------- بدء التشغيل ---------- */
  function boot() {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (window.KoraAuth && window.KoraAuth.user) { clearInterval(t); init(window.KoraAuth.user); }
      else if (tries > 60) clearInterval(t);
    }, 200);
  }
  function init(user) {
    uid = user.uid;
    myName = window.KoraSec.name(user.displayName || (user.email ? user.email.split('@')[0] : '') || 'لاعب', 16);
    try {
      db = firebase.database();
      db.ref('.info/serverTimeOffset').on('value', s => { clockOffset = s.val() || 0; });
      db.ref('.info/connected').on('value', s => {
        online = !!s.val(); const c = $('connChip'); c.textContent = online ? 'متصل' : 'مش متصل'; c.style.color = online ? '#24e982' : '#ff7a59';
      });
    } catch (e) { $('connChip').textContent = 'أوفلاين'; }
    document.querySelectorAll('.tv-lv').forEach(b => b.addEventListener('click', () => {
      botLevel = b.dataset.lv; document.querySelectorAll('.tv-lv').forEach(x => x.classList.toggle('on', x === b));
    }));
    $('botBtn').addEventListener('click', startBot);
    $('createBtn').addEventListener('click', createRoom);
    $('joinBtn').addEventListener('click', joinRoom);
    $('codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
    $('codeInput').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    $('copyBtn').addEventListener('click', () => { try { navigator.clipboard.writeText(code); toast('تم نسخ الكود'); } catch (e) { toast(code); } });
    $('leaveBtn').addEventListener('click', leave);
    $('exitBtn').addEventListener('click', leave);
    $('roomChip').addEventListener('click', leave);
    $('roomChip').title = 'اخرج من الغرفة'; $('roomChip').style.cursor = 'pointer';
    $('startBtn').addEventListener('click', pressStart);
    $('againBtn').addEventListener('click', playAgain);
    const p = window.KoraSec.roomCode(new URLSearchParams(location.search).get('room'));
    if (p) $('codeInput').value = p;
    setInterval(tick, 250);
  }

  /* ---------- الأسئلة ---------- */
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function Q(n) {
    const s = st.state, key = s.gid + ':' + s.seed + ':' + n;
    if (qCache[key]) return qCache[key];
    const raw = BANK[s.qs[n]] || ['سؤال', 'صح', 'غلط', 'غلط 2', 'غلط 3'];
    const opts = raw.slice(1).map((t, i) => ({ t, ok: i === 0 }));
    const r = rng(s.seed + n * 977);
    for (let i = opts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const x = opts[i]; opts[i] = opts[j]; opts[j] = x; }
    return (qCache[key] = { text: raw[0], opts });
  }
  function pickIds() {
    let seen = []; try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); } catch (e) { seen = []; }
    const all = BANK.map((_, i) => i);
    let pool = all.filter(i => seen.indexOf(i) < 0);
    if (pool.length < TOTAL) pool = all;
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const x = pool[i]; pool[i] = pool[j]; pool[j] = x; }
    return pool.slice(0, TOTAL);
  }
  function markSeen(ids) {
    try { let seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'); seen = seen.concat(ids).slice(-Math.max(0, BANK.length - 20)); localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (e) { /* ignore */ }
  }

  /* ---------- الأوضاع: كمبيوتر / غرفة ---------- */
  function startBot() {
    mode = 'bot'; code = null; role = 'A'; op = 'B'; builtKey = ''; awardedKey = '';
    st = { state: { phase: 'lobby', gid: 0 }, ans: {}, players: { A: uid, B: 'bot' }, names: { A: myName, B: 'الكمبيوتر' }, presence: { A: true, B: true } };
    $('codeBox').classList.add('hidden'); $('botTitle').classList.remove('hidden'); $('copyBtn').classList.add('hidden');
    $('roomChip').textContent = '🤖 ' + ({ easy: 'سهل', mid: 'متوسط', hard: 'صعب' })[botLevel]; $('roomChip').classList.remove('hidden');
    render();
  }
  function genCode() { let c = ''; const a = new Uint32Array(5); crypto.getRandomValues(a); for (let i = 0; i < 5; i++) c += CODE_CH[a[i] % CODE_CH.length]; return c; }
  const isDenied = e => /permission/i.test(String((e && (e.code || e.message)) || ''));
  function needOnline() {
    if (!db) { toast('Firebase مش متحمّل'); return false; }
    return true;
  }
  async function createRoom() {
    if (!needOnline()) return;
    if (!online) { await new Promise(r => setTimeout(r, 1500)); if (!online) return toast('مفيش اتصال بسيرفر Firebase. جرّب نت تاني أو اقفل أي VPN / مانع إعلانات.'); }
    if (window.KoraSec.limit('trivia:create', 8, 60000)) return toast('استنى شوية قبل ما تعمل غرفة تانية');
    $('createBtn').disabled = true;
    try {
      for (let i = 0; i < 5; i++) {
        const c = genCode(), rf = db.ref(BASE + c);
        try {
          await net(rf.set({ createdAt: firebase.database.ServerValue.TIMESTAMP, players: { A: uid }, names: { A: myName }, state: { phase: 'lobby', gid: 0 } }));
          enter(c, 'A'); return;
        } catch (e) {
          if (!isDenied(e)) throw e;
          let exists = false;
          try { exists = (await net(rf.get())).exists(); } catch (e2) { throw e; }
          if (!exists) throw e;
        }
      }
      toast('حصلت مشكلة، جرب تاني');
    } catch (e) { fail(e); } finally { $('createBtn').disabled = false; }
  }
  async function joinRoom() {
    if (!needOnline()) return;
    const c = window.KoraSec.roomCode($('codeInput').value);
    if (!c) return toast('اكتب كود الغرفة (5 حروف)');
    if (window.KoraSec.limit('trivia:join', 8, 60000)) return toast('محاولات كتير، استنى دقيقة');
    try {
      const snap = await net(db.ref(BASE + c).get());
      if (!snap.exists()) return toast('الغرفة مش موجودة');
      const pl = snap.val().players || {};
      if (pl.A === uid) return enter(c, 'A');
      if (pl.B === uid) return enter(c, 'B');
      if (pl.B) return toast('الغرفة ممتلئة (اتنين لاعبين)');
      try { await net(db.ref(BASE + c + '/players/B').set(uid)); }
      catch (e) {
        if (!isDenied(e)) throw e;
        const again = (await net(db.ref(BASE + c + '/players/B').get())).val();
        if (again !== uid) return toast('الغرفة ممتلئة (اتنين لاعبين)');
      }
      await net(db.ref(BASE + c + '/names/B').set(myName));
      enter(c, 'B');
    } catch (e) { fail(e); }
  }
  function fail(e) {
    console.error(e);
    const m = String((e && (e.code || e.message)) || '');
    if (/permission/i.test(m)) toast('قواعد Firebase رافضة. انشر قواعد triviarooms من ملف database.rules.trivia.json');
    else if (m === 'timeout') toast('مفيش رد من السيرفر. اتأكد من النت وإنك نشرت قواعد Firebase');
    else toast('خطأ: ' + m);
  }
  function enter(c, r) {
    mode = 'online'; code = c; role = r; op = other(r); builtKey = ''; awardedKey = ''; opMissingSince = 0; st = null;
    $('codeBox').classList.remove('hidden'); $('botTitle').classList.add('hidden'); $('copyBtn').classList.remove('hidden');
    $('roomChip').textContent = c; $('roomChip').classList.remove('hidden'); $('bigCode').textContent = c;
    ref = db.ref(BASE + c);
    ref.on('value', s => { st = s.val(); if (st) st.state = st.state || null; render(); }, () => toast('الغرفة اتقفلت أو مفيش صلاحية'));
    const pr = ref.child('presence/' + r);
    conn = db.ref('.info/connected'); conn.on('value', s => { if (s.val()) { pr.set(true); pr.onDisconnect().remove(); } });
    history.replaceState(null, '', '?room=' + c);
  }
  function leave() {
    clearTimeout(botTimer);
    try {
      if (mode === 'online' && ref) { ref.off(); ref.child('presence/' + role).remove(); if (role === 'A') ref.remove().catch(() => {}); }
      if (conn) conn.off();
    } catch (e) { /* ignore */ }
    ref = conn = code = st = null; builtKey = ''; mode = 'bot';
    $('roomChip').classList.add('hidden'); history.replaceState(null, '', location.pathname); show('lobby');
  }

  /* ---------- تعديل حالة اللعبة ---------- */
  function mutate(fn) {
    if (mode === 'bot') {
      if (!st) return;
      const r = fn(JSON.parse(JSON.stringify(st.state)));
      if (r) { st.state = r; render(); }
      return;
    }
    if (!ref) return;
    ref.child('state').transaction(fn).catch(fail);
  }
  function pressStart() {
    $('startBtn').disabled = true;
    mutate(s => {
      if (!s || s.phase !== 'lobby') return;
      s.ready = s.ready || {}; s.ready[role] = true;
      if (mode === 'bot') s.ready.B = true;
      if (s.ready.A && s.ready.B) {
        s.phase = 'play'; s.n = 0; s.t0 = serverNow(); s.qs = pickIds(); s.seed = Math.floor(Math.random() * 1e9);
        s.gid = (s.gid || 0) + 1; s.ready = null;
      }
      return s;
    });
  }
  function playAgain() {
    if (mode === 'bot') { st.state = { phase: 'lobby', gid: st.state.gid || 0 }; st.ans = {}; builtKey = ''; render(); return; }
    mutate(s => { if (!s || s.phase !== 'end') return; return { phase: 'lobby', gid: s.gid || 0 }; });
  }
  const ansKey = k => 'g' + st.state.gid + 'n' + k;
  const ansOf = k => (st.ans && st.ans[ansKey(k)]) || {};
  function onPick(i) {
    const inf = info(); if (!inf || inf.mine || inf.over) return;
    const rec = { c: i, t: serverNow() };
    if (mode === 'bot') { setAns(inf.n, role, rec); render(); return; }
    ref.child('ans/' + ansKey(inf.n) + '/' + role).transaction(cur => (cur ? undefined : rec)).catch(fail);
  }
  function setAns(n, r, rec) { st.ans = st.ans || {}; const k = ansKey(n); st.ans[k] = st.ans[k] || {}; st.ans[k][r] = rec; }

  /* ---------- الكمبيوتر بيجاوب ---------- */
  function scheduleBot(n) {
    clearTimeout(botTimer);
    if (mode !== 'bot') return;
    const L = BOT[botLevel];
    if (Math.random() < 0.04) return;   // أحيانًا الكمبيوتر مبيلحقش يجاوب
    const delay = Math.min(ROUND_S - 2, L.min + Math.random() * (L.max - L.min)) * 1000;
    botTimer = setTimeout(() => {
      if (mode !== 'bot' || !st || st.state.phase !== 'play' || st.state.n !== n) return;
      const q = Q(n), right = q.opts.findIndex(o => o.ok);
      let c = right;
      if (Math.random() >= L.p) { const w = q.opts.map((_, i) => i).filter(i => i !== right); c = w[Math.floor(Math.random() * w.length)]; }
      setAns(n, 'B', { c, t: serverNow() }); render();
    }, delay);
  }

  /* ---------- حساب الحالة ---------- */
  function info() {
    if (!st || !st.state || st.state.phase !== 'play') return null;
    const s = st.state, n = s.n, a = ansOf(n), mine = a[role], oth = a[op];
    const endT = s.t0 + ROUND_S * 1000, now = serverNow(), wall = Date.now();
    if (mode === 'online') { if (!(st.presence && st.presence[op])) opMissingSince = opMissingSince || wall; else opMissingSince = 0; }
    const opGone = mode === 'online' && opMissingSince && wall - opMissingSince > 3000;
    let doneAt = null;
    if (mine && oth) doneAt = Math.max(mine.t, oth.t);
    else if (mine && opGone) doneAt = mine.t;
    else if (now >= endT) doneAt = endT;
    return { n, mine, oth, endT, now, over: doneAt != null, doneAt, opGone };
  }
  const isRight = (k, rec) => !!(rec && Q(k).opts[rec.c] && Q(k).opts[rec.c].ok);
  function scoreOf(r, includeCurrent) {
    const s = st.state; let c = 0;
    for (let k = 0; k <= s.n && k < TOTAL; k++) {
      if (k === s.n && !includeCurrent) continue;
      if (isRight(k, ansOf(k)[r])) c += PTS;
    }
    return c;
  }

  /* ---------- العرض ---------- */
  function render() {
    if (!st || !st.state) {
      if (mode === 'online' && ref) { toast('الغرفة اتقفلت'); leave(); }
      return;
    }
    const ph = st.state.phase;
    if (ph === 'lobby') renderWaiting();
    else if (ph === 'play') renderPlay();
    else if (ph === 'end') renderEnd();
  }
  function photoOf(u) {
    if (u === 'bot') return '';
    if (u === uid) { try { const p = localStorage.getItem('koraProfilePhoto:' + uid); if (p && window.KoraSec.isImageDataUrl(p, 400000)) return p; } catch (e) { /* ignore */ } }
    if (!u || !db) return '';
    if (photos[u] === undefined) {
      photos[u] = '';
      db.ref('avatars/' + u).once('value').then(sn => { const v = sn.val(); if (window.KoraSec.isImageDataUrl(v, 30000)) { photos[u] = v; render(); } }).catch(() => {});
    }
    return photos[u];
  }
  function paint(el, r) {
    const u = st.players && st.players[r], isBot = u === 'bot', name = (st.names && st.names[r]) || (r === role ? myName : 'لاعب');
    const photo = isBot ? '' : photoOf(u), key = (isBot ? 'bot' : photo.length + ':' + photo.slice(-24)) + '|' + name;
    if (el.dataset.k === key) return;
    el.dataset.k = key; el.textContent = '';
    if (isBot) el.innerHTML = SVG_BOT;
    else if (photo) { const im = document.createElement('img'); im.alt = ''; im.src = photo; el.appendChild(im); }
    else el.textContent = Array.from(name)[0] || '؟';
  }
  function renderWaiting() {
    show('waiting'); clearTimeout(botTimer);
    const s = st.state, pres = st.presence || {}, ready = s.ready || {};
    const here = ['A', 'B'].filter(r => pres[r]).length;
    $('playerCount').textContent = here + ' / 2';
    const box = $('slots'); box.textContent = '';
    ['A', 'B'].forEach(r => {
      const d = document.createElement('div'), av = document.createElement('div'), nm = document.createElement('b'), sm = document.createElement('small');
      av.className = 'tv-av';
      const present = !!pres[r];
      d.className = 'tv-slot' + (present ? '' : ' empty') + (present && (ready[r] || (mode === 'bot' && r === 'B')) ? ' ready' : '');
      if (present) { paint(av, r); nm.textContent = (st.names && st.names[r]) || 'لاعب'; sm.textContent = (ready[r] || (mode === 'bot' && r === 'B')) ? 'جاهز ✓' : 'لسه مدسش ابدأ'; }
      else { av.textContent = '?'; nm.textContent = 'في الانتظار...'; sm.textContent = ''; }
      d.append(av, nm, sm); box.appendChild(d);
    });
    const b = $('startBtn'), me = !!ready[role];
    b.disabled = here < 2 || me;
    b.textContent = me ? 'مستني الخصم...' : 'ابدأ';
    $('waitHint').textContent = here < 2 ? 'في انتظار انضمام اللاعب التاني للغرفة...' : (mode === 'bot' ? 'دوس «ابدأ» وهنبدأ التحدي.' : 'لازم الاتنين يدوسوا «ابدأ» عشان التحدي يبدأ.');
  }
  function renderPlay() {
    show('game');
    const s = st.state, key = s.gid + ':' + s.n;
    if (builtKey !== key) {
      builtKey = key;
      if (s.n === 0) markSeen(s.qs || []);
      buildQuestion(s.n);
      if (mode === 'bot') scheduleBot(s.n);
    }
    paint($('meAv'), role); paint($('opAv'), op);
    const meN = (st.names && st.names[role]) || myName, opN = (st.names && st.names[op]) || 'الخصم';
    $('meName').textContent = meN; $('opName').textContent = opN;
    $('opLabel').textContent = 'نقاط ' + opN;
    updatePlay();
  }
  function buildQuestion(n) {
    const q = Q(n);
    $('qno').textContent = 'سؤال ' + (n + 1) + ' من ' + TOTAL;
    $('qtext').textContent = q.text;
    const box = $('opts'); box.textContent = '';
    q.opts.forEach((o, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'tv-opt'; b.dataset.i = i;
      const l = document.createElement('i'); l.textContent = LETTERS[i]; const t = document.createElement('span'); t.textContent = o.t;
      b.append(l, t); b.addEventListener('click', () => onPick(i)); box.appendChild(b);
    });
  }
  function setMark(markEl, avEl, state) {
    markEl.className = 'tv-mark' + (state ? ' ' + state : '');
    markEl.innerHTML = state === 'ok' ? SVG_OK : state === 'bad' ? SVG_NO : state === 'wait' ? SVG_DOTS : '';
    avEl.classList.toggle('ok', state === 'ok'); avEl.classList.toggle('bad', state === 'bad');
  }
  function updatePlay() {
    const inf = info(); if (!inf) return;
    const { n, mine, oth, over } = inf, q = Q(n);
    const meState = mine ? (isRight(n, mine) ? 'ok' : 'bad') : (over ? 'bad' : '');
    const opVisible = !!mine || over;
    const opState = opVisible ? (oth ? (isRight(n, oth) ? 'ok' : 'bad') : (over ? 'bad' : '')) : (oth ? 'wait' : '');
    setMark($('meMark'), $('meAv'), meState); setMark($('opMark'), $('opAv'), opState);
    const meSc = scoreOf(role, !!mine), opSc = scoreOf(op, opVisible), max = TOTAL * PTS;
    [['me', meSc], ['op', opSc]].forEach(([k, v]) => {
      $(k + 'Sc').textContent = v; const f = $(k + 'Fill'), p = v / max;
      f.style.width = (p * 100) + '%'; f.style.opacity = String(0.18 + 0.82 * p);
    });
    const ref0 = over ? inf.doneAt : inf.now, left = Math.max(0, Math.ceil((inf.endT - ref0) / 1000));
    $('tnum').textContent = left; $('ring').style.strokeDashoffset = String(RING * (1 - left / ROUND_S));
    $('timer').classList.toggle('low', !over && left <= WARN_S);
    document.querySelectorAll('#opts .tv-opt').forEach((b, i) => {
      const lock = !!mine || over; b.disabled = lock;
      b.classList.remove('right', 'wrong', 'dim');
      if (!lock) return;
      if (q.opts[i].ok) b.classList.add('right');
      else if (mine && mine.c === i) b.classList.add('wrong');
      else b.classList.add('dim');
    });
    let msg = 'اختار إجابتك قبل ما الوقت يخلص';
    if (over) msg = inf.opGone && !oth ? 'الخصم خرج من الغرفة' : (!mine ? 'الوقت خلص! ' : '') + (n + 1 < TOTAL ? 'السؤال الجاي بعد لحظات...' : 'جاري إعلان النتيجة...');
    else if (mine) msg = (isRight(n, mine) ? 'إجابة صح! ✓ +' + PTS + ' نقاط. ' : 'إجابة غلط. ') + 'مستني الخصم...';
    $('msg').textContent = msg;
    if (over && inf.now >= inf.doneAt + REVEAL_MS && Date.now() - lastAdv > 2000) {
      lastAdv = Date.now();
      mutate(s => {
        if (!s || s.phase !== 'play' || s.n !== n) return;
        if (n + 1 >= TOTAL) s.phase = 'end'; else { s.n = n + 1; s.t0 = serverNow(); }
        return s;
      });
    }
  }
  function tick() { if (st && st.state && st.state.phase === 'play' && !$('game').classList.contains('hidden')) updatePlay(); }

  /* ---------- النهاية والنقاط ---------- */
  function addPoints(pts) {
    try {
      const day = new Date().toISOString().slice(0, 10), d = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
      const used = d.day === day ? Number(d.pts) || 0 : 0;
      const ok = Math.max(0, Math.min(pts, DAILY_CAP - used)); if (!ok) return 0;
      localStorage.setItem(DAILY_KEY, JSON.stringify({ day, pts: used + ok }));
      const stt = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      stt.totalPoints = (Number(stt.totalPoints) || 0) + ok; stt.bestScore = Math.max(Number(stt.bestScore) || 0, ok);
      localStorage.setItem(STATS_KEY, JSON.stringify(stt));
      window.dispatchEvent(new StorageEvent('storage', { key: STATS_KEY }));
      return ok;
    } catch (e) { return 0; }
  }
  function renderEnd() {
    show('end'); clearTimeout(botTimer);
    const s = st.state, me = scoreOf(role, true), op2 = scoreOf(op, true);
    const meN = (st.names && st.names[role]) || myName, opN = (st.names && st.names[op]) || 'الخصم';
    $('endIcon').innerHTML = SVG_TROPHY;
    $('endTitle').textContent = me > op2 ? 'مبروك! فزت 🎉' : me < op2 ? 'للأسف خسرت' : 'تعادل!';
    $('endTitle').className = me > op2 ? 'win' : '';
    $('endMe').textContent = me; $('endOp').textContent = op2; $('endMeName').textContent = meN; $('endOpName').textContent = opN;
    const key = (code || 'bot') + ':' + s.gid; let got = 0;
    if (awardedKey !== key) {
      awardedKey = key; $('endText').dataset.got = '0';
      let paid = []; try { paid = JSON.parse(localStorage.getItem(PAID_KEY) || '[]'); } catch (e) { paid = []; }
      if (paid.indexOf(key) < 0) {
        paid.push(key); try { localStorage.setItem(PAID_KEY, JSON.stringify(paid.slice(-80))); } catch (e) { /* ignore */ }
        const R = SITE[mode], right = me / PTS;
        got = addPoints(right * R.ok + (me > op2 ? R.win : 0));
        $('endText').dataset.got = String(got);
      }
    }
    const g = Number($('endText').dataset.got || 0);
    $('endText').textContent = (me / PTS) + ' إجابة صح من ' + TOTAL + (g ? ' • اتضاف ' + g + ' نقطة لرصيدك' : '');
    $('againBtn').disabled = false;
    $('againBtn').textContent = mode === 'bot' ? 'العب تاني' : 'جولة تانية في نفس الغرفة';
  }

  boot();
})();
