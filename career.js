/* Kora Challenge — خمن اللاعب بالمسيرة + تحدي اليوم
   الصفحة بتحدد الوضع من body[data-mode] */
(() => {
  'use strict';

  const CD = window.KoraCareerData, GD = window.KoraGridData;
  const mode = 'career';
  const STATS_KEY = 'koraChallengeStats';
  
  /* ====== إعدادات النقاط والتلميحات (غيّرها هنا لو عايز تطابق لعبة المعلومات) ====== */
  const LEVELS = {
    easy:   { label: 'المستوى السهل',   rounds: 10, base: 10, step: 2 },
    medium: { label: 'المستوى المتوسط', rounds: 10, base: 15, step: 3 }
  };
  const MAX_WRONG = 3;           // محاولات غلط في السؤال الواحد (وضع المسيرة)
  const HINTS = ['nat', 'pos', 'age', 'status'];

  const $ = id => document.getElementById(id);
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const norm = s => GD ? GD.norm(s) : String(s || '').toLowerCase().trim();
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ====== مجموعة الأسماء للاقتراحات (كل اللاعبين مش بس اللي في الجولة) ====== */
  const pool = [];
  (function () {
    const seen = new Set();
    CD.PLAYERS.concat(GD ? GD.PLAYERS : []).forEach(p => {
      const k = norm(p.en);
      if (seen.has(k)) return;
      seen.add(k);
      pool.push({ en: p.en, ar: p.ar, key: norm(p.en) + ' ' + norm(p.ar), k });
    });
  })();

  /* ====== الحالة ====== */
  let queue = [], qi = 0, cur = null, hints = 0, wrong = 0, correct = 0, points = 0, level = 'easy';
  let picked = null, sug = [], over = false, inRound = false, nextTimer = null;

  const screens = { level: $('levelScreen'), game: $('gameScreen'), result: $('resultScreen') };
  function show(n) { Object.keys(screens).forEach(k => screens[k] && screens[k].classList.toggle('active', k === n)); }

  function msg(text, type) {
    const m = $('message');
    m.textContent = text || '';
    m.className = 'message' + (type ? ' ' + type : '');
  }

  function toast(t) {
    const x = $('toast'); if (!x) return;
    x.textContent = t; x.classList.add('show');
    clearTimeout(toast.t); toast.t = setTimeout(() => x.classList.remove('show'), 2400);
  }

  /* ====== التخزين ====== */
  function readStats() { try { return JSON.parse(localStorage.getItem(STATS_KEY) || '{}'); } catch (e) { return {}; } }

  function saveStats(pts) {
    try {
      const st = readStats();
      st.gamesPlayed = (Number(st.gamesPlayed) || 0) + 1;
      st.bestScore = Math.max(Number(st.bestScore) || 0, pts); // أفضل نتيجة = أعلى نقاط في جولة
      st.totalPoints = (Number(st.totalPoints) || 0) + pts;
      localStorage.setItem(STATS_KEY, JSON.stringify(st));
      window.dispatchEvent(new StorageEvent('storage', { key: STATS_KEY }));
    } catch (e) { /* ignore */ }
  }

  function renderLevelStats() {
    const st = readStats();
    if ($('bestScore')) $('bestScore').textContent = (st.bestScore || 0);
    if ($('totalPoints')) $('totalPoints').textContent = st.totalPoints || 0;
    if ($('roundsPlayed')) $('roundsPlayed').textContent = st.gamesPlayed || 0;
  }

  /* ====== عرض السؤال ====== */
  function age(p) { return new Date().getFullYear() - p.born; }
  function factText(k, p) {
    return k === 'nat' ? p.nat : k === 'pos' ? p.pos : k === 'age' ? age(p) + ' سنة' : (p.active ? 'نشط' : 'معتزل');
  }
  const FACT_IDS = { nat: 'nationality', pos: 'position', age: 'age', status: 'status' };
  const FACT_LABEL = { nat: 'الجنسية', pos: 'المركز', age: 'العمر', status: 'الحالة' };

  /* شعارات الأندية (football-data.org). الأندية اللي مالهاش رقم هنا بتظهر بحرف أول بدل الشعار.
     عشان تضيف نادي: 'اسم النادي زي ما هو في career-data.js': رقم الشعار */
  const CREST = {
    'ريال مدريد': 86, 'برشلونة': 81, 'أتلتيكو مدريد': 78, 'باريس سان جيرمان': 524, 'بايرن ميونخ': 5,
    'بوروسيا دورتموند': 4, 'يوفنتوس': 109, 'ميلان': 98, 'إنتر ميلان': 108, 'نابولي': 113, 'روما': 100,
    'مانشستر يونايتد': 66, 'مانشستر سيتي': 65, 'تشيلسي': 61, 'ليفربول': 64, 'أرسنال': 57, 'توتنهام': 73,
    'أياكس': 678, 'بورتو': 503, 'بنفيكا': 1903, 'فولفسبورج': 11, 'موناكو': 548, 'فالنسيا': 95, 'إشبيلية': 559,
    'نيوكاسل': 67, 'إيفرتون': 62, 'وست هام': 563, 'باير ليفركوزن': 3, 'شالكه': 6, 'ليستر سيتي': 338,
    'سبورتينج لشبونة': 498, 'بي إس في': 674, 'فاينورد': 675, 'مارسيليا': 516, 'ليون': 523, 'ليل': 521,
    'نيس': 522, 'فيورنتينا': 99, 'لاتسيو': 110, 'بارما': 112, 'جنوى': 107, 'فولهام': 63,
    'ساوثهامبتون': 340, 'فيردر بريمن': 12, 'ريال سوسيداد': 92
  };

  function clubChip(name, num, year) {
    const chip = el('span', 'cr-club');
    if (num) chip.appendChild(el('small', '', String(num)));
    const logo = el('span', 'cr-logo');
    if (CREST[name]) {
      const img = document.createElement('img');
      img.src = 'https://crests.football-data.org/' + CREST[name] + '.png';
      img.alt = ''; img.loading = 'lazy';
      img.addEventListener('error', () => { img.remove(); logo.textContent = Array.from(name)[0]; logo.classList.add('fb'); });
      logo.appendChild(img);
    } else { logo.textContent = Array.from(name)[0]; logo.classList.add('fb'); }
    const txt = el('span', 'cr-txt');
    txt.appendChild(el('span', 'cr-name', name));
    if (year) txt.appendChild(el('span', 'cr-year', String(year)));
    chip.append(logo, txt);
    return chip;
  }

  function renderPath(p) {
    const box = $('careerPath');
    box.textContent = '';
    p.clubs.forEach((c, i) => {
      if (i) box.appendChild(el('span', 'cr-arrow', '←'));
      box.appendChild(clubChip(c, i + 1, p.years && p.years[i]));
    });
  }

  function renderQuestion() {
    over = false; hints = 0; wrong = 0; picked = null;
    cur = queue[qi];
    renderPath(cur);
    HINTS.forEach(k => { $(FACT_IDS[k]).textContent = '؟؟؟'; });
    $('hintList').textContent = '';
    $('answerInput').value = '';
    $('answerInput').disabled = false;
    $('submitBtn').disabled = false;
    $('hintBtn').disabled = false;
    $('giveUpBtn').disabled = false;
    closeSug();
    msg('');
    updateTop();
    $('answerInput').focus();
  }

  function potential() {
    const c = LEVELS[level];
    return Math.max(1, c.base - hints * c.step);
  }

  function updateTop() {
    $('hintsCount').textContent = 'استخدمت ' + hints + ' من ' + HINTS.length;
    $('hintBtn').disabled = over || hints >= HINTS.length;
    $('questionCount').textContent = 'السؤال ' + (qi + 1) + ' من ' + queue.length;
    $('scoreNow').textContent = 'النقاط: ' + points;
    $('progressBar').style.width = (qi / queue.length * 100) + '%';
  }

  function showHint() {
    if (over || hints >= HINTS.length) return;
    const k = HINTS[hints];
    $(FACT_IDS[k]).textContent = factText(k, cur);
    $('hintList').appendChild(el('div', 'hint-item', FACT_LABEL[k] + ': ' + factText(k, cur)));
    hints++;
    updateTop();
  }

  /* ====== الاقتراحات ====== */
  const sugEl = $('suggestions');
  function closeSug() { sugEl.hidden = true; sugEl.textContent = ''; sug = []; }

  $('answerInput').addEventListener('input', () => {
    picked = null;
    const q = norm($('answerInput').value);
    if (q.length < 2) { closeSug(); return; }
    sug = pool.filter(p => p.key.indexOf(q) > -1).slice(0, 6);
    sugEl.textContent = '';
    if (!sug.length) { closeSug(); return; }
    sug.forEach(p => {
      const b = el('button', '', p.ar);
      b.type = 'button';
      b.addEventListener('mousedown', e => { e.preventDefault(); picked = p; $('answerInput').value = p.ar; closeSug(); });
      sugEl.appendChild(b);
    });
    sugEl.hidden = false;
  });
  $('answerInput').addEventListener('blur', () => setTimeout(closeSug, 120));
  $('answerInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });

  /* ====== الإجابة ====== */
  function resolvePick() {
    if (picked) return picked;
    const q = norm($('answerInput').value);
    if (!q) return null;
    return pool.find(p => norm(p.ar) === q || p.k === q) || null;
  }

  function submit() {
    if (over || !cur) return;
    const p = resolvePick();
    if (!p) { msg('اختار الاسم من الاقتراحات الأول', 'info'); return; }
    if (p.k === norm(cur.en)) { win(); return; }
    wrong++;
    updateTop();
    const max = MAX_WRONG;
    $('answerInput').value = ''; picked = null;
    if (wrong >= max) { lose('خلصت محاولاتك'); return; }
    msg('مش هو! جرب تاني (' + (max - wrong) + ' محاولات باقية)', 'error');
  }

  function lockQuestion() {
    over = true;
    $('answerInput').disabled = true; $('submitBtn').disabled = true;
    $('hintBtn').disabled = true; $('giveUpBtn').disabled = true;
    closeSug();
  }

  function win() {
    const gain = potential();
    lockQuestion();
    points += gain; correct++;
    msg('صح! ' + cur.ar + ' (+' + gain + ')', 'success');
    updateTop();
    nextTimer = setTimeout(next, 1400);
  }

  function lose(why) {
    lockQuestion();
    msg((why ? why + '. ' : '') + 'الإجابة: ' + cur.ar, 'error');
    nextTimer = setTimeout(next, 2200);
  }

  function next() {
    qi++;
    if (qi >= queue.length) finishCareer(); else renderQuestion();
  }

  /* ====== نهاية وضع المسيرة ====== */
  function finishCareer() {
    inRound = false;
    const pct = correct / queue.length * 100;
    const before = window.KoraUnlocks ? window.KoraUnlocks.getLifetime() : 0;
    saveStats(points);
    if (window.KoraStreak) window.KoraStreak.touch();
    $('finalScore').textContent = points;
    $('resultTitle').textContent = 'خلصت الجولة!';
    $('resultComment').textContent = pct >= 80 ? 'أسطورة! عارف كل المسيرات' : pct >= 50 ? 'حلو جدًا، كمّل' : 'جرب تاني وهتتحسن';
    $('resultDetails').textContent = 'جاوبت ' + correct + ' من ' + queue.length + ' • ' + LEVELS[level].label;
    renderUnlocked(before);
    show('result');
    renderLevelStats();
  }

  function renderUnlocked(before) {
    const box = $('unlockedList');
    if (!box) return;
    box.textContent = '';
    if (!window.KoraUnlocks) return;
    const labels = { modes: 'طور', titles: 'لقب', frames: 'إطار', avatars: 'أفاتار', themes: 'ثيم' };
    window.KoraUnlocks.unlockedBetween(before, window.KoraUnlocks.getLifetime())
      .forEach(g => box.appendChild(el('div', 'hint-item', 'اتفتح ' + labels[g.type] + ': ' + g.item.name)));
  }

  function startCareer() {
    const list = CD.PLAYERS.filter(p => p.level === level);
    queue = shuffle(list).slice(0, LEVELS[level].rounds);
    qi = 0; correct = 0; points = 0; inRound = true;
    $('levelName').textContent = LEVELS[level].label;
    show('game');
    renderQuestion();
  }

  /* ====== الأحداث ====== */
  $('hintBtn').addEventListener('click', showHint);
  $('submitBtn').addEventListener('click', submit);
  $('giveUpBtn').addEventListener('click', () => { if (!over) lose('استسلمت'); });
  const exitOpts = {
    title: 'تنسحب من الجولة؟',
    message: 'لو خرجت دلوقتي النقاط اللي جمعتها في الجولة دي مش هتتسجل.',
    okText: 'اخرج', cancelText: 'كمّل اللعب'
  };
  $('quitBtn').addEventListener('click', () => {
    window.KoraDialog.confirm(exitOpts).then(ok => { if (ok) { inRound = false; clearTimeout(nextTimer); show('level'); renderLevelStats(); } });
  });
  window.KoraDialog.guardLinks(() => inRound, exitOpts);

  document.querySelectorAll('.level[data-level]').forEach(b => {
    if (b.disabled) return;
    b.addEventListener('click', () => {
      level = b.dataset.level;
      document.querySelectorAll('.level').forEach(x => x.classList.toggle('active', x === b));
    });
  });
  $('startBtn').addEventListener('click', startCareer);
  $('againBtn').addEventListener('click', startCareer);
  $('levelsBtn').addEventListener('click', () => { show('level'); renderLevelStats(); });
  renderLevelStats();
  show('level');
})();
