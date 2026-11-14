/* Kora Challenge — كارير مود (الواجهة) */
(() => {
  'use strict';

  /* فحص الملفات: لو ملف ناقص أو قديم نطلّع رسالة بدل الشاشة الفاضية */
  (function () {
    const miss = [];
    if (!window.KoraCMData) miss.push('careermode-data.js');
    if (!window.KoraCoachData) miss.push('coach-data.js');
    if (!window.KoraCMRosters) miss.push('careermode-rosters.js');
    if (!(window.KoraCMData && window.KoraCMData.TOP15)) miss.push('careermode-world.js');
    if (!window.KoraCMArt) miss.push('careermode-art.js');
    if (!window.KoraCinema) miss.push('careermode-cinema.js');
    if (!window.KoraDialog) miss.push('dialog.js'); /* ✅ FIX 1 */
    if (!(window.KoraCMEngine && window.KoraCMEngine.nextExtra)) miss.push('careermode-engine.js (النسخة الجديدة)');
    if (miss.length) {
      const m = document.querySelector('main') || document.body, d = document.createElement('div');
      d.style.cssText = 'margin:20px 16px;padding:16px;border:2px solid #ff7a59;border-radius:14px;line-height:1.9;color:#fff';
      d.innerHTML = '<b>في ملفات ناقصة أو قديمة على الموقع:</b><br>' + miss.join('<br>') + '<br><small>ارفعها في نفس فولدر careermode.html وامسح الكاش وجرب تاني.</small>';
      m.appendChild(d);
      throw new Error('Missing files: ' + miss.join(', '));
    }
  })();

  const E = window.KoraCMEngine, D = window.KoraCMData, LG = D.LEAGUES;
  const KEY = 'koraCareerMode';
  const STATS_KEY = 'koraChallengeStats';
  const COLORS = ['#e8453c', '#2f7cf6', '#24b36b', '#f6c445', '#8b5cf6', '#f5f5f5'];
  const $ = id => document.getElementById(id);
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const fmt = n => Number(n).toLocaleString('en-US');

  let S = null;           // حالة المسيرة
  let tab = 'home';
  let tabLeague = null;
  let fxFilter = 'all';
  const sel = { color: COLORS[0], pos: 'ST', start: 'eng3', photo: null, nat: ['مصر', 'eg'], age: 18 };
  const IC_P = {
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    home: '<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-6h6v6"/>',
    clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 11h6M9 15h6"/>',
    exit: '<path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    med: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>'
  };
  const ic = n => '<svg class="cm-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC_P[n] + '</svg>';
  const icon = n => { const sp = el('span', 'ic'); sp.innerHTML = ic(n); return sp; };
  const FIXCSS = 'position:fixed;left:16px;right:16px;bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:9000;max-width:608px;width:auto;margin:0 auto;box-shadow:0 12px 32px rgba(0,0,0,.6)';
  const fixBtn = b => { b.style.cssText = FIXCSS; return b; };
  const outTxt = pm => pm.role === 'bench' ? 'دكة' : pm.why === 'inj' ? 'مصاب' : pm.why === 'susp' ? 'موقوف' : 'خارج';
  const ratingCls = r => r >= 4.6 ? 'gold' : r >= 3.8 ? 'green' : r >= 3.0 ? 'amber' : 'red';
  function toast(text, kind) {
    let box = $('cmToasts'); if (!box) { box = el('div', 'cm-toasts'); box.id = 'cmToasts'; document.body.appendChild(box); }
    const t = el('div', 'cm-toast ' + (kind || '')); t.textContent = text; box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 3200);
  }
  function countUp(node, to) {
    const t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / 700); node.textContent = money(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  const buzz = p => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* ignore */ } };
  let assetKind = 'house';
  let awTimer = null;
  const money = n => '\u200E€' + fmt(Math.round(n)) + '\u200E';
  const isMine = id => id === S.clubId || id === 'nt_' + S.player.natCode;

  /* ====== التخزين ====== */
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.v === 2 && s.player && s.world ? s : null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }

  function saveStats(pts) {
    if (!pts) return;
    try {
      const st = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      st.gamesPlayed = (Number(st.gamesPlayed) || 0) + 1;
      st.bestScore = Math.max(Number(st.bestScore) || 0, pts);
      st.totalPoints = (Number(st.totalPoints) || 0) + pts;
      localStorage.setItem(STATS_KEY, JSON.stringify(st));
      window.dispatchEvent(new StorageEvent('storage', { key: STATS_KEY }));
    } catch (e) { /* ignore */ }
  }

  /* ====== عناصر مشتركة ====== */
  function avatarSVG(color) {
    return '<svg class="cm-avatar" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="21" r="11" fill="#d6dcd8"/>' +
      '<path d="M8 64c0-15 10-26 24-26s24 11 24 26z" fill="' + color + '"/>' +
      '<path d="M25 39l7 8 7-8" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function avatarHTML(p) {
    if (p && p.photo) return '<img class="cm-photo" alt="" src="' + p.photo + '">';
    return avatarSVG(p ? p.color : COLORS[0]);
  }
  /* تصغير الصورة المرفوعة لمربع 192px عشان تتخزن خفيفة */
  function readPhoto(file) {
    return new Promise((res, rej) => {
      if (!file || file.size > 8 * 1024 * 1024 || !/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) { rej(new Error('type')); return; }
      const fr = new FileReader();
      fr.onerror = () => rej(new Error('read'));
      fr.onload = () => {
        const im = new Image();
        im.onerror = () => rej(new Error('img'));
        im.onload = () => {
          const N = 192, c = document.createElement('canvas'); c.width = c.height = N;
          const x = c.getContext('2d'), m = Math.min(im.width, im.height);
          x.drawImage(im, (im.width - m) / 2, (im.height - m) / 2, m, m, 0, 0, N, N);
          res(c.toDataURL('image/jpeg', 0.85));
        };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function hashColor(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return 'hsl(' + (h % 360) + ',45%,38%)'; }
  function badge(club) {
    const b = el('span', 'cm-badge');
    const initial = Array.from(club.ar)[0];
    const fallback = () => { b.textContent = initial; b.style.background = hashColor(club.id); };
    if (club.flag) {
      b.classList.add('flagb');
      const fi = document.createElement('img'); fi.alt = ''; fi.src = 'https://flagcdn.com/w80/' + club.flag + '.png';
      fi.addEventListener('error', () => { fi.remove(); b.classList.remove('flagb'); fallback(); });
      b.appendChild(fi); return b;
    }
    if (club.crest) {
      const img = document.createElement('img');
      img.alt = ''; img.loading = 'lazy';
      img.src = 'https://crests.football-data.org/' + club.crest + '.png';
      img.addEventListener('error', () => { img.remove(); fallback(); });
      b.appendChild(img);
    } else fallback();
    return b;
  }
  const club = id => S.clubs[id];
  const ratingClass = r => r >= 4 ? 'hi' : r >= 3 ? 'mid' : 'lo';

  function flag(code) {
    const i = document.createElement('img');
    i.className = 'cm-flag'; i.alt = ''; i.src = 'https://flagcdn.com/w40/' + code + '.png';
    i.addEventListener('error', () => i.remove());
    return i;
  }
  const posName = id => (D.POSITIONS.find(p => p.id === id) || {}).ar || id;

  function show(id) {
    ['cmMode', 'cmCreate', 'cmGame', 'cmAwards', 'cmSeason', 'cmRetire', 'cmSign', 'cmSummer', 'cmYouth'].forEach(k => { const n = $(k); if (n) n.hidden = k !== id; });
    if (id !== 'cmYouth' && $('cmYouth')) $('cmYouth').textContent = '';
    window.scrollTo(0, 0);
  }

  /* ====== شاشة الإنشاء ====== */
  function buildCreate() {
    const natBtn = $('cmNatBtn');
    const paintNat = () => { natBtn.textContent = ''; natBtn.append(flag(sel.nat[1]), el('span', '', sel.nat[0])); };
    paintNat();
    natBtn.addEventListener('click', () => {
      const w = el('div'); w.appendChild(el('div', 'cm-sum-title', 'اختار بلدك'));
      const g = el('div', 'cm-flags');
      D.NATIONS.forEach(n => {
        const b = el('button', 'cm-flag-opt' + (n[1] === sel.nat[1] ? ' on' : '')); b.type = 'button';
        const im = document.createElement('img'); im.alt = ''; im.src = 'https://flagcdn.com/w80/' + n[1] + '.png';
        b.append(im, el('span', '', n[0]));
        b.addEventListener('click', () => { sel.nat = n; paintNat(); $('cmModal').hidden = true; });
        g.appendChild(b);
      });
      w.appendChild(g); openModal(w, 'إغلاق');
    });

    const pos = $('cmPos');
    D.POSITIONS.forEach(p => {
      const b = el('button', 'cm-chip' + (p.id === sel.pos ? ' on' : ''), p.ar);
      b.type = 'button'; b.setAttribute('role', 'radio');
      b.addEventListener('click', () => { sel.pos = p.id; pos.querySelectorAll('.cm-chip').forEach(x => x.classList.toggle('on', x === b)); });
      pos.appendChild(b);
    });

    const ageBox = $('cmAge');
    const ageNote = () => { $('cmAgeNote').textContent = sel.age === 15 ? 'هتبدأ في أكاديمية الناشئين لمدة موسمين، وبتوصلك طلبات تجنيس من منتخبات، وبعدها بتتعاقد احترافي.' : 'هتبدأ مباشرة بعقدك الاحترافي الأول من غير أي حاجة زيادة.'; };
    [[18, '18 سنة', 'عادي'], [15, '15 سنة', 'ناشئين + تجنيس']].forEach(a => {
      const b = el('button', 'cm-chip' + (a[0] === sel.age ? ' on' : ''), a[1] + ' • ' + a[2]);
      b.type = 'button'; b.setAttribute('role', 'radio');
      b.addEventListener('click', () => { sel.age = a[0]; ageBox.querySelectorAll('.cm-chip').forEach(x => x.classList.toggle('on', x === b)); ageNote(); });
      ageBox.appendChild(b);
    });
    ageNote();

    const cols = $('cmColors');
    COLORS.forEach(c => {
      const b = el('button', 'cm-sw' + (c === sel.color ? ' on' : ''));
      b.type = 'button'; b.style.background = c; b.setAttribute('aria-label', 'لون ' + c);
      b.addEventListener('click', () => { sel.color = c; cols.querySelectorAll('.cm-sw').forEach(x => x.classList.toggle('on', x === b)); $('cmPrev').innerHTML = avatarHTML({ photo: sel.photo, color: c }); });
      cols.appendChild(b);
    });

    const st = $('cmStart');
    const startList = D.STARTS.slice().sort((a, b) => (LG[b.id].tier - LG[a.id].tier) || a.ar.localeCompare(b.ar, 'ar'));
    startList.forEach(x => { const o = document.createElement('option'); o.value = x.id; o.textContent = x.ar + ' — ' + x.note; if (x.id === sel.start) o.selected = true; st.appendChild(o); });
    const stNote = () => { $('cmStartNote').textContent = 'هتبدأ في نادي من الأضعف في الدوري ده وهتتفاوض على عقدك.'; };
    st.addEventListener('change', () => { sel.start = st.value; stNote(); }); stNote();
    $('cmPrev').innerHTML = avatarHTML(sel);
    const pf = $('cmPhoto'), pr = $('cmPhotoClear'), pe = $('cmPhotoErr');
    pf.addEventListener('change', () => {
      pe.textContent = '';
      const f = pf.files && pf.files[0]; if (!f) return;
      readPhoto(f).then(d => { sel.photo = d; $('cmPrev').innerHTML = avatarHTML(sel); pr.hidden = false; })
        .catch(() => { pe.textContent = 'مقدرتش أفتح الصورة دي. جرب صورة JPG أو PNG تانية.'; pf.value = ''; });
    });
    pr.addEventListener('click', () => { sel.photo = null; pf.value = ''; pe.textContent = ''; pr.hidden = true; $('cmPrev').innerHTML = avatarHTML(sel); });

    $('cmForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = window.KoraSec ? window.KoraSec.name($('cmName').value, 22) : $('cmName').value.trim();
      if (!name) return;
      S = E.newCareer({ name, nat: sel.nat[0], natCode: sel.nat[1], pos: sel.pos, color: sel.color, start: sel.start, startAge: sel.age, photo: sel.photo }, Math.random);
      S.pointsGiven = false;
      tab = 'home'; tabLeague = S.league;
      save(); render();
    });
  }

  /* ====== شاشة اللعب ====== */
  function renderPlayer() {
    const p = S.player, c = club(S.clubId), box = $('cmPlayer');
    box.textContent = '';

    ['bronze', 'silver', 'gold', 'elite'].forEach(t => box.classList.remove('cm-tier-' + t));
    box.classList.add('cm-tier-' + (p.ovr >= 85 ? 'elite' : p.ovr >= 75 ? 'gold' : p.ovr >= 65 ? 'silver' : 'bronze'));
    const mb = el('button', 'cm-menu-btn'); mb.type = 'button'; mb.setAttribute('aria-label', 'القائمة');
    mb.append(el('i'), el('i'), el('i')); mb.addEventListener('click', openDrawer);
    box.appendChild(mb);
    const ph = el('div', 'cm-ph');
    const av = el('div', 'cm-avatar-sm'); av.innerHTML = avatarHTML(p);
    const pi = el('div', 'cm-pi');
    pi.appendChild(el('b', '', p.name));
    const sm = el('small');
    sm.append(flag(p.natCode), document.createTextNode(p.nat + ' • ' + posName(p.pos) + ' • ' + p.age + ' سنة'));
    pi.appendChild(sm);
    const cl = el('div', 'cm-club');
    cl.append(badge(c), el('span', '', c.ar));
    ph.append(av, pi);
    box.append(ph, cl);

    const en = el('div', 'cm-energy');
    const top = el('div', 'cm-energy-top');
    top.append(el('span', '', 'الطاقة'), el('b', '', Math.floor(p.ovr) + ' / 99'));
    const bar = el('div', 'cm-bar'); const fill = el('i'); fill.style.width = clampPct((p.ovr - 40) / 59 * 100) + '%'; bar.appendChild(fill);
    en.append(top, bar);
    box.appendChild(en);

    const s = S.stats, avg = s.rated ? (s.ratingSum / s.rated).toFixed(1) : '-';
    const grid = el('div', 'cm-stats');
    [['مباريات', s.apps], ['أهداف', s.goals], ['أسيست', s.assists], ['التقييم', avg]].forEach(x => {
      const d = el('div', 'cm-stat'); d.append(el('small', '', x[0]), el('b', '', String(x[1]))); grid.appendChild(d);
    });
    box.appendChild(grid);

    if (S.form && S.form.length) {
      const f = el('div', 'cm-form-dots'); f.appendChild(el('span', '', 'آخر مباريات:'));
      S.form.forEach(r => f.appendChild(el('span', 'cm-dot ' + ratingClass(r), r.toFixed(1))));
      box.appendChild(f);
    }
  }
  const clampPct = v => Math.max(2, Math.min(100, v));

  function teamBlock(id, label) {
    const c = club(id), t = el('div', 'cm-team');
    t.append(badge(c), el('span', '', c.ar), el('small', label + ' • ' + Math.round(c.str)));
    return t;
  }

  function pressBox(press) {
    const box = el('div', 'cm-press');
    const head = el('div', 'cm-press-top');
    head.appendChild(el('b', 'cm-press-h', 'مؤتمر صحفي بعد المباراة'));
    const other = el('button', 'cm-press-other', 'إجابة أخرى'); other.type = 'button';
    head.appendChild(other);
    box.append(head, el('div', 'cm-press-q', press.q));
    const body = el('div', 'cm-press-body'); box.appendChild(body);
    let typing = false;
    const draw = () => {
      body.textContent = '';
      other.hidden = press.done != null;
      if (press.done != null) {
        if (press.free) {
          const f = press.free;
          body.appendChild(el('div', 'cm-press-r', 'قلت: «' + f.text + '»'));
          f.lines.forEach(l => body.appendChild(el('div', 'cm-note ' + (l.k === 'up' ? 'up' : l.k === 'down' ? 'down' : ''), l.who + ': ' + l.x)));
          const eff = [];
          if (f.fame) eff.push('الشهرة ' + (f.fame > 0 ? '+' : '') + f.fame);
          if (f.fine) eff.push('غرامة ' + money(f.fine));
          if (f.susp) eff.push('إيقاف ' + f.susp + ' مباراة');
          eff.push(f.favor > 0.04 ? 'المدرب مرتاح' : f.favor < -0.04 ? 'المدرب زعلان' : 'رأي المدرب ثابت');
          eff.push(f.ai ? 'تحليل بالذكاء الاصطناعي' : 'تحليل بالقواعد');
          body.appendChild(el('small', 'cm-sub', eff.join(' • ')));
          if (f.expelled || S.expelled) { const ex = skipBtn(); ex.style.marginTop = '12px'; body.appendChild(ex); }
        } else if (press.opts[press.done]) body.appendChild(el('div', 'cm-press-r', 'قلت: ' + press.opts[press.done].t + (press.reply ? ' — ' + press.reply : '')));
        return;
      }
      if (typing) {
        const ta = el('textarea', 'cm-press-ta'); ta.maxLength = 200; ta.rows = 3; ta.placeholder = 'اكتب ردك بحرية (حتى 200 حرف)…' + (window.KoraPressLLM && window.KoraPressLLM.enabled() ? ' (هيتحلل بالذكاء الاصطناعي)' : '');
        const row = el('div', 'cm-row');
        const go = el('button', 'cm-btn', 'ابعت ردك'); go.type = 'button';
        const back = el('button', 'cm-btn ghost', 'رجوع للاختيارات'); back.type = 'button';
        go.addEventListener('click', async () => {
          const text = ta.value.trim();
          if (!text) { toast('اكتب ردك الأول', 'bad'); return; }
          go.disabled = true; back.disabled = true;
          let pre = null;
          const L = window.KoraPressLLM;
          if (L && L.enabled()) {
            go.textContent = 'بيحلل ردك…';
            try { pre = await L.analyze(text, E.pressContext(S, press)); } catch (e) { pre = null; }
          }
          const r = E.answerFree(S, press, text, Math.random, pre);
          if (!r) { go.disabled = false; back.disabled = false; go.textContent = 'ابعت ردك'; toast('اكتب ردك الأول', 'bad'); return; }
          save(); renderStatusSoon(); draw();
        });
        back.addEventListener('click', () => { typing = false; draw(); });
        row.append(go, back); body.append(ta, row);
        setTimeout(() => ta.focus(), 30);
        return;
      }
      press.opts.forEach((o, i) => {
        const b = el('button', 'cm-btn ghost cm-press-opt', o.t); b.type = 'button';
        b.addEventListener('click', () => { press.reply = E.answerPress(S, press, i); save(); draw(); });
        body.appendChild(b);
      });
    };
    other.addEventListener('click', () => { typing = !typing; draw(); });
    draw();
    return box;
  }
  function renderStatusSoon() { try { const m = $('cmMoney'); if (m) m.textContent = money(S.money); } catch (e) { /* ignore */ } }

  /* تخطّي عقوبة الطرد: نكمّل الموسم من غير لعب ونروح للعروض */
  function doSkipExpulsion() {
    if (!S || !S.expelled) return;
    E.skipExpulsion(S, Math.random); save();
    const m = $('cmModal'); if (m) m.hidden = true;
    tab = 'home'; render();
  }
  function skipBtn(extra) {
    const sk = el('button', 'cm-btn' + (extra ? ' ' + extra : ''), 'تخطّى العقوبة وروح لنهاية الموسم'); sk.type = 'button';
    sk.addEventListener('click', doSkipExpulsion);
    return sk;
  }

  function paneHome() {
    const pane = $('cmPane'); pane.textContent = '';
    const myRounds = E.rounds(S.league);
    const card = el('div', 'cm-card cm-next');

    const due = E.nextExtraInfo(S);
    if (S.expelled && !S.seasonOver) {
      card.classList.add('cm-exit');
      card.append(el('h3', 'cm-sum-title', 'اتطردت من ' + (S.clubs[S.expelled.clubId] ? S.clubs[S.expelled.clubId].ar : 'النادي') + '!'),
        el('div', 'cm-note', 'الإدارة فصلتك بسبب الإساءة المتكررة للمدرب ورئيس النادي. إنت دلوقتي بدون نادي ومش هتلعب لحد نهاية الموسم، وبعدها هتدوّر على نادي جديد.'));
      card.appendChild(skipBtn());
      pane.appendChild(card);
    } else if ((S.seasonOver || S.round >= myRounds) && !due) {
      card.appendChild(el('h3', '', 'الموسم خلص!'));
      const p = E.myPosition(S);
      card.appendChild(el('p', 'cm-sub', 'خلصت في المركز ' + p + ' في ' + LG[S.league].ar));
      const b = el('button', 'cm-btn', 'شوف ملخص الموسم والعروض'); b.type = 'button';
      b.addEventListener('click', endSeason);
      card.appendChild(b);
      pane.appendChild(card);
    } else {
      let fx;
      if (due) {
        fx = { home: due.home, away: due.away };
        card.classList.add('cm-next-euro');
        card.appendChild(el('h3', '', due.label));
      } else {
        fx = E.myFixtures(S).find(f => f.round === S.round + 1);
        card.appendChild(el('h3', '', 'الجولة ' + (S.round + 1) + ' من ' + myRounds + ' • ' + LG[S.league].ar));
      }
      if (!due) { const pbar = el('div', 'cm-bar cm-prog'); const pf = el('i'); pf.style.width = clampPct(S.round / myRounds * 100) + '%'; pbar.appendChild(pf); card.appendChild(pbar); }
      const vs = el('div', 'cm-vs');
      vs.append(teamBlock(fx.home, 'أرض'), el('span', 'cm-vs-mid', 'ضد'), teamBlock(fx.away, 'ضيف'));
      const dby = !due && fx ? E.derbyOf(fx.home, fx.away) : null;
      if (dby) card.appendChild(el('div', 'cm-derby', '🔥 ' + dby + ' • مباراة بحماس خاص ومكافآت مضاعفة'));
      card.appendChild(vs);
      const row = el('div', 'cm-row');
      const b1 = el('button', 'cm-btn', due ? 'العب المباراة' : 'العب الجولة'); b1.type = 'button'; b1.addEventListener('click', () => playRounds(1));
      const b5 = el('button', 'cm-btn ghost', 'العب 5 جولات'); b5.type = 'button'; b5.addEventListener('click', () => playRounds(5));
      row.append(b1, b5);
      card.appendChild(row);
      const bs = el('button', 'cm-link', 'خلّص الموسم كله'); bs.type = 'button'; bs.style.marginTop = '10px';
      bs.addEventListener('click', () => playRounds(99));
      card.appendChild(bs);
      pane.appendChild(card);
    }

    pane.appendChild(statusCard());
    if (isAdmin()) pane.appendChild(adminCard());
    if (S.coach) {
      const cc = el('div', 'cm-card cm-coachcard');
      cc.append(el('b', '', 'المدرب: ' + S.coach.name), el('small', 'cm-sub', E.coachNote(S) + ' • ده بيأثر على فرصتك في التشكيلة'));
      if (S.coachNews) cc.appendChild(el('div', 'cm-note', S.coachNews));
      pane.appendChild(cc);
    }
    if (S.euro) pane.appendChild(euroCard());
    (S.cups || []).forEach(c => pane.appendChild(cupCard(c)));
    if (S.intl && S.intl.caps > 0) {
      const intlCard = el('div', 'cm-card cm-cup'); /* ✅ FIX 4: ic → intlCard */
      const nt = E.ntOf(S);
      intlCard.append(el('b', '', 'لاعب في منتخب ' + (nt ? nt.ar : '')), el('small', 'cm-sub', S.intl.caps + ' مباراة دولية • ' + S.intl.goals + ' هدف • ' + S.intl.assists + ' أسيست'));
      pane.appendChild(intlCard);
    }
    const last = S.log[S.log.length - 1];
    if (last) {
      const c = el('div', 'cm-card cm-click'); c.tabIndex = 0; c.addEventListener('click', () => openModal(reportNode(last), 'تمام'));
      c.appendChild(el('h3', '', 'آخر مباراة'));
      c.lastChild.style.cssText = 'margin:0 0 8px;font-size:.84rem;color:var(--muted)';
      const row = el('div', 'cm-last');
      const lt = el('div');
      lt.appendChild(el('b', '', club(last.home).ar + ' ' + last.hg + ' - ' + last.ag + ' ' + club(last.away).ar));
      lt.appendChild(el('small', '', roleText(last)));
      row.appendChild(lt);
      if (last.rating != null) row.appendChild(el('span', 'cm-dot ' + ratingClass(last.rating), last.rating.toFixed(1)));
      c.appendChild(row);
      pane.appendChild(c);
    }
  }

  function euroCard() {
    const e = S.euro, c = el('div', 'cm-card cm-euro');
    const h = el('div', 'cm-euro-h'); h.append(el('b', '', 'دوري أبطال أوروبا'), el('small', '', e.kind === 'qual' ? 'من التصفيات' : 'متأهل مباشرة'));
    c.appendChild(h);
    let t;
    if (e.status === 'champ') t = e.result;
    else if (e.status === 'out') t = e.result;
    else if (e.phase === 'league') t = 'مرحلة الدوري: ' + e.lp.played + ' من 8 • ' + e.lp.pts + ' نقطة';
    else t = 'الدور الجاي: ' + E.STAGE_AR[e.phase];
    c.appendChild(el('div', 'cm-euro-t ' + (e.status === 'champ' ? 'win' : e.status === 'out' ? 'out' : ''), t));
    if (e.rank) c.appendChild(el('small', 'cm-sub', 'ترتيبك في مرحلة الدوري: ' + e.rank + ' من 36'));
    return c;
  }

  function skipInjury() {
    if (!S.injury) return;
    playRounds(S.injury.games);
  }
  function statusCard() {
    const wrap = el('div', 'cm-status');
    if (S.injury && S.injury.games > 0) {
      const c = el('div', 'cm-card cm-injury'), hd = el('div', 'cm-inj-h');
      const ico = el('span', 'cm-inj-ic'); ico.innerHTML = ic('med');
      const tx = el('div'); tx.append(el('b', '', 'مصاب: ' + S.injury.n), el('small', 'cm-sub', 'هتغيب ' + S.injury.games + (S.injury.games === 1 ? ' مباراة' : ' مباريات') + (S.injury.loss ? ' • الإصابة دي ممكن تأثر على مستواك' : '')));
      hd.append(ico, tx); c.appendChild(hd);
      const bar = el('div', 'cm-bar'), f = el('i'); f.style.width = clampPct((S.injury.total - S.injury.games) / S.injury.total * 100) + '%'; bar.appendChild(f); c.appendChild(bar);
      const b = el('button', 'cm-btn', 'تخطي فترة الإصابة'); b.type = 'button'; b.addEventListener('click', skipInjury); c.appendChild(b);
      wrap.appendChild(c);
    }
    if (S.susp > 0) {
      const c = el('div', 'cm-card cm-injury'), hd = el('div', 'cm-inj-h'); const ico = el('span', 'cm-inj-ic'); ico.innerHTML = ic('ban');
      const tx = el('div'); tx.append(el('b', '', 'موقوف'), el('small', 'cm-sub', 'هتغيب ' + S.susp + (S.susp === 1 ? ' مباراة' : ' مباريات') + ' بسبب الكروت'));
      hd.append(ico, tx); c.appendChild(hd); wrap.appendChild(c);
    }
    const c = el('div', 'cm-card cm-statcard');
    const fit = 100 - (S.fatigue || 0);
    const row1 = el('div', 'cm-sc-row'); row1.append(el('span', '', 'اللياقة'), el('b', fit < 40 ? 'low' : '', fit + '%'));
    const bar = el('div', 'cm-bar' + (fit < 40 ? ' warn' : '')), f = el('i'); f.style.width = fit + '%'; bar.appendChild(f);
    const grid = el('div', 'cm-sc-grid');
    [['القيمة السوقية', '€' + fmt(E.marketValue(S)) + ' مليون'], ['دورك في الفريق', E.squadRole(S)]].forEach(x => { const d = el('div'); d.append(el('small', '', x[0]), el('b', '', x[1])); grid.appendChild(d); });
    c.append(row1, bar, grid); wrap.appendChild(c);
    return wrap;
  }

  function cupCard(c) {
    const card = el('div', 'cm-card cm-cup');
    card.appendChild(el('b', '', c.ar));
    const t = c.status === 'active' ? 'الدور الجاي: ' + c.next.label + ' (بعد الجولة ' + c.next.after + ')' : c.result;
    card.appendChild(el('div', 'cm-euro-t ' + (c.status === 'champ' ? 'win' : c.status === 'out' ? 'out' : ''), t));
    return card;
  }

  function roleText(r) {
    return r.role === 'start' ? 'أساسي • ' + r.minutes + ' دقيقة' : r.role === 'sub' ? 'نزلت بديل • ' + r.minutes + ' دقيقة' : r.role === 'bench' ? 'على الدكة' : r.why === 'inj' ? 'غايب بسبب الإصابة' : r.why === 'susp' ? 'موقوف' : 'خارج القايمة';
  }

  function paneTable() {
    const pane = $('cmPane'); pane.textContent = '';
    const keys = Object.keys(S.world.leagues);
    if (!tabLeague || (keys.indexOf(tabLeague) < 0 && tabLeague !== 'cl')) tabLeague = S.league;
    if (tabLeague === 'cl' && !(S.euro && S.euro.lpTable)) tabLeague = S.league;
    const chips = el('div', 'cm-leagues');
    const tabKeys = keys.concat(S.euro && S.euro.lpTable ? ['cl'] : []);
    tabKeys.forEach(k => {
      const b = el('button', 'cm-tab' + (k === tabLeague ? ' active' : ''), k === 'cl' ? 'دوري الأبطال' : LG[k].ar); b.type = 'button';
      b.addEventListener('click', () => { tabLeague = k; paneTable(); });
      chips.appendChild(b);
    });
    pane.appendChild(chips);
    if (tabLeague === 'cl') { paneEuroTable(pane); return; }
    const t = E.table(S, tabLeague), n = t.length;
    const card = el('div', 'cm-card'); card.style.padding = '8px 6px';
    const tb = document.createElement('table'); tb.className = 'cm-table';
    const head = tb.createTHead().insertRow();
    ['#', 'النادي', 'لعب', 'ف', 'ت', 'خ', 'فارق', 'نقاط'].forEach((h, i) => { const th = document.createElement('th'); th.textContent = h; if (i === 1) th.style.textAlign = 'start'; head.appendChild(th); });
    const body = tb.createTBody();
    const hasUp = LG[tabLeague].up, hasDown = LG[tabLeague].down || tabLeague.indexOf('2') > -1 && LG[tabLeague].country === 'esp' || tabLeague === 'eng3' || tabLeague === 'esp2';
    t.forEach((r, i) => {
      const tr = body.insertRow();
      if (r.id === S.clubId) tr.classList.add('me');
      if (i < 3 && (hasUp)) tr.classList.add('up');
      if (hasDown && i >= n - 3) tr.classList.add('down'); /* ✅ FIX 3 */
      [i + 1, club(r.id).ar, r.p, r.w, r.d, r.l, (r.gd > 0 ? '+' : '') + r.gd, r.pts].forEach((v, j) => {
        const td = tr.insertCell(); td.textContent = v;
        if (j === 1) td.className = 'club';
        if (j === 7) td.className = 'pts';
      });
    });
    card.appendChild(tb);
    pane.appendChild(card);
  }

  function paneEuroTable(pane) {
    const card = el('div', 'cm-card'); card.style.padding = '8px 6px';
    const tb = document.createElement('table'); tb.className = 'cm-table';
    const head = tb.createTHead().insertRow();
    ['#', 'النادي', 'فارق', 'نقاط'].forEach((h, i) => { const th = document.createElement('th'); th.textContent = h; if (i === 1) th.style.textAlign = 'start'; head.appendChild(th); });
    const body = tb.createTBody();
    S.euro.lpTable.forEach((r, i) => {
      const tr = body.insertRow();
      if (r.me) tr.classList.add('me');
      if (i < 8) tr.classList.add('up'); else if (i < 24) tr.classList.add('po'); else tr.classList.add('down');
      [i + 1, club(r.id).ar, (r.gd > 0 ? '+' : '') + r.gd, r.pts].forEach((v, j) => { const td = tr.insertCell(); td.textContent = v; if (j === 1) td.className = 'club'; if (j === 3) td.className = 'pts'; });
    });
    card.appendChild(tb); pane.appendChild(card);
    pane.appendChild(el('div', 'cm-note', 'أول 8 على طول لدور الـ16 • من 9 لـ24 ملحق • من 25 خرجوا'));
  }

  function paneFixtures() {
    const pane = $('cmPane'); pane.textContent = '';
    const chips = el('div', 'cm-leagues');
    [['all', 'الكل'], ['played', 'اللي اتلعبت'], ['next', 'اللي جاية']].concat(S.log.some(x => x.comp) ? [['cl', 'الكؤوس وأوروبا']] : []).forEach(f => {
      const b = el('button', 'cm-tab' + (fxFilter === f[0] ? ' active' : ''), f[1]); b.type = 'button';
      b.addEventListener('click', () => { fxFilter = f[0]; paneFixtures(); });
      chips.appendChild(b);
    });
    pane.appendChild(chips);
    const card = el('div', 'cm-card');
    if (fxFilter === 'cl') {
      const items = S.log.filter(x => x.comp);
      if (!items.length) card.appendChild(el('div', 'cm-soon', 'لسه ماتلعبتش مباريات كؤوس أو أوروبا.'));
      items.forEach(x => {
        const row = el('div', 'cm-fx click'); row.tabIndex = 0;
        row.appendChild(el('span', 'rd', x.cn ? 'كأس' : 'أوروبا'));
        const mt = el('div', 'mt'), homeMe = x.home === S.clubId, opp = club(homeMe ? x.away : x.home);
        mt.appendChild(document.createTextNode((homeMe ? 'ضد ' : 'عند ') + opp.ar));
        mt.appendChild(el('small', '', (x.cn ? x.cn + ' • ' : '') + (x.st || E.STAGE_AR[x.stage] || '') + (x.pens ? ' • ترجيح ' + (homeMe ? x.pens[0] + '-' + x.pens[1] : x.pens[1] + '-' + x.pens[0]) : '')));
        row.appendChild(mt);
        row.appendChild(el('span', 'sc', x.hg + ' - ' + x.ag));
        row.appendChild(el('span', 'rt ' + (x.rating != null ? ratingClass(x.rating) : ''), x.rating != null ? x.rating.toFixed(1) : (x.role === 'bench' ? 'دكة' : 'خارج')));
        row.addEventListener('click', () => openModal(reportNode(x), 'تمام'));
        card.appendChild(row);
      });
      pane.appendChild(card);
      return;
    }
    let list = E.myFixtures(S);
    if (fxFilter === 'played') list = list.filter(f => f.res);
    if (fxFilter === 'next') list = list.filter(f => !f.res);
    if (!list.length) card.appendChild(el('div', 'cm-soon', 'مفيش مباريات هنا لسه.'));
    list.forEach(f => {
      const isNext = !f.res && f.round === S.round + 1;
      const row = el('div', 'cm-fx' + (isNext ? ' next' : ''));
      row.appendChild(el('span', 'rd', 'ج' + f.round));
      const mt = el('div', 'mt');
      const homeMe = f.home === S.clubId;
      const opp = club(homeMe ? f.away : f.home);
      mt.appendChild(document.createTextNode((homeMe ? 'ضد ' : 'عند ') + opp.ar));
      mt.appendChild(el('small', '', homeMe ? 'على ملعبك' : 'خارج الأرض'));
      row.appendChild(mt);
      if (f.res) {
        row.appendChild(el('span', 'sc', f.res[0] + ' - ' + f.res[1]));
        if (f.log && f.log.rating != null) row.appendChild(el('span', 'rt ' + ratingClass(f.log.rating), f.log.rating.toFixed(1)));
        else row.appendChild(el('span', 'rt', f.log ? (f.log.role === 'bench' ? 'دكة' : 'خارج') : '—'));
      } else row.appendChild(el('span', 'sc', isNext ? 'الجاية' : ''));
      if (f.log) {
        row.classList.add('click'); row.tabIndex = 0; row.setAttribute('role', 'button');
        const open = () => openModal(reportNode(f.log), 'تمام');
        row.addEventListener('click', open);
        row.addEventListener('keydown', ev => { if (ev.key === 'Enter') open(); });
      }
      card.appendChild(row);
    });
    pane.appendChild(card);
  }

  function paneHead(title) {
    const h = el('div', 'cm-pane-head'); h.appendChild(el('h2', '', title));
    const b = el('button', 'cm-link', 'رجوع للرئيسية'); b.type = 'button';
    b.addEventListener('click', () => { tab = 'home'; renderPane(); });
    h.appendChild(b); return h;
  }
  function paneHonors() {
    const pane = $('cmPane'); pane.textContent = ''; pane.appendChild(paneHead('بطولاتي'));
    const hs = S.honors || [];
    if (!hs.length) { const c = el('div', 'cm-card cm-soon'); c.append(el('b', '', 'لسه مكسبتش حاجة'), el('div', '', 'العب كويس وهتلاقي بطولاتك وجوايزك هنا.')); pane.appendChild(c); return; }
    const c = el('div', 'cm-card');
    hs.slice().reverse().forEach(h => {
      const r = el('div', 'cm-fx'); r.append(el('span', 'rd', String(h.year)));
      const mt = el('div', 'mt', h.text); if (h.clubId && S.clubs[h.clubId]) mt.appendChild(el('small', '', S.clubs[h.clubId].ar));
      r.appendChild(mt); c.appendChild(r);
    });
    pane.appendChild(c);
  }

  const ASSET_KINDS = [['house', 'البيوت', 'بيت'], ['car', 'العربيات', 'عربية'], ['moto', 'الموتوسيكلات', 'موتوسيكل'], ['bike', 'الدراجات', 'دراجة']];
  function assetArt(kind, it) {
    const A = window.KoraCMArt;
    return kind === 'house' ? A.house(it.k, it.c) : kind === 'car' ? A.car(it.t, it.c, it.id) : kind === 'moto' ? A.moto(it.t, it.c) : A.bike(it.t, it.c);
  }
  function paneAssets() {
    const pane = $('cmPane'); pane.textContent = ''; pane.appendChild(paneHead('ممتلكاتي'));
    const top = el('div', 'cm-card'); top.style.padding = '12px';
    const own = ASSET_KINDS.map(k => k[2] + ': ' + D.ASSETS[k[0]].filter(i => S.owned.indexOf(i.id) > -1).length).join(' • ');
    top.append(el('b', '', 'رصيدك: ' + money(S.money)), el('div', 'cm-sub', own));
    pane.appendChild(top);
    const tabs = el('div', 'cm-asset-tabs');
    ASSET_KINDS.forEach(k => { const b = el('button', 'cm-tab' + (assetKind === k[0] ? ' active' : ''), k[1]); b.type = 'button'; b.addEventListener('click', () => { assetKind = k[0]; paneAssets(); }); tabs.appendChild(b); });
    pane.appendChild(tabs);
    const grid = el('div', 'cm-asset-grid');
    D.ASSETS[assetKind].forEach(it => {
      const owned = S.owned.indexOf(it.id) > -1, card = el('div', 'cm-asset' + (owned ? ' own' : ''));
      const art = el('div', 'cm-asset-art'); art.innerHTML = assetArt(assetKind, it);
      card.append(art, el('b', '', it.n), el('small', '', money(it.p)));
      if (owned) { const ot = el('div', 'own-tag'); ot.innerHTML = ic('check'); ot.append('ملكك'); card.appendChild(ot); }
      else {
        const can = S.money >= it.p, b = el('button', 'cm-btn' + (can ? '' : ' ghost'), can ? 'اشتري' : 'ناقصك ' + money(it.p - S.money)); b.type = 'button'; b.disabled = !can;
        b.addEventListener('click', () => {
          window.KoraDialog.confirm({ title: 'تشتري ' + it.n + '؟', message: 'هيتخصم ' + money(it.p) + ' من رصيدك.', okText: 'اشتري', cancelText: 'لأ', danger: false })
            .then(ok => { if (ok && E.buyAsset(S, assetKind, it.id)) { save(); paneAssets(); } });
        });
        card.appendChild(b);
      }
      grid.appendChild(card);
    });
    pane.appendChild(grid);
  }

  /* ====== نقاط المهارة ====== */
  const SK_INFO = {
    spd: ['السرعة', 'بتزوّد فرصة تسجيل الأهداف وصناعتها شوية'],
    skl: ['المهارات', 'بتزوّد صناعة الأهداف والمراوغة'],
    phy: ['القوة البدنية', 'إصابات أقل وتعب أبطأ'],
    crs: ['العرضيات', 'أسيست أكتر من الأطراف والعرضيات'],
    pow: ['قوة التسديد', 'أهداف أكتر ونجاح أعلى في ضربات الجزاء']
  };
  function skillsCard(onChange) {
    E.initSkills(S);
    const card = el('div', 'cm-card cm-skills');
    const head = el('div', 'cm-sk-head');
    head.append(el('b', '', 'نقاط المهارة'), el('span', 'cm-sk-pts', 'متاح: ' + S.skillPts));
    card.appendChild(head);
    card.appendChild(el('small', 'cm-sub', 'هتجمّع 30 نقطة على طول مسيرتك (الأكتر في أول سنين). كل مهارة آخرها ' + E.SKILL_MAX + ' نقط، فاختار بتزوّد إيه. مصروف: ' + E.skillTotal(S) + ' من 30.'));
    E.SKILLS.forEach(k => {
      const v = S.skills[k[0]], row = el('div', 'cm-sk-row');
      const lab = el('div', 'cm-sk-lab'); lab.append(el('b', '', SK_INFO[k[0]][0]), el('small', '', SK_INFO[k[0]][1]));
      const bar = el('div', 'cm-sk-bar'); for (let i = 0; i < E.SKILL_MAX; i++) bar.appendChild(el('i', i < v ? 'on' : ''));
      const plus = el('button', 'cm-sk-plus', '+'); plus.type = 'button'; plus.setAttribute('aria-label', 'زوّد ' + SK_INFO[k[0]][0]);
      plus.disabled = !(S.skillPts > 0 && v < E.SKILL_MAX);
      plus.addEventListener('click', () => { if (E.upgradeSkill(S, k[0])) { save(); onChange(); } });
      row.append(lab, bar, el('span', 'cm-sk-val', v + '/' + E.SKILL_MAX), plus);
      card.appendChild(row);
    });
    return card;
  }
  function paneSkills() {
    const pane = $('cmPane'); pane.textContent = ''; pane.appendChild(paneHead('مهاراتي'));
    pane.appendChild(skillsCard(paneSkills));
  }

  /* ====== اختيار المنتخب بعد أول عقد احترافي ====== */
  function showNatChoice() {
    const c = S && S.natChoice; if (!c) return;
    const sheet = $('cmSheet'); sheet.textContent = '';
    const w = el('div'); w.appendChild(el('div', 'cm-sum-title', 'تلعب لمنتخب مين؟'));
    w.appendChild(el('p', 'cm-sub', 'وقّعت أول عقد احترافي. دلوقتي اختار تمثّل أنهي بلد على المستوى الدولي:'));
    [['mother', c.mother, 'بلدك الأم'], ['second', c.second, 'بلدك التانية (تجنيس)']].forEach(x => {
      const b = el('button', 'cm-btn' + (x[0] === 'second' ? ' ghost' : '')); b.type = 'button';
      b.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:10px;width:100%;margin-top:10px';
      const fl = document.createElement('img'); fl.alt = ''; fl.src = 'https://flagcdn.com/w40/' + x[1].natCode + '.png'; fl.style.cssText = 'width:30px;height:21px;object-fit:cover;border-radius:3px'; fl.addEventListener('error', () => fl.remove());
      b.append(fl, el('span', '', x[1].nat + ' — ' + x[2]));
      b.addEventListener('click', () => {
        window.KoraDialog.confirm({ title: 'تلعب لـ' + x[1].nat + '؟', message: 'القرار ده بيحدد منتخبك في باقي مسيرتك.', okText: 'أكّد', cancelText: 'رجوع' })
          .then(ok => { if (ok && E.chooseNation(S, x[0])) { save(); $('cmModal').hidden = true; render(); } });
      });
      w.appendChild(b);
    });
    sheet.appendChild(w); $('cmModal').hidden = false;
  }

  /* ====== أكاديمية الناشئين ====== */
  function renderYouth() {
    const box = $('cmYouth'); box.textContent = '';
    const y = S.youth, p = S.player, c = club(S.clubId);
    const head = el('div', 'cm-card cm-next');
    head.append(el('h3', 'cm-sum-title', 'أكاديمية ناشئين ' + c.ar), el('div', 'cm-sub', p.name + ' • ' + p.age + ' سنة • ' + (p.nat2 ? p.nat2.nat : 'من غير جنسية تانية') + ' • مستوى ' + Math.round(p.ovr) + ' • موسم ' + Math.min(y.yr + 1, 2) + ' من 2'));
    box.appendChild(head);
    if (y.log.length) {
      const lg = el('div', 'cm-card');
      lg.appendChild(el('b', '', 'مواسمك مع الناشئين'));
      y.log.forEach(r => { const row = el('div', 'cm-fx'); row.append(el('span', 'rd', r.age + ' س'), el('span', 'mt', r.apps + ' مباراة • ' + r.goals + ' هدف • ' + r.assists + ' أسيست'), el('span', 'rt ' + (r.rating >= 4 ? 'hi' : r.rating >= 3.3 ? 'mid' : 'lo'), r.rating.toFixed(1))); lg.appendChild(row); });
      box.appendChild(lg);
    }
    /* البلد التانية: لازم تتختار قبل أول موسم */
    const mother = p.motherNat || { nat: p.nat, natCode: p.natCode };
    const nc = el('div', 'cm-card cm-nat');
    if (!p.nat2) {
      nc.appendChild(el('b', '', 'اختار بلدك التانية'));
      nc.appendChild(el('small', 'cm-sub', 'بلد الأم بتاعتك: ' + mother.nat + '. اختار بلد تانية تلعب فيها مع الناشئين، وبعد أول عقد احترافي هتختار تلعب لأنهي واحدة فيهم.'));
      const pickBtn = el('button', 'cm-btn', 'اختار البلد التانية'); pickBtn.type = 'button';
      pickBtn.addEventListener('click', () => {
        const w = el('div'); w.appendChild(el('div', 'cm-sum-title', 'اختار بلدك التانية'));
        const g = el('div', 'cm-flags');
        (D.NATIONAL || []).filter(n => n[1] !== mother.natCode).slice().sort((a, b) => a[0].localeCompare(b[0], 'ar')).forEach(n => {
          const b = el('button', 'cm-flag-opt'); b.type = 'button';
          const im = document.createElement('img'); im.alt = ''; im.src = 'https://flagcdn.com/w80/' + n[1] + '.png';
          b.append(im, el('span', '', n[0]));
          b.addEventListener('click', () => { if (E.setSecondNation(S, n[1])) { save(); $('cmModal').hidden = true; renderYouth(); } });
          g.appendChild(b);
        });
        w.appendChild(g); openModal(w, 'إغلاق');
      });
      nc.appendChild(pickBtn);
    } else {
      nc.appendChild(el('b', '', 'جنسياتك'));
      nc.appendChild(el('small', 'cm-sub', 'بلد الأم: ' + mother.nat + ' • البلد التانية: ' + p.nat2.nat + '. بعد ما توقّع أول عقد احترافي هتختار تلعب لأنهي واحدة.'));
    }
    box.appendChild(nc);
    box.appendChild(skillsCard(renderYouth));
    const go = el('button', 'cm-btn', y.done ? 'وقّع أول عقد احترافي' : 'كمّل موسم الناشئين'); go.type = 'button'; go.disabled = !p.nat2;
    go.addEventListener('click', () => {
      if (y.done) { E.finishYouth(S, Math.random); save(); render(); return; }
      const r = E.playYouthSeason(S, Math.random); save();
      const w = el('div'); w.appendChild(el('div', 'cm-sum-title', 'خلص موسم الناشئين'));
      w.appendChild(el('p', 'cm-sub', r.apps + ' مباراة • ' + r.goals + ' هدف • ' + r.assists + ' أسيست • تقييم ' + r.rating.toFixed(1) + ' • مستواك +' + r.gain.toFixed(1)));
      (r.news || []).forEach(n => w.appendChild(el('div', 'cm-note ' + (n.k === 'up' ? 'up' : 'down'), n.x)));
      if (S.skillGain) w.appendChild(el('div', 'cm-note up', 'كسبت ' + S.skillGain + ' نقطة مهارة'));
      openModal(w, 'تمام', () => renderYouth()); renderYouth();
    });
    box.appendChild(go);
  }

  function paneClubs() {
    const pane = $('cmPane'); pane.textContent = ''; pane.appendChild(paneHead('الأندية اللي لعبتلها'));
    const rows = {}, order = [];
    function row(id, year) { if (!rows[id]) { rows[id] = { id, seasons: 0, apps: 0, goals: 0, assists: 0, rs: 0, first: year, last: year, titles: 0 }; order.push(id); } rows[id].last = year; return rows[id]; }
    S.history.forEach(h => { const r = row(h.clubId, h.year); r.seasons++; r.apps += h.apps; r.goals += h.goals; r.assists += h.assists; r.rs += (h.avg || 0) * h.apps; });
    const cs = S.stats; if (cs) { const r = row(S.clubId, S.year); if (cs.apps || !S.history.some(h => h.clubId === S.clubId && h.year === S.year)) { r.seasons++; r.apps += cs.apps; r.goals += cs.goals; r.assists += cs.assists; r.rs += cs.ratingSum || 0; } }
    (S.honors || []).forEach(h => { if (h.clubId && rows[h.clubId] && ['league', 'cup', 'cl', 'cwc', 'caf', 'afc'].indexOf(h.type) > -1) rows[h.clubId].titles++; });
    if (!order.length) { pane.appendChild(el('div', 'cm-card cm-soon', 'لسه ماعملتش مسيرة.')); return; }
    order.slice().reverse().forEach(id => {
      const r = rows[id], c = club(id), card = el('div', 'cm-card cm-clubrow');
      const contrib = r.apps ? (r.goals + r.assists) / r.apps : 0, avg = r.apps ? r.rs / r.apps : 0;
      const rate = Math.max(0, Math.min(100, Math.round(contrib * 55 + r.titles * 8 + Math.max(0, avg - 3) * 14)));
      const top = el('div', 'top'); top.append(badge(c), el('b', '', c.ar), el('span', 'cm-rate', rate + '%'));
      const g = el('div', 'cm-sum-grid');
      [['مباريات', r.apps], ['أهداف', r.goals], ['أسيست', r.assists], ['ألقاب', r.titles]].forEach(x => { const d = el('div', 'cm-stat'); d.append(el('small', '', x[0]), el('b', '', String(x[1]))); g.appendChild(d); });
      const bar = el('div', 'bar'); const fi = el('i'); fi.style.width = Math.max(3, rate) + '%'; bar.appendChild(fi);
      card.append(top, el('small', '', r.seasons + ' موسم • من ' + r.first + ' لـ ' + r.last), g, bar,
        el('small', '', 'معدل الإنجاز ' + rate + '% • مساهمة تهديفية ' + contrib.toFixed(2) + ' في المباراة • متوسط التقييم ' + (avg ? avg.toFixed(1) : '-')));
      pane.appendChild(card);
    });
  }

  function paneClubTrophies() {
    const pane = $('cmPane'); pane.textContent = '';
    const c = club(S.clubId), card = el('div', 'cm-card');
    const top = el('div', 'cm-clubrow'); const hd = el('div', 'top'); hd.append(badge(c), el('b', '', 'بطولات ' + c.ar)); top.appendChild(hd);
    const won = (S.honors || []).filter(h => h.clubId === S.clubId && ['league', 'cup', 'cl', 'cwc', 'caf', 'afc'].indexOf(h.type) > -1);
    const cnt = t => won.filter(h => h.type === t).length;
    const g = el('div', 'cm-sum-grid');
    [['دوري', cnt('league')], ['كؤوس', cnt('cup')], ['أوروبا', cnt('cl')], ['عالمية', cnt('cwc') + cnt('caf') + cnt('afc')]].forEach(x => { const d = el('div', 'cm-stat'); d.append(el('small', '', x[0]), el('b', '', String(x[1]))); g.appendChild(d); });
    top.appendChild(g); card.appendChild(top); pane.appendChild(card);
    const hist = S.history.filter(h => h.clubId === S.clubId);
    const lc = el('div', 'cm-card');
    lc.appendChild(el('h3', 'cm-sum-title', 'مواسمك مع النادي')); lc.lastChild.style.fontSize = '.95rem';
    if (!hist.length && !won.length) lc.appendChild(el('div', 'cm-soon', 'لسه ماخلصتش موسم كامل مع النادي ده.'));
    hist.slice().reverse().forEach(h => {
      const r = el('div', 'cm-fx'); r.append(el('span', 'rd', h.year + '/' + String(h.year + 1).slice(2)));
      const w = won.filter(x => x.year === h.year).map(x => x.text);
      const mt = el('div', 'mt', 'المركز ' + h.pos + ' من ' + h.teams); mt.appendChild(el('small', '', h.goals + ' هدف • ' + h.assists + ' أسيست' + (w.length ? ' • ' + w.join('، ') : '')));
      r.appendChild(mt); lc.appendChild(r);
    });
    pane.appendChild(lc);
  }

  function paneMarket() {
    const pane = $('cmPane'); pane.textContent = '';
    const m = S.market;
    if (!m || !m.items || !m.items.length) { const c = el('div', 'cm-card cm-soon'); c.append(el('b', '', 'سوق الانتقالات'), el('div', '', 'مفيش أخبار لسه.')); pane.appendChild(c); return; }
    pane.appendChild(el('div', 'cm-note', 'أخبار صيف ' + m.year + ': اللاعبين بيتنقلوا ويعتزلوا في الأندية كلها حتى لو إنت مش طرف فيها، وده بيأثر على قوة الفرق.'));
    const card = el('div', 'cm-card');
    m.items.forEach(it => {
      const row = el('div', 'cm-mk' + (it.mine ? ' mine' : ''));
      if (it.t === 'tr') {
        const f = club(it.from), t = club(it.to);
        const top = el('div', 'cm-mk-top'); top.append(el('b', '', it.n), el('span', 'cm-mk-fee', fmt(it.fee) + ' مليون ' + it.cur));
        const mv = el('div', 'cm-mk-mv'); mv.append(badge(f), el('span', '', f.ar), el('i', 'cm-mk-ar', '←'), badge(t), el('span', '', t.ar));
        row.append(top, mv);
      } else {
        const c = club(it.club);
        const top = el('div', 'cm-mk-top'); top.append(el('b', '', it.n), el('span', 'cm-mk-ret', 'اعتزل'));
        const mv = el('div', 'cm-mk-mv'); mv.append(badge(c), el('span', '', c.ar + ' • ' + it.age + ' سنة'));
        row.append(top, mv);
      }
      card.appendChild(row);
    });
    pane.appendChild(card);
  }

  /* ====== أرشيف المسيرة ====== */
  function lineChart(vals, labels) {
    const W = 320, H = 130, pad = 22, n = vals.length;
    const lo = Math.floor(Math.min.apply(null, vals) - 2), hi = Math.ceil(Math.max.apply(null, vals) + 2);
    const x = i => n === 1 ? W / 2 : pad + i * (W - pad * 2) / (n - 1), y = v => H - pad - (v - lo) / Math.max(1, hi - lo) * (H - pad * 2);
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="cm-chart" role="img" aria-label="مستواك عبر المواسم">';
    svg += '<line x1="' + pad + '" y1="' + (H - pad) + '" x2="' + (W - pad) + '" y2="' + (H - pad) + '" stroke="currentColor" opacity=".25"/>';
    svg += '<polyline fill="none" stroke="#ffcc3d" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" points="' + vals.map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ') + '"/>';
    vals.forEach((v, i) => {
      svg += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="3.6" fill="#ffcc3d"/>';
      if (n <= 9 || i === 0 || i === n - 1) svg += '<text x="' + x(i).toFixed(1) + '" y="' + (y(v) - 8).toFixed(1) + '" font-size="10" text-anchor="middle" fill="currentColor">' + Math.floor(v) + '</text>';
    });
    svg += '<text x="' + pad + '" y="' + (H - 6) + '" font-size="9" fill="currentColor" opacity=".7">' + labels[0] + '</text>';
    if (n > 1) svg += '<text x="' + (W - pad) + '" y="' + (H - 6) + '" font-size="9" text-anchor="end" fill="currentColor" opacity=".7">' + labels[n - 1] + '</text>';
    return svg + '</svg>';
  }

  function shareArchive() {
    const H = S.history || [], p = S.player, tt = S.totals || { apps: 0, goals: 0, assists: 0 };
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350;
    const g = cv.getContext('2d'); g.direction = 'rtl'; g.textAlign = 'center';
    const bg = g.createLinearGradient(0, 0, 0, 1350); bg.addColorStop(0, '#14213d'); bg.addColorStop(1, '#0b1224');
    g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350);
    g.fillStyle = '#ffcc3d'; g.font = '700 40px sans-
