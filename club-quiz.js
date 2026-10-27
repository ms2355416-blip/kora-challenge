/* Kora Challenge — اختبر معلوماتك عن فريقك المفضل */
(() => {
  'use strict';
  const Q = window.KoraClubQuiz, STATS_KEY = 'koraChallengeStats';
  const LOGOS = {
    'برشلونة': 'https://crests.football-data.org/81.png', 'ريال مدريد': 'https://crests.football-data.org/86.png',
    'ليفربول': 'https://crests.football-data.org/64.png', 'مانشستر سيتي': 'https://crests.football-data.org/65.png',
    'مانشستر يونايتد': 'https://crests.football-data.org/66.png', 'أرسنال': 'https://crests.football-data.org/57.png',
    'تشيلسي': 'https://crests.football-data.org/61.png', 'توتنهام': 'https://crests.football-data.org/73.png',
    'إيه سي ميلان': 'https://crests.football-data.org/98.png', 'إنتر ميلان': 'https://crests.football-data.org/108.png',
    'يوفنتوس': 'https://crests.football-data.org/109.png', 'بايرن ميونخ': 'https://crests.football-data.org/5.png',
    'بوروسيا دورتموند': 'https://crests.football-data.org/4.png', 'باريس سان جيرمان': 'https://crests.football-data.org/524.png',
    'أتلتيكو مدريد': 'https://crests.football-data.org/78.png', 'نابولي': 'https://crests.football-data.org/113.png',
    'الأهلي المصري': 'https://commons.wikimedia.org/wiki/Special:FilePath/Al_Ahly_SC_logo.svg',
    'الزمالك': 'https://commons.wikimedia.org/wiki/Special:FilePath/Zamalek_SC_logo.svg',
    'الهلال': 'https://commons.wikimedia.org/wiki/Special:FilePath/Al-Hilal_SFC_Logo.svg',
    'النصر': 'https://commons.wikimedia.org/wiki/Special:FilePath/Al-Nassr_FC_Logo.svg'
  };
  const $ = id => document.getElementById(id);
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const screens = { start: $('startScreen'), game: $('gameScreen'), result: $('resultScreen') };
  const show = n => Object.keys(screens).forEach(k => screens[k].classList.toggle('active', k === n));

  let club = null; try { club = localStorage.getItem('koraSelectedClub'); } catch (e) { /* ignore */ }
  let qs = [], qi = 0, points = 0, correct = 0, locked = false, inRound = false;

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
    $('bestScore').textContent = st.bestScore || 0; $('totalPoints').textContent = st.totalPoints || 0; $('roundsPlayed').textContent = st.gamesPlayed || 0;
  }
  function clubChip(box) {
    box.textContent = '';
    if (!club) return;
    const w = el('span', 'cq-logo'), fb = () => { w.textContent = Array.from(club)[0]; w.classList.add('fb'); };
    if (LOGOS[club]) { const i = document.createElement('img'); i.alt = ''; i.src = LOGOS[club]; i.addEventListener('error', () => { i.remove(); fb(); }); w.appendChild(i); } else fb();
    box.append(w, el('b', '', club));
  }

  function render() {
    const q = qs[qi]; locked = false;
    $('qCount').textContent = 'سؤال ' + (qi + 1) + ' من ' + qs.length;
    $('correctNow').textContent = 'صح: ' + correct; $('scoreNow').textContent = points + ' نقطة';
    $('progressBar').style.width = (qi / qs.length * 100) + '%';
    $('qText').textContent = q.q;
    const box = $('opts'); box.textContent = '';
    q.opts.forEach((o, i) => {
      const b = el('button', 'cq-opt', o); b.type = 'button';
      b.addEventListener('click', () => pick(i));
      box.appendChild(b);
    });
    $('message').textContent = ''; $('message').className = 'message';
    $('nextBtn').hidden = true;
  }

  function pick(i) {
    if (locked) return; locked = true;
    const q = qs[qi], btns = $('opts').children;
    Array.from(btns).forEach((b, k) => { b.disabled = true; if (k === q.ans) b.classList.add('ok'); else if (k === i) b.classList.add('bad'); });
    if (i === q.ans) { correct++; points += Q.POINTS[q.lv]; $('message').textContent = 'صح! +' + Q.POINTS[q.lv] + ' نقطة'; $('message').className = 'message ok'; }
    else { $('message').textContent = 'غلط. الإجابة الصح: ' + q.right; $('message').className = 'message bad'; }
    $('scoreNow').textContent = points + ' نقطة'; $('correctNow').textContent = 'صح: ' + correct;
    $('progressBar').style.width = ((qi + 1) / qs.length * 100) + '%';
    $('nextBtn').textContent = qi + 1 >= qs.length ? 'شوف النتيجة' : 'التالي'; $('nextBtn').hidden = false; $('nextBtn').focus();
  }

  function finish() {
    inRound = false; saveStats(points);
    if (window.KoraStreak) window.KoraStreak.touch();
    clubChip($('cqClub2'));
    $('finalScore').textContent = points;
    $('resultComment').textContent = correct >= 18 ? 'مشجع أسطورة! عارف كل حاجة عن ناديك' : correct >= 13 ? 'مشجع شاطر جدًا' : correct >= 8 ? 'مش وحش، لسه فيه معلومات تتعلمها' : 'محتاج تذاكر تاريخ ناديك أكتر';
    $('resultDetails').textContent = 'جاوبت ' + correct + ' من ' + qs.length + ' صح';
    show('result'); renderStats();
  }

  function start() {
    qs = Q.build(club); if (!qs) return;
    qi = 0; points = 0; correct = 0; inRound = true;
    $('cqTitle').textContent = 'اختبار ' + club;
    show('game'); render();
  }

  $('nextBtn').addEventListener('click', () => { qi++; if (qi >= qs.length) finish(); else render(); });
  const exitOpts = { title: 'تنسحب من الاختبار؟', message: 'لو خرجت دلوقتي النقاط اللي جمعتها مش هتتسجل.', okText: 'اخرج', cancelText: 'كمّل' };
  $('quitBtn').addEventListener('click', () => { window.KoraDialog.confirm(exitOpts).then(ok => { if (ok) { inRound = false; show('start'); renderStats(); } }); });
  window.KoraDialog.guardLinks(() => inRound, exitOpts);
  $('startBtn').addEventListener('click', start);
  $('againBtn').addEventListener('click', start);

  clubChip($('cqClub'));
  if (!club) { $('cqNote').textContent = 'لسه ماختارتش ناديك. اختاره من الرئيسية الأول.'; $('startBtn').hidden = true; }
  else if (!Q.get(club)) { $('cqNote').textContent = 'أسئلة ' + club + ' لسه مضافتش.'; $('startBtn').hidden = true; }
  else $('cqNote').textContent = '20 سؤال: 5 سهلة و10 متوسطة و5 صعبة، بالترتيب العشوائي.';
  renderStats(); show('start');
})();
