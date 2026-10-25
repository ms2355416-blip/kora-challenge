/* Kora Challenge — خمن المنتخب */
(() => {
  'use strict';
  const T = window.KoraCountryData.TEAMS;
  const STATS_KEY = 'koraChallengeStats';
  const ROUNDS = 8, PTS = 10, MAX_WRONG = 3;

  const CREST = {
    'ريال مدريد': 86, 'برشلونة': 81, 'أتلتيكو مدريد': 78, 'باريس سان جيرمان': 524, 'بايرن ميونخ': 5,
    'بوروسيا دورتموند': 4, 'يوفنتوس': 109, 'ميلان': 98, 'إنتر ميلان': 108, 'نابولي': 113, 'روما': 100,
    'مانشستر يونايتد': 66, 'مانشستر سيتي': 65, 'تشيلسي': 61, 'ليفربول': 64, 'أرسنال': 57, 'توتنهام': 73,
    'أياكس': 678, 'بورتو': 503, 'بنفيكا': 1903, 'فولفسبورج': 11, 'موناكو': 548, 'فالنسيا': 95, 'إشبيلية': 559,
    'نيوكاسل': 67, 'إيفرتون': 62, 'وست هام': 563, 'باير ليفركوزن': 3, 'شالكه': 6, 'ليستر سيتي': 338,
    'سبورتينج لشبونة': 498, 'بي إس في': 674, 'فاينورد': 675, 'مارسيليا': 516, 'ليون': 523, 'ليل': 521,
    'نيس': 522, 'فيورنتينا': 99, 'لاتسيو': 110, 'بارما': 112, 'فولهام': 63, 'ريال سوسيداد': 92,
    'أستون فيلا': 58, 'برايتون': 397, 'أتلانتا': 102, 'وولفرهامبتون': 76, 'ليدز': 341, 'بروسيا مونشنجلادباخ': 18
  };

  const $ = id => document.getElementById(id);
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const norm = s => String(s || '').toLowerCase().replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/\s+/g, ' ').trim();
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const screens = { start: $('startScreen'), game: $('gameScreen'), result: $('resultScreen') };
  const show = n => Object.keys(screens).forEach(k => screens[k].classList.toggle('active', k === n));

  let queue = [], qi = 0, correct = 0, points = 0, wrong = 0, hints = 0, over = false, inRound = false, cur = null, picked = null;

  function readStats() { try { return JSON.parse(localStorage.getItem(STATS_KEY) || '{}'); } catch (e) { return {}; } }
  function saveStats(pts) {
    try {
      const st = readStats();
      st.gamesPlayed = (Number(st.gamesPlayed) || 0) + 1;
      st.bestScore = Math.max(Number(st.bestScore) || 0, pts);
      st.totalPoints = (Number(st.totalPoints) || 0) + pts;
      localStorage.setItem(STATS_KEY, JSON.stringify(st));
      window.dispatchEvent(new StorageEvent('storage', { key: STATS_KEY }));
    } catch (e) { /* ignore */ }
  }
  function renderStats() {
    const st = readStats();
    $('bestScore').textContent = st.bestScore || 0;
    $('totalPoints').textContent = st.totalPoints || 0;
    $('roundsPlayed').textContent = st.gamesPlayed || 0;
  }

  function msg(t, type) { const m = $('message'); m.textContent = t || ''; m.className = 'message' + (type ? ' ' + type : ''); }

  /* ====== الملعب ====== */
  function crest(name, big) {
    const w = el('span', 'cn-crest' + (big ? ' big' : ''));
    const fb = () => { w.textContent = Array.from(name)[0]; w.classList.add('fb'); };
    if (CREST[name]) {
      const img = document.createElement('img');
      img.alt = ''; img.loading = 'lazy';
      img.src = 'https://crests.football-data.org/' + CREST[name] + '.png';
      img.addEventListener('error', () => { img.remove(); fb(); });
      w.appendChild(img);
    } else fb();
    w.title = name;
    return w;
  }

  function renderPitch(t) {
    const p = $('pitch'); p.textContent = '';
    // ترتيب الأندية: حارس، ثم صفوف الدفاع→الهجوم
    const starts = []; let s = 1;
    t.form.forEach(n => { starts.push([s, n]); s += n; });
    starts.reverse().forEach(([st, n]) => {
      const row = el('div', 'cn-row');
      for (let i = 0; i < n; i++) row.appendChild(crest(t.c[st + i]));
      p.appendChild(row);
    });
    const gk = el('div', 'cn-row'); gk.appendChild(crest(t.c[0]));
    p.appendChild(gk);
  }

  /* ====== التلميحات ====== */
  function hintList(t) {
    return [
      ['القارة', t.conf],
      ['الفوز بكأس العالم', t.wc ? t.wc + (t.wc === 1 ? ' مرة' : t.wc === 2 ? ' مرتين' : ' مرات') : 'لسه ماكسبهاش'],
      ['لون القميص الأساسي', t.kit],
      ['عدد حروف الاسم', Array.from(t.n.replace(/\s/g, '')).length + ' حروف • أول حرف: ' + Array.from(t.n)[0]]
    ];
  }
  function showHint() {
    if (over) return;
    const hs = hintList(cur);
    if (hints >= hs.length) return;
    const h = hs[hints++];
    const it = el('div', 'hint-item'); it.append(el('b', '', h[0] + ': '), document.createTextNode(h[1]));
    $('hintList').appendChild(it);
    $('hintsCount').textContent = hints + ' من ' + hs.length;
    if (hints >= hs.length) $('hintBtn').disabled = true;
  }

  /* ====== السؤال ====== */
  function renderQuestion() {
    over = false; wrong = 0; hints = 0; picked = null;
    cur = queue[qi];
    renderPitch(cur);
    $('qCount').textContent = 'منتخب ' + (qi + 1) + ' من ' + queue.length;
    $('scoreNow').textContent = points + ' نقطة';
    $('triesLeft').textContent = 'المحاولات: ' + MAX_WRONG;
    $('progressBar').style.width = (qi / queue.length * 100) + '%';
    $('hintList').textContent = '';
    $('hintsCount').textContent = '0 من 4';
    $('hintBtn').disabled = false;
    $('answerInput').value = ''; $('answerInput').disabled = false;
    $('submitBtn').disabled = false; $('giveUpBtn').disabled = false;
    $('nextBtn').hidden = true;
    msg('');
    closeSug();
  }

  function reveal(ok, text) {
    over = true;
    $('answerInput').disabled = true; $('submitBtn').disabled = true; $('giveUpBtn').disabled = true; $('hintBtn').disabled = true;
    msg(text, ok ? 'ok' : 'bad');
    const f = document.createElement('img'); f.className = 'cn-flag'; f.alt = '';
    f.src = 'https://flagcdn.com/w80/' + cur.f + '.png';
    f.addEventListener('error', () => f.remove());
    $('message').prepend(f);
    $('scoreNow').textContent = points + ' نقطة';
    $('progressBar').style.width = ((qi + 1) / queue.length * 100) + '%';
    const nb = $('nextBtn');
    nb.textContent = qi + 1 >= queue.length ? 'شوف النتيجة' : 'التالي';
    nb.hidden = false;
    nb.focus();
  }

  function submit() {
    if (over) return;
    const v = norm($('answerInput').value);
    if (!v) { msg('اكتب اسم المنتخب الأول.', 'bad'); return; }
    if (v === norm(cur.n)) { points += PTS; correct++; reveal(true, 'صح! ' + cur.n + ' (+' + PTS + ' نقطة)'); return; }
    wrong++;
    const left = MAX_WRONG - wrong;
    $('triesLeft').textContent = 'المحاولات: ' + left;
    if (left <= 0) reveal(false, 'المحاولات خلصت. المنتخب هو ' + cur.n);
    else { msg('غلط، فاضل ' + left + ' محاولة.', 'bad'); $('answerInput').select(); }
  }

  /* ====== الاقتراحات ====== */
  const sugEl = $('suggestions');
  function closeSug() { sugEl.hidden = true; sugEl.textContent = ''; }
  $('answerInput').addEventListener('input', () => {
    const q = norm($('answerInput').value);
    if (!q) { closeSug(); return; }
    const m = T.filter(t => norm(t.n).indexOf(q) > -1).slice(0, 6);
    sugEl.textContent = '';
    if (!m.length) { closeSug(); return; }
    m.forEach(t => {
      const b = el('button', '', t.n); b.type = 'button';
      b.addEventListener('mousedown', e => { e.preventDefault(); $('answerInput').value = t.n; closeSug(); });
      sugEl.appendChild(b);
    });
    sugEl.hidden = false;
  });
  $('answerInput').addEventListener('blur', () => setTimeout(closeSug, 120));
  $('answerInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

  /* ====== نهاية الجولة ====== */
  function finish() {
    inRound = false;
    saveStats(points);
    if (window.KoraStreak) window.KoraStreak.touch();
    $('finalScore').textContent = points;
    $('resultComment').textContent = correct >= 7 ? 'أسطورة! بتعرف المنتخبات من أنديتها' : correct >= 4 ? 'حلو جدًا، كمّل' : 'جرب تاني وهتتحسن';
    $('resultDetails').textContent = 'جاوبت ' + correct + ' من ' + queue.length;
    show('result');
    renderStats();
  }

  function start() {
    queue = shuffle(T).slice(0, ROUNDS);
    qi = 0; correct = 0; points = 0; inRound = true;
    show('game');
    renderQuestion();
  }

  $('hintBtn').addEventListener('click', showHint);
  $('submitBtn').addEventListener('click', submit);
  $('giveUpBtn').addEventListener('click', () => { if (!over) reveal(false, 'استسلمت. المنتخب هو ' + cur.n); });
  $('nextBtn').addEventListener('click', () => { qi++; if (qi >= queue.length) finish(); else renderQuestion(); });
  const exitOpts = { title: 'تنسحب من الجولة؟', message: 'لو خرجت دلوقتي النقاط اللي جمعتها في الجولة دي مش هتتسجل.', okText: 'اخرج', cancelText: 'كمّل اللعب' };
  $('quitBtn').addEventListener('click', () => {
    window.KoraDialog.confirm(exitOpts).then(ok => { if (ok) { inRound = false; show('start'); renderStats(); } });
  });
  window.KoraDialog.guardLinks(() => inRound, exitOpts);
  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', start);
  renderStats();
  show('start');
})();
