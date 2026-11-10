/* Kora Challenge — تحدي رسم اللاعبين (اتنين لاعبين بكود غرفة، Firebase Realtime Database)
   الرسام بيرسم لاعب، والمخمّن بيكتب الاسم، والرسام بس هو اللي بيحكم صح/غلط. 4 جولات بتبدّل الأدوار. */
(() => {
  'use strict';
  const WIN = 60, DRAW_PTS = 5, ROUNDS = 4, ROUND_MS = 90000, MAX_GUESS = 3, DAILY_CAP = 1500;
  const STATS_KEY = 'koraChallengeStats', PAID_KEY = 'koraDrawPaid', DAILY_KEY = 'koraDrawDaily';
  const CODE_CH = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const COLORS = ['#111111', '#e03131', '#1971c2', '#2f9e44', '#f08c00', '#7048e8', '#8d5a2b'];
  const SIZES = [4, 9, 16];
  let IDEAS = ['ميسي', 'رونالدو', 'محمد صلاح', 'نيمار', 'مبابي', 'هالاند', 'كريم بنزيما', 'زيدان', 'رونالدينيو', 'مارادونا', 'بيليه', 'دي بروين', 'مودريتش', 'لوكا مودريتش', 'ليفاندوفسكي', 'كيليان مبابي', 'فينيسيوس', 'بيلينجهام', 'يامال', 'تريزيجيه', 'محمد أبو تريكة', 'أحمد حسن', 'حسام حسن', 'محمد النني', 'أشرف حكيمي', 'ياسين بونو', 'سون هيونج مين', 'نيكولاس أوتاميندي', 'ساديو ماني', 'إبراهيموفيتش', 'بوفون', 'إنييستا', 'تشافي', 'رونالدو الظاهرة', 'هنري', 'بيكهام', 'روني', 'جيرارد', 'لامبارد', 'كافاني', 'سواريز', 'أجويرو', 'دي ماريا', 'كاكا', 'رياض محرز', 'كريستيانو', 'فيرجيل فان دايك', 'أليسون', 'نوير', 'كورتوا'];
  const MAX_PARTY = 6, MIN_PARTY = 3, PARTY_BASE = 'drawparty/', DUEL_BASE = 'drawrooms/';
  /* اقتراحات لاعيبة إضافية (بتتضاف على القايمة الأصلية من غير تكرار) */
  const EXTRA_IDEAS = ['ساديو ماني', 'كريستيانو رونالدو', 'محمد أبو تريكة', 'عماد متولي', 'حسام حسن', 'ابراهيم حسن', 'أحمد حسام ميدو', 'محمد زيدان', 'عصام الحضري', 'محمد الشناوي', 'مصطفى محمد', 'عمر مرموش', 'محمد النني', 'تريزيجيه', 'أحمد حجازي', 'رامي ربيعة', 'وليد سليمان', 'شيكابالا', 'محمود كهربا', 'أمير مرتضى منصور', 'ياسين بونو', 'أشرف حكيمي', 'حكيم زياش', 'رياض محرز', 'إسلام سليماني', 'سون هيونج مين', 'ساكا', 'فودين', 'رودري', 'كايل ووكر', 'روبن دياز', 'فان دايك', 'أليسون بيكر', 'تيبو كورتوا', 'مانويل نوير', 'نيمانيا فيديتش', 'سيرجيو راموس', 'جيرارد بيكيه', 'كارلس بويول', 'تشافي هيرنانديز', 'أندريس إنييستا', 'سيرجيو بوسكيتس', 'فرانك ريبيري', 'أريين روبن', 'تييري هنري', 'ديفيد بيكهام', 'واين روني', 'ستيفن جيرارد', 'فرانك لامبارد', 'جون تيري', 'ديدييه دروجبا', 'صامويل إيتو', 'يايا توريه', 'ماكيليلي', 'باولو مالديني', 'أليساندرو نيستا', 'فابيو كانافارو', 'جانلويجي بوفون', 'أندريا بيرلو', 'فرانشيسكو توتي', 'روبرتو باجيو', 'أليساندرو ديل بييرو', 'ريكاردو كاكا', 'روماريو', 'رونالدو الظاهرة', 'كافو', 'روبرتو كارلوس', 'جارينشا', 'سقراط', 'زيكو', 'كرويف', 'ماركو فان باستن', 'دينيس بيركامب', 'يوهان نيسكنز', 'جورج بيست', 'بوبي تشارلتون', 'ألفريدو دي ستيفانو', 'فيرينك بوشكاش', 'لوتار ماتيوس', 'فرانز بيكنباور', 'جيرد مولر', 'مايكل بالاك', 'ميروسلاف كلوزه', 'توماس مولر', 'مانويل نوير', 'كاي هافرتز', 'جمال موسيالا', 'فلوريان فيرتز', 'لويس دياز', 'داروين نونيز', 'رافائيل لياو', 'ثيو هيرنانديز', 'ماجيك ماينيان', 'أوليفييه جيرو', 'أنطوان جريزمان', 'بول بوجبا', 'نجولو كانتي', 'ديمبيلي', 'كوكو جاكبو', 'ماركوس راشفورد', 'برونو فرنانديز', 'ديكلان رايس', 'جاك جريليش', 'جود بيلينجهام', 'هاري كين', 'جوردان بيكفورد', 'جيمي فاردي', 'مارتن أوديجارد', 'جابرييل جيسوس', 'وليام ساليبا', 'جابرييل ماجالهايس', 'فيديريكو فالفيردي', 'تشواميني', 'كامافينجا', 'أنطونيو روديجر', 'داني كارفاخال', 'لوكاس فاسكيز', 'ألفارو موراتا', 'لامين يامال', 'بيدري', 'جافي', 'فران توريس', 'رافينيا', 'ليفاندوفسكي', 'تير شتيجن', 'أنطونيو كونتي', 'لاوتارو مارتينيز', 'نيكولو باريلا', 'ماركوس تورام', 'فيكتور أوسيمين', 'خفيتشا كفاراتسخيليا', 'باولو ديبالا', 'ماتيو كوفاسيتش', 'ماريو جوتزه', 'ماركو ريوس', 'إيرلينج هالاند', 'إيمي مارتينيز', 'أنخيل دي ماريا', 'سيرجيو أجويرو', 'كارلوس تيفيز', 'جابرييل باتيستوتا', 'دييجو سيميوني', 'خوان رومان ريكيلمي', 'لويس سواريز', 'إدينسون كافاني', 'ماركينيوس', 'تياجو سيلفا', 'داني ألفيس', 'مارسيلو', 'ريتشارليسون', 'فينيسيوس جونيور', 'رودريجو', 'نيمار جونيور', 'سالم الدوسري', 'ياسر القحطاني', 'ماجد عبدالله', 'سامي الجابر', 'نواف العابد', 'محمد البريك', 'عبدالله الحمدان', 'علي الهبيدي', 'يوسف النصيري', 'مهند علي', 'أيمن حسين', 'يونس محمود', 'جيلبرتو سيلفا'];
  IDEAS = Array.from(new Set(IDEAS.concat(EXTRA_IDEAS)));
  let ideaBag = [];
  const nextIdea = () => { if (!ideaBag.length) ideaBag = IDEAS.slice().sort(() => Math.random() - 0.5); return ideaBag.pop(); };
  const $ = id => document.getElementById(id);
  const toast = m => { const t = $('toast'); t.textContent = m; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); };
  const show = s => ['lobby', 'waiting', 'game'].forEach(x => $(x).classList.toggle('hidden', x !== s));
  const net = p => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))]);
  const other = r => r === 'A' ? 'B' : 'A';

  let mode = 'duel', myName = 'لاعب';
  let db, uid = null, code = null, role = null, ref = null, last = null, clockOffset = 0, conn = null;
  let strokeRef = null, strokeN = -1, pointsGiven = {}, online = false;
  const mine = new Set();

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
    uid = user.uid; myName = window.KoraSec.name(user.displayName || (user.email ? user.email.split('@')[0] : '') || 'لاعب', 16);
    try { db = firebase.database(); db.ref('.info/serverTimeOffset').on('value', s => { clockOffset = s.val() || 0; }); } catch (e) { toast('Firebase مش متحمّل'); return; }
    db.ref('.info/connected').on('value', s => {
      online = !!s.val(); const c = $('connChip'); c.textContent = online ? 'متصل' : 'مش متصل'; c.style.color = online ? '#24e982' : '#ff7a59';
    });
    $('createBtn').addEventListener('click', createRoom);
    $('createPartyBtn').addEventListener('click', createParty);
    $('joinBtn').addEventListener('click', joinRoom);
    $('codeInput').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
    $('codeInput').addEventListener('input', e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
    $('copyBtn').addEventListener('click', () => { try { navigator.clipboard.writeText(code); toast('تم نسخ الكود'); } catch (e) { toast(code); } });
    $('leaveBtn').addEventListener('click', leave);
    $('againBtn').addEventListener('click', leave);
    $('startBtn').addEventListener('click', startGame);
    const p = window.KoraSec.roomCode(new URLSearchParams(location.search).get('room'));
    if (p) $('codeInput').value = p;
    buildTools(); setupCanvas();
    $('guessForm').addEventListener('submit', onGuess);
    $('yesBtn').addEventListener('click', () => verdict(true));
    $('noBtn').addEventListener('click', () => verdict(false));
    $('nextBtn').addEventListener('click', nextRound);
    setInterval(tick, 250);
  }
  const serverNow = () => Date.now() + clockOffset;

  /* ---------- الغرف ---------- */
  function genCode() { let c = ''; const a = new Uint32Array(5); crypto.getRandomValues(a); for (let i = 0; i < 5; i++) c += CODE_CH[a[i] % CODE_CH.length]; return c; }
  const isDenied = e => /permission/i.test(String((e && (e.code || e.message)) || ''));
  async function createRoom() {
    if (!online) { await new Promise(r => setTimeout(r, 1500)); if (!online) return toast('مفيش اتصال بسيرفر Firebase. جرّب نت تاني أو اقفل أي حاجة بتحجب الاتصال (VPN / مانع إعلانات).'); }
    if (window.KoraSec.limit('draw:create', 8, 60000)) return toast('استنى شوية قبل ما تعمل غرفة تانية');
    $('createBtn').disabled = true;
    try {
      for (let i = 0; i < 5; i++) {
        const c = genCode(), rf = db.ref('drawrooms/' + c);
        try {
          await net(rf.set({ createdAt: firebase.database.ServerValue.TIMESTAMP, players: { A: uid }, state: { n: 0, phase: 'lobby' } }));
          enter(c, 'A'); return;
        } catch (e) {
          if (!isDenied(e)) throw e;
          let exists = false;
          try { exists = (await net(rf.get())).exists(); } catch (e2) { throw e; }
          if (!exists) throw e;   // مرفوض ومش تكرار كود = القواعد مش بتسمح
        }
      }
      toast('حصلت مشكلة، جرب تاني');
    } catch (e) { fail(e); } finally { $('createBtn').disabled = false; }
  }
  async function joinRoom() {
    const c = window.KoraSec.roomCode($('codeInput').value);
    if (!c) return toast('اكتب كود الغرفة (5 حروف)');
    if (window.KoraSec.limit('draw:join', 8, 60000)) return toast('محاولات كتير، استنى دقيقة');
    try {
      const snap = await net(db.ref(DUEL_BASE + c).get());
      if (!snap.exists()) {
        const ps = await net(db.ref(PARTY_BASE + c).get());
        if (ps.exists()) return joinParty(c, ps);
        return toast('الغرفة مش موجودة');
      }
      const pl = snap.val().players || {};
      if (pl.A === uid) return enter(c, 'A');
      if (pl.B === uid) return enter(c, 'B');
      if (pl.B) return toast('الغرفة ممتلئة (اتنين لاعبين)');
      try { await net(db.ref('drawrooms/' + c + '/players/B').set(uid)); }
      catch (e) {
        if (!isDenied(e)) throw e;
        const again = (await net(db.ref('drawrooms/' + c + '/players/B').get())).val();
        if (again !== uid) return toast('الغرفة ممتلئة (اتنين لاعبين)');
      }
      enter(c, 'B');
    } catch (e) { fail(e); }
  }
  function fail(e) {
    console.error(e);
    const m = String((e && (e.code || e.message)) || '');
    if (/permission/i.test(m)) toast('قواعد Firebase رافضة. انشر قواعد drawrooms من ملف database.rules.json');
    else if (m === 'timeout') toast('مفيش رد من السيرفر. اتأكد من النت، ومن إنك نشرت قواعد Firebase الجديدة');
    else toast('خطأ: ' + m);
  }
  function enter(c, r, m) {
    mode = m || 'duel'; code = c; role = r; last = null; strokeN = -1; mine.clear(); pointsGiven = {};
    $('roomChip').textContent = c; $('roomChip').classList.remove('hidden'); $('bigCode').textContent = c;
    ref = db.ref((mode === 'party' ? PARTY_BASE : DUEL_BASE) + c);
    ref.on('value', s => render(s.val()), () => toast('الغرفة اتقفلت أو مفيش صلاحية'));
    const pr = ref.child('presence/' + r);
    conn = db.ref('.info/connected'); conn.on('value', s => { if (s.val()) { pr.set(true); pr.onDisconnect().remove(); } });
    history.replaceState(null, '', '?room=' + c);
  }
  function leave() {
    try { if (ref) { ref.off(); if (strokeRef) strokeRef.off(); ref.child('presence/' + role).remove(); if (mode === 'party' && uid) ref.child('members/' + uid).remove().catch(() => {}); if (role === 'A') ref.remove().catch(() => {}); } if (conn) conn.off(); } catch (e) { /* ignore */ }
    ref = strokeRef = conn = code = role = last = null; strokeN = -1; mode = 'duel';
    ['partyBoard', 'partyJudge'].forEach(i => $(i).classList.add('hidden')); document.querySelector('.dr-score').classList.remove('hidden');
    $('roomChip').classList.add('hidden'); history.replaceState(null, '', location.pathname); show('lobby');
    ['result', 'endBox', 'judge', 'guessForm', 'tools', 'idea'].forEach(i => $(i).classList.add('hidden'));
  }
  async function startGame() {
    if (mode === 'party') return startParty();
    $('startBtn').disabled = true;
    try {
      await net(ref.child('state').transaction(s => {
        if (!s || (s.phase !== 'lobby' && s.phase !== 'end')) return;
        return { n: 0, phase: 'draw', drawer: 'A', t0: serverNow(), scores: { A: 0, B: 0 }, guesses: 0, wrong: [], results: {} };
      }));
    } catch (e) { fail(e); }
  }

  /* ---------- حالة اللعبة ---------- */
  const tr = (fn) => ref && ref.child('state').transaction(fn).catch(fail);
  function onGuess(e) {
    e.preventDefault();
    if (mode === 'party') return guessParty();
    const text = window.KoraSec.name($('guessInput').value, 30);
    if (!text) return;
    if (!window.KoraSec.throttle('draw:guess', 1200)) return toast('استنى ثانية');
    $('guessInput').value = '';
    tr(s => { if (!s || s.phase !== 'draw' || s.drawer === role || s.pending || (s.guesses || 0) >= MAX_GUESS) return; s.pending = text; s.guesses = (s.guesses || 0) + 1; return s; });
  }
  function verdict(ok) {
    tr(s => {
      if (!s || s.phase !== 'draw' || s.drawer !== role || !s.pending) return;
      const g = other(s.drawer), text = s.pending; s.pending = null;
      if (ok) { s.phase = 'result'; s.win = true; s.guessText = text; s.scores[g] = (s.scores[g] || 0) + WIN; s.scores[s.drawer] = (s.scores[s.drawer] || 0) + DRAW_PTS; s.results = s.results || {}; s.results[s.n] = 1; }
      else { s.wrong = (s.wrong || []).concat([text]); if ((s.guesses || 0) >= MAX_GUESS) { s.phase = 'result'; s.win = false; s.results = s.results || {}; s.results[s.n] = 0; } }
      return s;
    });
  }
  function nextRound() {
    $('nextBtn').disabled = true;
    if (mode === 'party') return nextParty();
    tr(s => {
      if (!s || s.phase !== 'result') return;
      const n = s.n + 1;
      if (n >= ROUNDS) { s.phase = 'end'; return s; }
      return { n: n, phase: 'draw', drawer: other(s.drawer), t0: serverNow(), scores: s.scores, guesses: 0, wrong: [], results: s.results || {} };
    });
  }
  function tick() {
    if (!last || last.state.phase !== 'draw') return;
    const left = Math.max(0, Math.ceil((last.state.t0 + ROUND_MS - serverNow()) / 1000));
    $('timerPill').textContent = left; $('timerPill').classList.toggle('low', left <= 15);
    if (left === 0 && serverNow() > last.state.t0 + ROUND_MS + 1200) {
      tr(s => { if (!s || s.phase !== 'draw' || serverNow() < s.t0 + ROUND_MS) return; s.phase = 'result'; s.win = false; s.pending = null; s.results = s.results || {}; s.results[s.n] = 0; return s; });
    }
  }

  /* ---------- الوضع الجماعي: واحد يرسم والكل يخمّن (3 لـ6 لاعبين) ---------- */
  async function createParty() {
    if (!online) { await new Promise(r => setTimeout(r, 1500)); if (!online) return toast('مفيش اتصال بسيرفر Firebase.'); }
    if (window.KoraSec.limit('draw:create', 8, 60000)) return toast('استنى شوية قبل ما تعمل غرفة تانية');
    $('createPartyBtn').disabled = true;
    try {
      for (let i = 0; i < 5; i++) {
        const c = genCode(), rf = db.ref(PARTY_BASE + c);
        try {
          const taken = (await net(db.ref(DUEL_BASE + c).get())).exists();
          if (taken) continue;
          const members = {}; members[uid] = true;
          await net(rf.set({ mode: 'party', createdAt: firebase.database.ServerValue.TIMESTAMP, players: { A: uid }, names: { A: myName }, members: members, state: { n: 0, phase: 'lobby' } }));
          enter(c, 'A', 'party'); return;
        } catch (e) {
          if (!isDenied(e)) throw e;
          let exists = false;
          try { exists = (await net(rf.get())).exists(); } catch (e2) { throw e; }
          if (!exists) throw e;
        }
      }
      toast('حصلت مشكلة، جرب تاني');
    } catch (e) { fail(e); } finally { $('createPartyBtn').disabled = false; }
  }
  async function joinParty(c, snap) {
    const v = snap.val() || {}, pl = v.players || {};
    const had = Object.keys(pl).find(k => pl[k] === uid);
    if (had) return enter(c, had, 'party');
    if (v.state && v.state.phase && v.state.phase !== 'lobby') return toast('اللعبة بدأت بالفعل');
    const rr = db.ref(PARTY_BASE + c);
    let r = null;
    for (const k of 'ABCDEF'.split('')) {
      try {
        const res = await net(rr.child('players/' + k).transaction(cur => (cur ? undefined : uid)));
        if (res.committed && res.snapshot.val() === uid) { r = k; break; }
      } catch (e) { if (!isDenied(e)) throw e; }
    }
    if (!r) return toast('الغرفة ممتلئة (' + MAX_PARTY + ' لاعبين)');
    await net(rr.child('members/' + uid).set(true));
    await net(rr.child('names/' + r).set(myName));
    enter(c, r, 'party');
  }
  async function startParty() {
    $('startBtn').disabled = true;
    try {
      await net(ref.child('state').transaction(s => {
        if (!s || (s.phase !== 'lobby' && s.phase !== 'end')) return;
        return s;
      }));
      const pl = (await net(ref.child('players').get())).val() || {}, order = Object.keys(pl).sort().slice(0, MAX_PARTY);
      if (order.length < MIN_PARTY) { toast('محتاجين ' + MIN_PARTY + ' لاعبين على الأقل'); $('startBtn').disabled = false; return; }
      const scores = {}; order.forEach(r => { scores[r] = 0; });
      await net(ref.child('state').set({ n: 0, phase: 'draw', drawer: order[0], order: order, t0: serverNow(), scores: scores, tries: {}, q: [], results: {} }));
    } catch (e) { fail(e); $('startBtn').disabled = false; }
  }
  function guessParty() {
    const text = window.KoraSec.name($('guessInput').value, 30);
    if (!text) return;
    if (!window.KoraSec.throttle('draw:guess', 1200)) return toast('استنى ثانية');
    $('guessInput').value = '';
    tr(s => {
      if (!s || s.phase !== 'draw' || s.drawer === role || !s.order || s.order.indexOf(role) < 0) return;
      const q = s.q || [], tries = s.tries || {};
      if ((tries[role] || 0) >= MAX_GUESS || q.some(x => x.r === role && x.v == null) || q.length >= 40) return;
      q.push({ r: role, t: text }); tries[role] = (tries[role] || 0) + 1; s.q = q; s.tries = tries; return s;
    });
  }
  function verdictParty(i, ok) {
    tr(s => {
      if (!s || s.phase !== 'draw' || s.drawer !== role) return;
      const q = s.q || [], g = q[i]; if (!g || g.v != null) return;
      g.v = ok ? 1 : 0; s.q = q; s.results = s.results || {}; s.scores = s.scores || {};
      if (ok) {
        s.phase = 'result'; s.win = true; s.winner = g.r; s.guessText = g.t;
        s.scores[g.r] = (s.scores[g.r] || 0) + WIN; s.scores[s.drawer] = (s.scores[s.drawer] || 0) + DRAW_PTS; s.results[s.n] = 1;
      } else {
        const tries = s.tries || {}, done = s.order.filter(r => r !== s.drawer).every(r => (tries[r] || 0) >= MAX_GUESS) && !q.some(x => x.v == null);
        if (done) { s.phase = 'result'; s.win = false; s.results[s.n] = 0; }
      }
      return s;
    });
  }
  function nextParty() {
    tr(s => {
      if (!s || s.phase !== 'result') return;
      const n = s.n + 1;
      if (n >= (s.order || []).length) { s.phase = 'end'; return s; }
      return { n: n, phase: 'draw', drawer: s.order[n], order: s.order, t0: serverNow(), scores: s.scores, tries: {}, q: [], results: s.results || {} };
    });
  }
  function renderParty(v) {
    last = v; const s = v.state || {}, pl = v.players || {}, nm = v.names || {};
    const nameOf = r => (nm[r] || r) + (r === role ? ' (إنت)' : '');
    if (s.phase === 'lobby') {
      show('waiting');
      const roles = Object.keys(pl).sort();
      $('presLine').textContent = 'اللاعبين (' + roles.length + '/' + MAX_PARTY + '): ' + roles.map(nameOf).join('، ') + (roles.length < MIN_PARTY ? ' • محتاجين ' + MIN_PARTY + ' على الأقل' : '');
      $('startBtn').disabled = !(roles.length >= MIN_PARTY && role === 'A'); $('startBtn').textContent = role === 'A' ? 'ابدأ اللعب' : 'مستني صاحب الغرفة يبدأ';
      return;
    }
    show('game');
    if (strokeN !== s.n) attachStrokes(s.n);
    const order = s.order || [], drawer = s.drawer === role, playing = s.phase === 'draw', scores = s.scores || {};
    document.querySelector('.dr-score').classList.add('hidden');
    const pb = $('partyBoard'); pb.classList.remove('hidden'); pb.textContent = '';
    order.slice().sort((a, b) => (scores[b] || 0) - (scores[a] || 0)).forEach(r => {
      const c = document.createElement('span'); c.className = 'dr-pc' + (r === role ? ' me' : '') + (r === s.drawer && playing ? ' dw' : '');
      c.textContent = (r === s.drawer && playing ? '✏️ ' : '') + (nm[r] || r) + ' ' + (scores[r] || 0); pb.appendChild(c);
    });
    $('rndPill').textContent = 'الجولة ' + Math.min(s.n + 1, order.length) + ' من ' + order.length;
    $('roleLine').textContent = drawer ? 'إنت الرسّام: ارسم لاعب كورة والكل هيخمّن' : (nm[s.drawer] || s.drawer) + ' بيرسم. خمّن اسم اللاعب بسرعة!';
    $('board').parentNode.classList.toggle('ro', !(playing && drawer));
    $('tools').classList.toggle('hidden', !(playing && drawer));
    const q = s.q || [], tries = (s.tries || {})[role] || 0, left = MAX_GUESS - tries, pendingMine = q.some(x => x.r === role && x.v == null);
    $('guessForm').classList.toggle('hidden', !(playing && !drawer && left > 0));
    $('guessInput').disabled = $('guessBtn').disabled = pendingMine;
    $('guessInput').placeholder = pendingMine ? 'مستني حكم الرسّام...' : 'اكتب اسم اللاعب... (' + left + ' محاولات باقية)';
    $('judge').classList.add('hidden');
    const pj = $('partyJudge'); pj.textContent = '';
    const pend = q.map((g, i) => ({ g: g, i: i })).filter(x => x.g.v == null);
    pj.classList.toggle('hidden', !(playing && drawer && pend.length));
    pend.forEach(x => {
      const row = document.createElement('div'); row.className = 'dr-pj-row';
      const t = document.createElement('span'); t.textContent = (nm[x.g.r] || x.g.r) + ': ' + x.g.t;
      const y = document.createElement('button'); y.type = 'button'; y.className = 'dr-yes'; y.textContent = '✓'; y.setAttribute('aria-label', 'صح');
      const n = document.createElement('button'); n.type = 'button'; n.className = 'dr-no'; n.textContent = '✗'; n.setAttribute('aria-label', 'غلط');
      y.addEventListener('click', () => verdictParty(x.i, true)); n.addEventListener('click', () => verdictParty(x.i, false));
      row.append(t, y, n); pj.appendChild(row);
    });
    const w = $('wrong'); w.textContent = '';
    q.filter(g => g.v === 0).forEach(g => { const e = document.createElement('span'); e.textContent = (nm[g.r] || g.r) + ': ' + g.t; w.appendChild(e); });
    const veil = $('veil');
    veil.classList.toggle('hidden', !(playing && !drawer && !hasInk)); veil.textContent = 'الرسّام لسه ما بدأش الرسم...';
    if (!playing) $('idea').classList.add('hidden');
    $('result').classList.toggle('hidden', s.phase !== 'result');
    $('endBox').classList.toggle('hidden', s.phase !== 'end');
    if (s.phase === 'result') {
      $('nextBtn').disabled = false;
      $('resTitle').textContent = '';
      const sp = document.createElement('span'); sp.className = s.win ? 'win' : '';
      sp.textContent = s.win ? (s.winner === role ? 'صح! خمّنت اللاعب' : drawer ? (nm[s.winner] || s.winner) + ' عرف رسمتك' : (nm[s.winner] || s.winner) + ' عرف اللاعب') : 'ماحدش عرف في الوقت';
      $('resTitle').appendChild(sp);
      $('resText').textContent = s.win ? 'الإجابة: ' + (s.guessText || '') + (role === s.winner ? ' • +' + WIN + ' نقطة ليك' : drawer ? ' • +' + DRAW_PTS + ' نقطة ليك' : '') : 'مفيش نقط الجولة دي.';
      if (s.win) award(s);
    }
    if (s.phase === 'end') {
      const rank = order.slice().sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
      $('endText').textContent = (rank[0] === role ? 'كسبت! ' : 'الفايز: ' + (nm[rank[0]] || rank[0]) + '. ') + rank.map(r => (nm[r] || r) + ' ' + (scores[r] || 0)).join(' • ');
      $('againBtn').textContent = 'غرفة جديدة';
    }
  }

  /* ---------- النقاط (محليًا زي باقي الألعاب) ---------- */
  function addPoints(pts) {
    try {
      const day = new Date().toISOString().slice(0, 10), d = JSON.parse(localStorage.getItem(DAILY_KEY) || '{}');
      const used = d.day === day ? Number(d.pts) || 0 : 0;
      const ok = Math.max(0, Math.min(pts, DAILY_CAP - used)); if (!ok) return 0;
      localStorage.setItem(DAILY_KEY, JSON.stringify({ day, pts: used + ok }));
      const st = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      st.totalPoints = (Number(st.totalPoints) || 0) + ok; st.bestScore = Math.max(Number(st.bestScore) || 0, ok);
      localStorage.setItem(STATS_KEY, JSON.stringify(st));
      window.dispatchEvent(new StorageEvent('storage', { key: STATS_KEY }));
      if (window.KoraStreak) window.KoraStreak.touch();
      return ok;
    } catch (e) { return 0; }
  }
  function award(s) {
    const key = code + ':' + s.n; if (pointsGiven[key]) return; pointsGiven[key] = true;
    try {
      const paid = JSON.parse(localStorage.getItem(PAID_KEY) || '[]'); if (paid.indexOf(key) > -1) return;
      paid.push(key); localStorage.setItem(PAID_KEY, JSON.stringify(paid.slice(-80)));
    } catch (e) { /* ignore */ }
    addPoints(mode === 'party' ? (role === s.winner ? WIN : role === s.drawer ? DRAW_PTS : 0) : (role === other(s.drawer) ? WIN : DRAW_PTS));
  }

  /* ---------- العرض ---------- */
  function render(v) {
    if (v && mode === 'party') return renderParty(v);
    if (!v) { if (code) { toast('الغرفة اتقفلت'); leave(); } return; }
    last = v; const s = v.state || {}, pl = v.players || {}, pres = v.presence || {};
    if (s.phase === 'lobby') {
      show('waiting');
      const both = !!(pl.A && pl.B);
      $('presLine').textContent = both ? 'الاتنين موجودين، جاهزين!' : 'مستني اللاعب التاني...';
      $('startBtn').disabled = !(both && role === 'A'); $('startBtn').textContent = role === 'A' ? 'ابدأ اللعب' : 'مستني صاحب الغرفة يبدأ';
      return;
    }
    show('game');
    if (strokeN !== s.n) attachStrokes(s.n);
    const drawer = s.drawer === role, mineS = (s.scores || {})[role] || 0, opS = (s.scores || {})[other(role)] || 0;
    $('myScore').textContent = mineS; $('opScore').textContent = opS;
    $('rndPill').textContent = 'الجولة ' + Math.min(s.n + 1, ROUNDS) + ' من ' + ROUNDS;
    const playing = s.phase === 'draw';
    $('roleLine').innerHTML = ''; const rl = $('roleLine');
    rl.append(document.createTextNode(drawer ? 'إنت الرسّام: ارسم لاعب كورة' : 'إنت المخمّن: خمّن اسم اللاعب اللي الخصم بيرسمه'));
    $('board').parentNode.classList.toggle('ro', !(playing && drawer));
    $('tools').classList.toggle('hidden', !(playing && drawer));
    $('guessForm').classList.toggle('hidden', !(playing && !drawer));
    const pend = s.pending || '';
    $('judge').classList.toggle('hidden', !(playing && drawer && pend)); $('judgeText').textContent = pend;
    $('guessInput').disabled = $('guessBtn').disabled = !!pend; if (pend && !drawer) $('guessInput').placeholder = 'مستني حكم الرسّام...'; else $('guessInput').placeholder = 'اكتب اسم اللاعب... (' + (MAX_GUESS - (s.guesses || 0)) + ' محاولات باقية)';
    const w = $('wrong'); w.textContent = ''; (s.wrong || []).forEach(t => { const x = document.createElement('span'); x.textContent = t; w.appendChild(x); });
    const veil = $('veil');
    veil.classList.toggle('hidden', !(playing && !drawer && !hasInk));
    veil.textContent = 'الرسّام لسه ما بدأش الرسم...';
    if (!playing) $('idea').classList.add('hidden');
    $('result').classList.toggle('hidden', s.phase !== 'result');
    $('endBox').classList.toggle('hidden', s.phase !== 'end');
    if (s.phase === 'result') {
      $('nextBtn').disabled = false;
      const gname = s.drawer === 'A' ? 'B' : 'A', iWon = s.win && role === gname;
      $('resTitle').innerHTML = ''; const sp = document.createElement('span'); sp.className = s.win ? 'win' : ''; sp.textContent = s.win ? (iWon ? 'صح! خمّنت اللاعب' : drawer ? 'خصمك عرف رسمتك' : 'الخصم عرف') : 'ماحدش عرف في الوقت'; $('resTitle').appendChild(sp);
      $('resText').textContent = s.win ? (s.guessText ? 'الإجابة: ' + s.guessText + ' • ' : '') + (role === gname ? '+' + WIN : '+' + DRAW_PTS) + ' نقطة ليك' : 'مفيش نقط الجولة دي.';
      if (s.win) award(s);
    }
    if (s.phase === 'end') {
      const a = (s.scores || {}).A || 0, b = (s.scores || {}).B || 0, me = role === 'A' ? a : b, op = role === 'A' ? b : a;
      $('endText').textContent = (me > op ? 'كسبت!' : me < op ? 'الخصم كسب' : 'تعادل') + ' • إنت ' + me + ' / الخصم ' + op;
      $('againBtn').textContent = 'غرفة جديدة';
    }
  }

  /* ---------- اللوحة ---------- */
  let hasInk = false, color = COLORS[0], size = SIZES[1], eraser = false, ctx = null, drawing = false, pts = [], lastFlush = 0, prevPt = null;
  function buildTools() {
    const cb = $('colors'), sb = $('sizes');
    COLORS.forEach((c, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'dr-sw' + (i === 0 ? ' on' : ''); b.style.background = c; b.setAttribute('aria-label', 'لون ' + (i + 1));
      b.addEventListener('click', () => { color = c; eraser = false; $('eraser').classList.remove('on'); cb.querySelectorAll('.dr-sw').forEach(x => x.classList.toggle('on', x === b)); }); cb.appendChild(b); });
    SIZES.forEach((z, i) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'dr-sz' + (i === 1 ? ' on' : ''); const d = document.createElement('i'); d.style.width = d.style.height = (z + 2) + 'px'; b.appendChild(d); b.setAttribute('aria-label', 'حجم ' + (i + 1));
      b.addEventListener('click', () => { size = z; sb.querySelectorAll('.dr-sz').forEach(x => x.classList.toggle('on', x === b)); }); sb.appendChild(b); });
    $('eraser').addEventListener('click', () => { eraser = !eraser; $('eraser').classList.toggle('on', eraser); });
    $('clearBtn').addEventListener('click', () => { if (!strokeRef) return; clearBoard(); mine.add(pushStroke({ clr: true })); });
    $('ideaBtn').addEventListener('click', () => { const n = nextIdea(); const i = $('idea'); i.textContent = 'فكرة للرسم: '; const b = document.createElement('b'); b.textContent = n; i.appendChild(b); i.classList.remove('hidden'); });
  }
  function clearBoard() { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 800, 600); hasInk = false; $('veil').classList.remove('hidden'); }
  function setupCanvas() {
    const cv = $('board'); ctx = cv.getContext('2d'); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; clearBoard();
    const pos = e => { const r = cv.getBoundingClientRect(); return [Math.max(0, Math.min(800, Math.round((e.clientX - r.left) * 800 / r.width))), Math.max(0, Math.min(600, Math.round((e.clientY - r.top) * 600 / r.height)))]; };
    const canDraw = () => last && last.state && last.state.phase === 'draw' && last.state.drawer === role;
    cv.addEventListener('pointerdown', e => { if (!canDraw()) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } drawing = true; prevPt = pos(e); pts = [prevPt]; lastFlush = Date.now(); seg([prevPt, prevPt], eraser ? '#ffffff' : color, eraser ? size * 2 : size); });
    cv.addEventListener('pointermove', e => {
      if (!drawing) return; e.preventDefault(); const p = pos(e); if (p[0] === prevPt[0] && p[1] === prevPt[1]) return;
      seg([prevPt, p], eraser ? '#ffffff' : color, eraser ? size * 2 : size); prevPt = p; pts.push(p);
      if (pts.length >= 14 || Date.now() - lastFlush > 140) flush();
    });
    const end = () => { if (drawing) { drawing = false; flush(); } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  }
  function seg(p, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.stroke(); hasInk = true; $('veil').classList.add('hidden'); }
  function pushStroke(o) { const r = strokeRef.push(); r.set(o).catch(() => {}); return r.key; }
  function flush() {
    if (!strokeRef || pts.length < 1) return;
    const p = pts.length === 1 ? [pts[0], pts[0]] : pts, str = p.map(q => q[0] + ',' + q[1]).join(';');
    if (str.length <= 900) mine.add(pushStroke({ c: eraser ? '#ffffff' : color, w: eraser ? size * 2 : size, p: str }));
    pts = [pts[pts.length - 1]]; lastFlush = Date.now();
  }
  function attachStrokes(n) {
    if (strokeRef) strokeRef.off();
    strokeN = n; strokeRef = ref.child('strokes/' + n); clearBoard();
    strokeRef.on('child_added', snap => {
      if (mine.has(snap.key)) return; const o = snap.val(); if (!o) return;
      if (o.clr === true) { clearBoard(); return; }
      if (typeof o.p !== 'string' || !/^#[0-9a-f]{6}$/i.test(o.c || '') || !(o.w >= 1 && o.w <= 40)) return;
      const p = o.p.split(';').slice(0, 60).map(s => s.split(',').map(Number)).filter(q => q.length === 2 && isFinite(q[0]) && isFinite(q[1]));
      if (p.length) seg(p, o.c, o.w);
    });
  }

  boot();
})();
