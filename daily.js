/* Kora Challenge — تحدي اليوم: 3 أسئلة معلومات عامة عن الكورة، نفسها لكل الناس في اليوم */
(() => {
  'use strict';

  const QS = window.KoraDailyData.QUESTIONS;
  const STATS_KEY = 'koraChallengeStats';
  const DAILY_KEY = 'koraDaily';
  const COUNT = 3, PTS = 10, ALL_BONUS = 10, STREAK_PER_DAY = 2, STREAK_MAX = 20;

  const $ = id => document.getElementById(id);
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const dateKey = () => (window.KoraStreak ? window.KoraStreak.dateKey() : new Date().toISOString().slice(0, 10));

  // مولّد عشوائي ثابت بالتاريخ: نفس الأسئلة ونفس ترتيب الإجابات لكل الناس
  function rng(seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function seededShuffle(arr, rand) { arr = arr.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  const today = dateKey();
  // دورة كاملة على كل الأسئلة من غير تكرار: اليوم رقم N يختار الشريحة N من ترتيب ثابت
  const dayNo = window.KoraStreak ? window.KoraStreak.dayNumber(today) : Math.floor(Date.now() / 86400000);
  const perCycle = Math.floor(QS.length / COUNT);
  const cycle = Math.floor(dayNo / perCycle);
  const order = seededShuffle(QS.map((_, i) => i), rng('cycle-' + cycle));
  const slot = ((dayNo % perCycle) + perCycle) % perCycle;
  const todays = order.slice(slot * COUNT, slot * COUNT + COUNT).map((qi, n) => {
    const q = QS[qi];
    const opts = seededShuffle(q.slice(1), rng(today + '-' + qi));
    return { q: q[0], opts, answer: q[1] };
  });

  let state;
  try { const d = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null'); state = d && d.date === today && Array.isArray(d.picks) ? d : null; } catch (e) { state = null; }
  if (!state) state = { date: today, picks: [], done: false, pts: 0 };
  const save = () => { try { localStorage.setItem(DAILY_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };

  function toast(t) {
    const x = $('toast'); if (!x) return;
    x.textContent = t; x.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => x.classList.remove('show'), 2400);
  }

  function show(id) { ['gameScreen', 'resultScreen'].forEach(k => $(k).classList.toggle('active', k === id)); }

  /* ---------- الأسئلة ---------- */
  function render() {
    const i = state.picks.length;
    if (i >= COUNT) return finish();
    const t = todays[i];
    $('questionCount').textContent = 'السؤال ' + (i + 1) + ' من ' + COUNT;
    $('scoreNow').textContent = 'النقاط: ' + score();
    $('progressBar').style.width = (i / COUNT * 100) + '%';
    $('dq').textContent = t.q;
    const box = $('dOpts');
    box.textContent = '';
    $('dNext').hidden = true;
    t.opts.forEach(o => {
      const b = el('button', 'dq-opt', o);
      b.type = 'button';
      b.addEventListener('click', () => pick(o, b));
      box.appendChild(b);
    });
    show('gameScreen');
  }

  const score = () => state.picks.reduce((s, p, i) => s + (p === todays[i].answer ? PTS : 0), 0);

  function pick(o, btn) {
    const i = state.picks.length;
    const t = todays[i];
    state.picks.push(o);
    save();
    document.querySelectorAll('.dq-opt').forEach(b => {
      b.disabled = true;
      if (b.textContent === t.answer) b.classList.add('ok');
    });
    if (o !== t.answer) btn.classList.add('bad');
    $('scoreNow').textContent = 'النقاط: ' + score();
    const nx = $('dNext');
    nx.textContent = state.picks.length >= COUNT ? 'شوف النتيجة' : 'السؤال الجاي';
    nx.hidden = false;
    nx.focus();
  }
  $('dNext').addEventListener('click', render);

  /* ---------- النهاية ---------- */
  function saveStats(pts) {
    try {
      const st = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      st.gamesPlayed = (Number(st.gamesPlayed) || 0) + 1;
      st.bestScore = Math.max(Number(st.bestScore) || 0, pts);
      st.totalPoints = (Number(st.totalPoints) || 0) + pts;
      localStorage.setItem(STATS_KEY, JSON.stringify(st));
      window.dispatchEvent(new StorageEvent('storage', { key: STATS_KEY }));
    } catch (e) { /* ignore */ }
  }

  function finish() {
    const right = state.picks.filter((p, i) => p === todays[i].answer).length;
    if (!state.done) {
      const st = window.KoraStreak ? window.KoraStreak.touch() : { days: 0 };
      let pts = right * PTS;
      let bonus = 0;
      if (right === COUNT) pts += ALL_BONUS;
      if (right > 0) bonus = Math.min(st.days * STREAK_PER_DAY, STREAK_MAX);
      pts += bonus;
      state.done = true; state.pts = pts; state.bonus = bonus; state.right = right;
      save();
      saveStats(pts);
    }
    $('rTitle').textContent = state.right === COUNT ? 'كله صح!' : state.right > 0 ? 'كويس!' : 'مش النهارده';
    $('finalScore').textContent = state.pts;
    $('rComment').textContent = 'جاوبت ' + state.right + ' من ' + COUNT;
    const streak = window.KoraStreak ? window.KoraStreak.get().days : 0;
    $('rDetails').textContent = (state.bonus ? 'مكافأة السلسلة +' + state.bonus + ' • ' : '') + 'سلسلتك: ' + streak + ' يوم';
    const rv = $('review');
    rv.textContent = '';
    todays.forEach((t, i) => {
      const ok = state.picks[i] === t.answer;
      const row = el('div', 'hint-item dq-review ' + (ok ? 'ok' : 'bad'));
      row.append(el('b', '', t.q), el('div', '', (ok ? 'إجابتك صح: ' : 'الصح: ') + t.answer));
      rv.appendChild(row);
    });
    $('progressBar').style.width = '100%';
    show('resultScreen');
  }

  $('shareBtn').addEventListener('click', () => {
    const text = 'Kora Challenge — تحدي اليوم ' + state.date + '\nجاوبت ' + state.right + ' من ' + COUNT + ' • سلسلتي ' + (window.KoraStreak ? window.KoraStreak.get().days : 0) + ' يوم\n' + location.origin + location.pathname;
    if (navigator.share) { navigator.share({ text }).catch(() => {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast('اتنسخت، ابعتها لصحابك'), () => toast('مقدرتش أنسخ'));
  });

  if (state.picks.length >= COUNT) finish(); else render();
})();
