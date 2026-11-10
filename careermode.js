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
  const sel = { color: COLORS[0], pos: 'ST', start: 'eng3', photo: null, nat: ['مصر', 'eg'] };
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
    ['cmMode', 'cmCreate', 'cmGame', 'cmAwards', 'cmSeason', 'cmRetire', 'cmSign', 'cmSummer'].forEach(k => { $(k).hidden = k !== id; });
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
      S = E.newCareer({ name, nat: sel.nat[0], natCode: sel.nat[1], pos: sel.pos, color: sel.color, start: sel.start, photo: sel.photo }, Math.random);
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
          body.appendChild(el('small', 'cm-sub', eff.join(' • ')));
        } else if (press.opts[press.done]) body.appendChild(el('div', 'cm-press-r', 'قلت: ' + press.opts[press.done].t + (press.reply ? ' — ' + press.reply : '')));
        return;
      }
      if (typing) {
        const ta = el('textarea', 'cm-press-ta'); ta.maxLength = 200; ta.rows = 3; ta.placeholder = 'اكتب ردك بحرية (حتى 200 حرف)…';
        const row = el('div', 'cm-row');
        const go = el('button', 'cm-btn', 'ابعت ردك'); go.type = 'button';
        const back = el('button', 'cm-btn ghost', 'رجوع للاختيارات'); back.type = 'button';
        go.addEventListener('click', () => {
          const r = E.answerFree(S, press, ta.value, Math.random);
          if (!r) { toast('اكتب ردك الأول', 'bad'); return; }
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

  function paneHome() {
    const pane = $('cmPane'); pane.textContent = '';
    const myRounds = E.rounds(S.league);
    const card = el('div', 'cm-card cm-next');

    const due = E.nextExtraInfo(S);
    if ((S.seasonOver || S.round >= myRounds) && !due) {
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
      const ic = el('div', 'cm-card cm-cup'); const nt = E.ntOf(S);
      ic.append(el('b', '', 'لاعب في منتخب ' + (nt ? nt.ar : '')), el('small', 'cm-sub', S.intl.caps + ' مباراة دولية • ' + S.intl.goals + ' هدف • ' + S.intl.assists + ' أسيست'));
      pane.appendChild(ic);
    }
    const last = S.log[S.log.length - 1];
    if (last) {
      const c = el('div', 'cm-card cm-fx click'); c.tabIndex = 0; c.addEventListener('click', () => openModal(reportNode(last), 'تمام'));
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
      if (i >= n - 3) tr.classList.add('down');
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

  function paneClubs() {
    const pane = $('cmPane'); pane.textContent = ''; pane.appendChild(paneHead('الأندية اللي لعبتلها'));
    const rows = {}, order = [];
    function row(id, year) { if (!rows[id]) { rows[id] = { id, seasons: 0, apps: 0, goals: 0, assists: 0, rs: 0, first: year, last: year, titles: 0 }; order.push(id); } rows[id].last = year; return rows[id]; }
    S.history.forEach(h => { const r = row(h.clubId, h.year); r.seasons++; r.apps += h.apps; r.goals += h.goals; r.assists += h.assists; r.rs += (h.avg || 0) * h.apps; });
    const cs = S.stats; if (cs) { const r = row(S.clubId, S.year); if (cs.apps || !S.history.some(h => h.clubId === S.clubId && h.year === S.year)) { r.seasons++; r.apps += cs.apps; r.goals += cs.goals; r.assists += cs.assists; r.rs += cs.ratingSum || 0; } }
    (S.honors || []).forEach(h => { if (h.clubId && rows[h.clubId] && ['league', 'cup', 'cl', 'cwc', 'caf'].indexOf(h.type) > -1) rows[h.clubId].titles++; });
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
    const won = (S.honors || []).filter(h => h.clubId === S.clubId && ['league', 'cup', 'cl', 'cwc', 'caf'].indexOf(h.type) > -1);
    const cnt = t => won.filter(h => h.type === t).length;
    const g = el('div', 'cm-sum-grid');
    [['دوري', cnt('league')], ['كؤوس', cnt('cup')], ['أوروبا', cnt('cl')], ['عالمية', cnt('cwc') + cnt('caf')]].forEach(x => { const d = el('div', 'cm-stat'); d.append(el('small', '', x[0]), el('b', '', String(x[1]))); g.appendChild(d); });
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
    g.fillStyle = '#ffcc3d'; g.font = '700 40px sans-serif'; g.fillText('KORA CHALLENGE', 540, 90);
    g.fillStyle = '#fff'; g.font = '800 84px sans-serif'; g.fillText(p.name, 540, 220);
    g.fillStyle = '#9fb0d0'; g.font = '600 36px sans-serif'; g.fillText(p.nat + ' • ' + p.pos + ' • ' + Math.floor(p.ovr) + ' OVR • ' + p.age + ' سنة', 540, 285);
    [['مباريات', tt.apps], ['أهداف', tt.goals], ['أسيست', tt.assists], ['بطولات', (S.honors || []).length]].forEach((x, i) => {
      const cx = 855 - i * 210; g.fillStyle = '#ffcc3d'; g.font = '800 78px sans-serif'; g.fillText(String(x[1]), cx, 440);
      g.fillStyle = '#9fb0d0'; g.font = '600 32px sans-serif'; g.fillText(x[0], cx, 490);
    });
    if (H.length) {
      const vals = H.map(h => h.ovrAfter), lo = Math.min.apply(null, vals) - 2, hi = Math.max.apply(null, vals) + 2;
      const X = i => H.length === 1 ? 540 : 120 + i * 840 / (H.length - 1), Y = v => 1000 - (v - lo) / Math.max(1, hi - lo) * 380;
      g.strokeStyle = '#ffcc3d'; g.lineWidth = 7; g.lineJoin = 'round'; g.beginPath();
      vals.forEach((v, i) => { if (i) g.lineTo(X(i), Y(v)); else g.moveTo(X(i), Y(v)); }); g.stroke();
      g.fillStyle = '#ffcc3d'; g.font = '700 30px sans-serif';
      vals.forEach((v, i) => { g.beginPath(); g.arc(X(i), Y(v), 10, 0, 6.3); g.fill(); if (H.length <= 12 || i % 2 === 0) g.fillText(String(Math.floor(v)), X(i), Y(v) - 22); });
      g.fillStyle = '#9fb0d0'; g.font = '600 30px sans-serif'; g.fillText('مستواك من ' + H[0].year + ' لحد ' + H[H.length - 1].year, 540, 1090);
    }
    g.fillStyle = '#6f7f9f'; g.font = '600 28px sans-serif'; g.fillText('مسيرتي في Kora Challenge', 540, 1280);
    cv.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], 'my-career.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'مسيرتي في Kora Challenge' }).catch(() => {}); return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-career.png';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
  }

  function paneArchive() {
    const pane = $('cmPane'); pane.textContent = ''; pane.appendChild(paneHead('أرشيف مسيرتي'));
    const H = S.history || [];
    if (!H.length) { const c = el('div', 'cm-card cm-soon'); c.append(el('b', '', 'لسه مخلصتش موسم'), el('div', '', 'إحصائياتك ورسم مستواك هيظهروا هنا بعد أول موسم.')); pane.appendChild(c); return; }
    const tt = S.totals || { apps: 0, goals: 0, assists: 0 };
    const top = el('div', 'cm-card'); const g = el('div', 'cm-sum-grid');
    [['مواسم', H.length], ['مباريات', tt.apps], ['أهداف', tt.goals], ['أسيست', tt.assists], ['بطولات', (S.honors || []).length], ['مستواك', Math.floor(S.player.ovr)]].forEach(x => {
      const d = el('div', 'cm-stat'); d.append(el('small', '', x[0]), el('b', '', String(x[1]))); g.appendChild(d);
    });
    top.appendChild(g); pane.appendChild(top);

    const ch = el('div', 'cm-card'); ch.appendChild(el('b', '', 'مستواك عبر المواسم'));
    const box = el('div'); box.innerHTML = lineChart(H.map(h => h.ovrAfter), H.map(h => String(h.year))); ch.appendChild(box); pane.appendChild(ch);

    const tb = el('div', 'cm-card cm-arch');
    H.slice().reverse().forEach(h => {
      const c = S.clubs[h.clubId], r = el('div', 'cm-arch-row');
      const head = el('div', 'cm-arch-head'); head.append(el('b', '', h.year + '/' + String(h.year + 1).slice(2)), el('span', '', (c ? c.ar : '') + (h.champion ? ' 🏆' : '')));
      const st = el('small', 'cm-sub', 'المركز ' + h.pos + ' • ' + h.apps + ' مباراة • ' + h.goals + ' هدف • ' + h.assists + ' أسيست • تقييم ' + (h.avg ? h.avg.toFixed(1) : '-') + ' • مستوى ' + Math.floor(h.ovrAfter));
      r.append(head, st);
      if (h.exit) r.appendChild(el('small', 'cm-arch-exit', h.exit.type === 'fired' ? 'اتفسخ عقدك' : 'رفض التجديد'));
      tb.appendChild(r);
    });
    pane.appendChild(tb);
    const sh = el('button', 'cm-btn', 'شارك مسيرتك كصورة'); sh.type = 'button'; sh.addEventListener('click', shareArchive); pane.appendChild(sh);
  }

  /* ====== لوحة الأدمن (للحساب بتاعك بس) ====== */
  const isAdmin = () => !!(window.KoraAdmin && window.KoraAdmin.me());
  function adminCard() {
    const c = el('div', 'cm-card cm-admin');
    c.appendChild(el('h3', 'cm-sum-title', '🛠 لوحة الأدمن'));
    c.appendChild(el('small', 'cm-sub', 'ظاهرة لحسابك إنت بس'));

    c.appendChild(el('b', 'cm-adm-h', 'الجوايز اللي عايز تكسبها نهاية الموسم'));
    const AW = [['ballon', 'الكرة الذهبية'], ['boot', 'الحذاء الذهبي'], ['glove', 'القفاز الذهبي'], ['kopa', 'جايزة كوبا'], ['club', 'أفضل نادي في العام']];
    const grid = el('div', 'cm-adm-grid');
    AW.forEach(a => {
      const lab = el('label', 'cm-adm-chk'), cb = el('input'); cb.type = 'checkbox'; cb.checked = (S.adminAwards || []).indexOf(a[0]) > -1;
      cb.addEventListener('change', () => {
        const set = new Set(S.adminAwards || []); if (cb.checked) set.add(a[0]); else set.delete(a[0]);
        S.adminAwards = Array.from(set); save(); toast(cb.checked ? 'هتكسب ' + a[1] + ' نهاية الموسم' : 'اتلغت ' + a[1], 'up');
      });
      lab.append(cb, el('span', '', a[1])); grid.appendChild(lab);
    });
    c.appendChild(grid);

    c.appendChild(el('b', 'cm-adm-h', 'طاقة اللاعب (الحالية ' + Math.max(0, 100 - Math.round(S.fatigue || 0)) + '%)'));
    const er = el('div', 'cm-row'), ei = el('input', 'cm-adm-in'); ei.type = 'number'; ei.min = '0'; ei.max = '100'; ei.placeholder = 'تزيد قد إيه؟ (0-100)'; ei.inputMode = 'numeric';
    const eb = el('button', 'cm-btn', 'زوّد الطاقة'); eb.type = 'button';
    eb.addEventListener('click', () => {
      const n = Math.max(0, Math.min(100, Math.floor(Number(ei.value) || 0)));
      if (!n) { toast('اكتب رقم الأول', 'bad'); return; }
      S.fatigue = Math.max(0, (S.fatigue || 0) - n); save(); render(); toast('الطاقة زادت ' + n + '%', 'up');
    });
    er.append(ei, eb); c.appendChild(er);

    c.appendChild(el('b', 'cm-adm-h', 'فلوسك (الحالية ' + money(S.money) + ')'));
    const mr = el('div', 'cm-row'), mi = el('input', 'cm-adm-in'); mi.type = 'number'; mi.min = '0'; mi.placeholder = 'المبلغ بالـ €'; mi.inputMode = 'numeric';
    const setB = el('button', 'cm-btn', 'اضبط'), addB = el('button', 'cm-btn ghost', 'زوّد'); setB.type = addB.type = 'button';
    const amt = () => { const v = Math.floor(Number(mi.value)); return isFinite(v) && v >= 0 ? Math.min(v, 1e12) : null; };
    setB.addEventListener('click', () => { const v = amt(); if (v == null) { toast('اكتب مبلغ صحيح', 'bad'); return; } S.money = v; save(); render(); toast('الفلوس بقت ' + money(v), 'up'); });
    addB.addEventListener('click', () => { const v = amt(); if (v == null) { toast('اكتب مبلغ صحيح', 'bad'); return; } S.money = Math.min(1e12, (S.money || 0) + v); save(); render(); toast('اتضاف ' + money(v), 'up'); });
    mr.append(mi, setB, addB); c.appendChild(mr);
    return c;
  }

  function paneSoon(title) {
    const pane = $('cmPane'); pane.textContent = '';
    const c = el('div', 'cm-card cm-soon');
    c.appendChild(el('b', '', title));
    c.appendChild(el('div', '', 'القسم ده هيتضاف قريبًا.'));
    pane.appendChild(c);
  }

  function renderPane() {
    $('cmTabs').querySelectorAll('.cm-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (tab === 'home') paneHome();
    else if (tab === 'table') paneTable();
    else if (tab === 'fixtures') paneFixtures();
    else if (tab === 'trophies') paneHonors();
    else if (tab === 'assets') paneAssets();
    else if (tab === 'clubs') paneClubs();
    else if (tab === 'market') paneMarket();
    else if (tab === 'archive') paneArchive();
    else paneClubTrophies();
  }

  /* ====== اللعب ====== */
  function evText(e) {
    switch (e.t) {
      case 'goal': return ['سجلت هدف' + (e.pen ? ' من ضربة جزاء' : '') + '!', 'good mine'];
      case 'assist': return ['صنعت هدف لزميلك', 'good mine'];
      case 'yellow': return ['اتحذرت بكارت أصفر', 'bad'];
      case 'red': return ['اتطردت بكارت أحمر', 'bad mine'];
      case 'pw': return ['جبت ضربة جزاء لفريقك', 'good'];
      case 'pc': return ['تسببت في ضربة جزاء ضد فريقك', 'bad'];
      case 'pen_miss': return ['ضيعت ضربة الجزاء', 'bad mine'];
      case 'on': return ['نزلت بديل', ''];
      case 'off': return ['اتبدلت', ''];
      case 'tg': return ['هدف لفريقك', 'good'];
      case 'og': return ['هدف للخصم', 'bad'];
      default: return ['', ''];
    }
  }

  function reportNode(pm, multi) {
    const wrap = el('div');
    const myHome = isMine(pm.home);
    const sc = el('div', 'cm-score');
    sc.append(el('span', '', club(pm.home).ar), el('span', 'num', pm.hg + ' - ' + pm.ag), el('span', '', club(pm.away).ar));
    wrap.appendChild(sc);
    const cmp = pm.comp ? (pm.cupName || pm.cn || 'دوري الأبطال') + ' • ' + (pm.stageText || pm.st || E.STAGE_AR[pm.stage] || '') : 'الجولة ' + pm.round;
    wrap.appendChild(el('div', 'cm-sub', cmp + ' • ' + (myHome ? 'على ملعبك' : 'خارج الأرض')));
    if (pm.pens) wrap.appendChild(el('div', 'cm-sub', 'اتحسمت بركلات الترجيح ' + (myHome ? pm.pens[0] + ' - ' + pm.pens[1] : pm.pens[1] + ' - ' + pm.pens[0]) + ' لصالح ' + (pm.pens[0] > pm.pens[1] ? club(myHome ? pm.home : pm.away).ar : 'الخصم')));
    let role;
    if (pm.role === 'start') role = 'المدرب أشركك أساسي' + (pm.b < 90 ? ' واتبدلت في الدقيقة ' + pm.b : '') + ' • ' + pm.minutes + ' دقيقة';
    else if (pm.role === 'sub') role = 'المدرب نزّلك بديل في الدقيقة ' + pm.a + ' • ' + pm.minutes + ' دقيقة';
    else if (pm.role === 'bench') role = 'المدرب سابك على الدكة ومنزلكش';
    else role = 'المدرب استبعدك من قايمة المباراة';
    wrap.appendChild(el('div', 'cm-role', role));
    if (pm.rating != null) {
      const rr = el('div', 'cm-rating ' + ratingClass(pm.rating));
      rr.append(el('b', '', pm.rating.toFixed(1)), el('small', '', 'من 5'));
      wrap.appendChild(rr);
    }
    if (pm.bonus > 0 || pm.motm) wrap.appendChild(el('div', 'cm-note up', (pm.motm ? 'رجل المباراة! ' : '') + (pm.bonus > 0 ? 'مكافآت عقدك: +' + money(pm.bonus) : '')));
    (pm.news || []).forEach(n => wrap.appendChild(el('div', 'cm-note ' + n.k, n.x)));
    if (pm.press) wrap.appendChild(pressBox(pm.press));
    const evs = el('div', 'cm-events');
    (pm.events || []).forEach(e => {
      const t = evText(e); if (!t[0]) return;
      const r = el('div', 'cm-ev ' + t[1]);
      r.append(el('span', 'min', e.m + '’'), el('span', '', t[0]));
      evs.appendChild(r);
    });
    if (!evs.children.length) evs.appendChild(el('div', 'cm-ev', 'مباراة هادية من غير أهداف.'));
    wrap.appendChild(evs);
    try { wrap.appendChild(lineupsNode(E.matchLineups(S, pm))); } catch (e) { /* ignore */ }
    return wrap;
  }

  function lineupSide(sd) {
    const box = el('div', 'cm-lu');
    const hd = el('div', 'cm-lu-h'); hd.append(badge(club(sd.id)), el('b', '', club(sd.id).ar), el('span', 'cm-lu-fm', sd.fm));
    box.appendChild(hd);
    const pitch = el('div', 'cm-lu-pitch');
    sd.rows.slice().reverse().forEach(r => {
      const row = el('div', 'cm-lu-row');
      r.forEach(p => { const x = el('div', 'cm-lu-p' + (p.me ? ' me' : '')); x.append(el('i'), el('span', '', p.n)); row.appendChild(x); });
      pitch.appendChild(row);
    });
    const g = el('div', 'cm-lu-row'), gp = el('div', 'cm-lu-p' + (sd.gk.me ? ' me' : '')); gp.append(el('i'), el('span', '', sd.gk.n)); g.appendChild(gp);
    pitch.appendChild(g);
    box.appendChild(pitch);
    if (sd.note) box.appendChild(el('div', 'cm-lu-note', sd.note));
    return box;
  }
  function lineupsNode(lu) {
    const w = el('div', 'cm-lus');
    w.appendChild(el('div', 'cm-sum-title', 'التشكيلة'));
    w.append(lineupSide(lu.home), lineupSide(lu.away));
    return w;
  }

  function openModal(node, btnText, onClose) {
    const sheet = $('cmSheet'); sheet.textContent = '';
    sheet.appendChild(node);
    const b = el('button', 'cm-btn', btnText || 'تمام'); b.type = 'button';
    b.addEventListener('click', () => { $('cmModal').hidden = true; if (onClose) onClose(); });
    sheet.appendChild(b);
    $('cmModal').hidden = false;
    b.focus();
  }

  function showCallup() {
    const c = S.pendingCallup; if (!c) return;
    S.pendingCallup = null; save();
    const nt = club(c.nat), w = el('div', 'cm-callup');
    w.append(badge(nt), el('h2', '', 'استدعاء للمنتخب!'), el('p', 'cm-sub', 'مستواك الكويس خلّى مدرب ' + nt.ar + ' يستدعيك. شاركت معاه في مباراتين:'));
    c.matches.forEach(pm => {
      const r = el('div', 'cm-tmatch'); const opp = club(pm.home === c.nat ? pm.away : pm.home);
      r.append(el('span', 'st', pm.stageText), el('span', 'mt', nt.ar + ' ' + (pm.home === c.nat ? pm.hg + ' - ' + pm.ag : pm.ag + ' - ' + pm.hg) + ' ' + opp.ar + (pm.goals ? ' • ' + pm.goals + ' هدف' : '')),
        el('span', 'rt', pm.rating != null ? pm.rating.toFixed(1) : outTxt(pm)));
      w.appendChild(r);
    });
    openModal(w, 'يلا نكمل');
  }
  function playRounds(n) {
    const reports = [];
    const myRounds = E.rounds(S.league);
    for (let i = 0; i < n && (S.round < myRounds || E.nextExtra(S)); i++) {
      const rep = E.playRound(S, Math.random);
      if (rep.my) reports.push(rep.my);
      if (S.pendingCallup) break;
    }
    if (window.KoraStreak) window.KoraStreak.touch();
    if (reports.some(r => r.goals > 0)) buzz(45);
    if (reports.length > 1) reports.forEach(pm => (pm.news || []).forEach(n => toast(n.x, n.k)));
    if (reports.some(r => r.injury)) buzz([80, 40, 80]);
    save();
    renderPlayer(); renderPane();
    if (!reports.length) { showCallup(); return; }
    if (reports.length === 1) { openModal(reportNode(reports[0]), 'تمام', showCallup); return; }
    const wrap = el('div', 'cm-multi');
    wrap.appendChild(el('div', 'cm-sum-title', 'ملخص ' + reports.length + ' جولات'));
    const evs = el('div', 'cm-events');
    let bonus = 0;
    reports.forEach(pm => {
      bonus += pm.bonus || 0;
      const r = el('div', 'cm-ev');
      const left = el('span', '', (pm.comp ? (pm.cupName || 'أوروبا') : 'ج' + pm.round) + ' • ' + club(pm.home).ar + ' ' + pm.hg + '-' + pm.ag + ' ' + club(pm.away).ar);
      const right = el('span', '', pm.rating != null ? pm.rating.toFixed(1) + (pm.goals ? ' • ' + pm.goals + ' هدف' : '') + (pm.assists ? ' • ' + pm.assists + ' أسيست' : '') : outTxt(pm));
      r.append(left, right); evs.appendChild(r);
    });
    wrap.appendChild(evs);
    if (bonus > 0) wrap.appendChild(el('div', 'cm-note up', 'مكافآت عقدك في الجولات دي: +' + money(bonus)));
    openModal(wrap, (S.seasonOver || S.round >= myRounds) && !E.nextExtra(S) ? 'كمّل' : 'تمام', showCallup);
  }

  /* ====== نهاية الموسم ====== */
  function endSeason() {
    E.finishSeason(S, Math.random);
    if (!S.pointsGiven) { saveStats(S.summary.points); S.pointsGiven = true; }
    save(); render();
  }

  const AW_ICONS = {
    ballon: '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" stroke-width="4"/><path d="m32 19 11 8-4 13H25l-4-13Z" fill="currentColor"/><path d="m32 19-1-11M43 27l12-4M39 40l7 11M25 40l-7 11M21 27 9 23" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/></svg>',
    boot: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 40c0-6 3-9 8-9l6-12h9l2 12 14 4c5 1.4 8 4 8 9v4H8z" fill="currentColor"/><path d="M14 52h4M24 52h4M34 52h4M44 52h4" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>',
    kopa: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 8h28v14c0 9-6 15-14 15s-14-6-14-15z" fill="currentColor"/><path d="M18 12H8c0 9 4 14 11 15M46 12h10c0 9-4 14-11 15" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/><path d="M32 37v10M22 56h20M25 47h14v9H25z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    club: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 6 10 14v16c0 15 9 24 22 28 13-4 22-13 22-28V14z" fill="currentColor"/><path d="m32 20 4 8 9 1-6.5 6 1.7 9L32 40l-8.2 4 1.7-9-6.5-6 9-1z" fill="#04110a"/></svg>',
    glove: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 58V40L10 28l5-5 7 8V12a4 4 0 0 1 8 0v14h2V8a4 4 0 0 1 8 0v18h2V12a4 4 0 0 1 8 0v26c0 12-6 20-16 20z" fill="currentColor"/></svg>'
  };
  function confetti(host) {
    const cols = ['#f6c445', '#24e982', '#ff7a59', '#8b5cf6', '#2f7cf6', '#fff'];
    for (let i = 0; i < 26; i++) {
      const c = el('i', 'cm-confetti'); c.style.left = Math.random() * 100 + '%'; c.style.background = cols[i % cols.length];
      c.style.animationDelay = (Math.random() * 0.6) + 's'; host.appendChild(c); setTimeout(() => c.remove(), 3400);
    }
  }
  function compareNode(w, name) {
    const box = el('div', 'cm-cmp');
    w.cands.forEach((c, i) => {
      const r = el('div', 'cm-cmp-row' + (i === 0 ? ' win' : '') + (c.mine ? ' me' : ''));
      const nm = el('div', 'nm'); nm.appendChild(document.createTextNode(c.name + (c.mine ? ' (إنت)' : '')));
      nm.appendChild(el('small', '', (name === 'club' ? '' : (S.clubs[c.clubId] ? S.clubs[c.clubId].ar + ' • ' : '')) + c.stat));
      r.append(el('span', 'r', String(i + 1)), nm, el('span', 'sc', c.score + ' نقطة'));
      box.appendChild(r);
    });
    if (w.myRank > 5) box.appendChild(el('div', 'cm-cmp-row me', 'ترتيبك: المركز ' + w.myRank));
    else if (w.myRank === 0 && name !== 'club') box.appendChild(el('div', 'cm-sub', 'ماكنتش ضمن المرشحين الموسم ده (مباريات قليلة أو برة أوروبا).'));
    return box;
  }
  function renderAwards() {
    clearTimeout(awTimer);
    const box = $('cmAwards'); box.textContent = '';
    const sm = S.summary, aw = S.awards;
    const cere = el('div', 'cm-cere');
    cere.append(el('small', '', 'موسم ' + sm.year + '/' + String(sm.year + 1).slice(2)), el('h2', '', 'حفل جوائز الموسم'));
    box.appendChild(cere);
    const lg = LG[sm.league].ar;
    const defs = [['club', 'أفضل نادي في العام', 'نادي العام في العالم'], ['kopa', 'جايزة كوبا', 'أحسن لاعب تحت 21 سنة في أوروبا'],
      ['glove', 'القفاز الذهبي', 'أحسن حارس في ' + lg], ['boot', 'الحذاء الذهبي', 'هداف ' + lg], ['ballon', 'الكرة الذهبية', 'أحسن لاعب في أوروبا والعالم']];
    const items = [];
    defs.forEach(a => {
      const w = aw[a[0]], wrap = el('div', 'cm-aw' + (w && w.mine ? ' mine' : '') + (!w ? ' na' : '')); wrap.hidden = true;
      const card = el('div', 'cm-card cm-award' + (w && w.mine ? ' mine' : ''));
      const ic = el('div', 'cm-award-ic'); ic.innerHTML = AW_ICONS[a[0]];
      const info = el('div', 'cm-award-info');
      info.append(el('small', '', a[2]), el('b', 'cm-award-t', a[1]));
      if (!w) {
        info.appendChild(el('small', 'cm-award-club', a[0] === 'glove' ? 'بتتوزع على الحراس في الدرجة الأولى بس.' : a[0] === 'boot' ? 'بتتوزع على هدافي الدرجة الأولى بس (إنت في درجة أدنى).' : 'مفيش مرشحين الموسم ده.'));
        card.append(ic, info);
      } else {
        const who = el('div', 'cm-award-who');
        who.append(badge(club(w.clubId)), el('span', 'cm-award-name', w.name));
        if (w.mine) who.appendChild(el('span', 'cm-award-me', a[0] === 'club' ? 'ناديك!' : 'إنت!'));
        info.appendChild(who);
        info.append(el('small', 'cm-award-club', (a[0] === 'club' ? '' : club(w.clubId).ar + ' • ') + w.stat));
        if (a[0] === 'ballon' && aw.ballonEligible === false) info.appendChild(el('small', 'cm-award-club', 'الكرة الذهبية بتتدي للاعيبة أوروبا بس، وإنت بتلعب برة أوروبا.'));
        const tg = el('button', 'cm-link cm-cmp-toggle', 'شوف المقارنة'); tg.type = 'button';
        let cmp = null;
        tg.addEventListener('click', () => { if (cmp) { cmp.remove(); cmp = null; tg.textContent = 'شوف المقارنة'; } else { cmp = compareNode(w, a[0]); card.appendChild(cmp); tg.textContent = 'اخفي المقارنة'; } });
        info.appendChild(tg);
        card.append(ic, info);
      }
      wrap.appendChild(card); box.appendChild(wrap); items.push(wrap);
    });
    const tail = el('div'); tail.hidden = true; box.appendChild(tail);
    const skip = el('button', 'cm-btn', 'تخطي العرض'); skip.type = 'button'; fixBtn(skip); box.appendChild(skip);
    let finished = false, cinDone = false;
    const needCin = () => !!(aw.ballon && aw.ballon.mine && !cinDone && window.KoraCinema);
    const runCin = after => {
      cinDone = true; clearTimeout(awTimer);
      window.KoraCinema.ballon({ name: S.player.name, club: club(S.clubId).ar, goals: sm.goals, assists: sm.assists, avg: sm.avg, year: sm.year, avatar: avatarHTML(S.player),
        cands: (aw.ballon.cands || []).map(c => c.name) }, after);
    };
    function finish() {
      clearTimeout(awTimer); finished = true; skip.textContent = 'كمّل';
      items.forEach(it => { it.hidden = false; it.classList.add('in'); });
      tail.hidden = false;
      if (tail.childNodes.length) return;
      const won = ['ballon', 'boot', 'glove', 'kopa', 'club'].filter(k => aw[k] && aw[k].mine).length;
      const wc = el('div', 'cm-card'); wc.appendChild(el('h3', 'cm-sum-title', 'أبطال الموسم حول العالم')); wc.lastChild.style.fontSize = '.95rem';
      const wl = el('div', 'cm-world');
      (sm.worldChamps || []).forEach(w => {
        const r = el('div', 'row'); const parts = [(S.clubs[w.champ] ? S.clubs[w.champ].ar : '')].concat(w.cups.map(c => c.ar + ': ' + (S.clubs[c.id] ? S.clubs[c.id].ar : '')));
        const sp = el('span'); sp.innerHTML = ic('trophy') + ' '; sp.append(parts.join(' • '));
        r.append(el('b', '', LG[w.lk].ar), sp); wl.appendChild(r);
      });
      wc.appendChild(wl); tail.appendChild(wc);
      tail.appendChild(el('div', 'cm-note', won ? 'مبروك! كسبت ' + won + (won === 1 ? ' جايزة' : ' جوايز') + ' وفيه نقاط زيادة اتضافت لرصيدك.' : 'ماكسبتش جوايز الموسم ده. الجوايز بتتحسم بالأرقام (أهداف وأسيست وتقييم وبطولات) قدام كل لاعيبة العالم، فكمّل وحسّن مستواك.'));
    }
    skip.addEventListener('click', () => {
      if (finished) { E.continueAfterAwards(S); save(); render(); return; }
      if (needCin()) runCin(finish); else finish();
    });
    function reveal(i) {
      if (i >= items.length) { awTimer = setTimeout(finish, 600); return; }
      if (defs[i][0] === 'ballon' && needCin()) { runCin(() => reveal(i)); return; }
      const it = items[i]; it.hidden = false; void it.offsetWidth; it.classList.add('in');
      try { it.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) { /* ignore */ }
      if (it.classList.contains('mine')) { confetti(it); buzz([60, 40, 90]); }
      awTimer = setTimeout(() => reveal(i + 1), 1000);
    }
    awTimer = setTimeout(() => reveal(0), 700);
  }

  function renderSeason() {
    const box = $('cmSeason'); box.textContent = '';
    const sm = S.summary, c = club(sm.clubId);
    const card = el('div', 'cm-card');
    card.appendChild(el('div', 'cm-sub', 'موسم ' + sm.year + '/' + String(sm.year + 1).slice(2)));
    card.appendChild(el('h2', 'cm-sum-title', sm.champion ? 'بطل الدوري!' : 'خلصت في المركز ' + sm.pos + ' من ' + sm.teams));
    card.appendChild(el('div', 'cm-sub', c.ar + ' • ' + LG[sm.league].ar));
    const g = el('div', 'cm-sum-grid');
    [['مباريات', sm.apps], ['أهداف', sm.goals], ['أسيست', sm.assists], ['التقييم', sm.avg ? sm.avg.toFixed(1) : '-'], ['أصفر', sm.yellow], ['أحمر', sm.red]].forEach(x => {
      const d = el('div', 'cm-stat'); d.append(el('small', '', x[0]), el('b', '', String(x[1]))); g.appendChild(d);
    });
    card.appendChild(g);
    const d = Math.round((sm.ovrAfter - sm.ovrBefore) * 10) / 10;
    card.appendChild(el('div', 'cm-note', 'طاقتك: ' + Math.floor(sm.ovrBefore) + ' ← ' + Math.floor(sm.ovrAfter) + (d >= 0 ? ' (+' + d + ')' : ' (' + d  + ')') + ' • عمرك ' + sm.age));
    if (sm.euro && sm.euro.text) card.appendChild(el('div', 'cm-note' + (sm.euro.status === 'champ' ? ' up' : ''), 'دوري الأبطال: ' + sm.euro.text));
    if (sm.exit) {
      const ex = el('div', 'cm-card cm-exit');
      if (sm.exit.type === 'fired') {
        ex.append(el('h3', 'cm-sum-title', 'النادي فسخ عقدك!'),
          el('div', 'cm-note', 'أداءك الموسم ده كان وحش جدًا فـ' + c.ar + ' قرر ينهي العقد قبل ميعاده (فاضل ' + sm.exit.yearsLeft + ' سنة).'),
          el('div', 'cm-prize', 'الشرط الجزائي اللي النادي دفعهولك'), el('b', 'cm-note up', '+' + money(sm.exit.severance)));
      } else {
        ex.append(el('h3', 'cm-sum-title', 'النادي رفض يجدد عقدك'),
          el('div', 'cm-note', 'عقدك خلص وأداءك مقنعش إدارة ' + c.ar + '، فمش هيجددولك. لازم تدوّر على نادي جديد.'));
      }
      card.appendChild(ex);
    }
    const qk = S.euroQual && S.euroQual[S.clubId];
    if (qk) card.appendChild(el('div', 'cm-note up', qk === 'cl' ? 'ناديك اتأهل لدوري أبطال أوروبا الموسم الجاي!' : 'ناديك هيلعب تصفيات دوري الأبطال الموسم الجاي.'));
    if (sm.moved === 'up') card.appendChild(el('div', 'cm-note up', 'ناديك طلع للدرجة الأعلى في الموسم الجاي!'));
    if (sm.moved === 'down') card.appendChild(el('div', 'cm-note down', 'ناديك هبط للدرجة الأقل في الموسم الجاي.'));
    if (sm.injuries) card.appendChild(el('div', 'cm-note down', 'إصابات الموسم: ' + sm.injuries + ' • غبت عن ' + sm.missed + ' مباراة'));
    (sm.cups || []).forEach(cp => card.appendChild(el('div', 'cm-note' + (cp.status === 'champ' ? ' up' : ''), cp.result)));
    card.appendChild(el('div', 'cm-note', '+' + sm.points + ' نقطة اتضافت لرصيدك في الموقع'));
    box.appendChild(card);

    const mc = el('div', 'cm-card'); mc.appendChild(el('h3', 'cm-sum-title', 'فلوس الموسم')); mc.lastChild.style.fontSize = '.95rem';
    const ptot = (sm.prizes || []).reduce((a, x) => a + x.amt, 0);
    const mg = el('div', 'cm-money-grid');
    [['راتب الموسم', sm.salary], ['مكافآت الأهداف', sm.bonus], ['مكافآت البطولات', ptot]].forEach(x => { const d = el('div'); d.append(el('small', '', x[0]), el('b', '', money(x[1]))); mg.appendChild(d); });
    mc.appendChild(mg);
    (sm.prizes || []).forEach(x => { const r = el('div', 'cm-prize'); r.append(el('span', '', x.text), el('b', '', '+' + money(x.amt))); mc.appendChild(r); });
    if (sm.expenses) { const ex = el('div', 'cm-prize'); ex.append(el('span', '', 'مصاريف (ضرايب ومعيشة وصيانة ممتلكاتك)'), el('b', '', '-' + money(sm.expenses))); ex.lastChild.style.color = '#ff7a59'; mc.appendChild(ex); }
    mc.appendChild(el('div', 'cm-note', 'رصيدك دلوقتي: ' + money(S.money) + ' • شهرتك ' + S.fame + ' من 100'));
    box.appendChild(mc);

    if ((S.sponsorOffers || []).length) {
      const sh = el('h3', 'cm-sum-title', 'عروض الرعاة'); sh.style.cssText = 'font-size:1rem;margin:14px 0 8px'; box.appendChild(sh);
      S.sponsorOffers.forEach((o, i) => {
        const r = el('div', 'cm-card cm-spons'); const info = el('div', 'info');
        info.append(el('b', '', o.brand), el('small', '', 'شركة ' + o.kind + ' عايزاك سفير ليها'), el('b', '', money(o.amt)));
        const b = el('button', 'cm-btn', 'وقّع الرعاية'); b.type = 'button';
        b.addEventListener('click', () => { if (E.takeSponsor(S, i)) { save(); renderSeason(); } });
        r.append(info, b); box.appendChild(r);
      });
    }

    const h = el('h3', 'cm-sum-title', 'العروض'); h.style.fontSize = '1rem'; h.style.margin = '14px 0 8px';
    box.appendChild(h);
    if (!S.offers.length) {
      box.appendChild(el('div', 'cm-card cm-soon', S.offersReason || 'مفيش عروض.'));
    } else {
      S.offers.forEach((o, i) => {
        const oc = club(o.clubId), row = el('div', 'cm-card cm-offer');
        row.appendChild(badge(oc));
        const info = el('div', 'info');
        info.append(el('b', '', oc.ar), el('small', '', LG[o.league].ar), el('span', 'cm-fee', o.free ? 'انتقال حر (من غير مقابل)' : 'عرض بـ ' + fmt(o.fee) + ' مليون ' + o.cur));
        row.appendChild(info);
        const b = el('button', 'cm-btn', 'اقبل'); b.type = 'button';
        b.addEventListener('click', () => {
          window.KoraDialog.confirm({ title: 'تنتقل لـ ' + oc.ar + '؟', message: (o.free ? 'انتقال حر من غير مقابل' : 'الصفقة بـ ' + fmt(o.fee) + ' مليون ' + o.cur) + '. هتروح تتفاوض وتوقّع العقد.', okText: 'أنتقل', cancelText: 'لأ', danger: false })
            .then(ok => { if (ok) choose(i); });
        });
        row.appendChild(b);
        box.appendChild(row);
      });
    }
    if (!S.fired && !S.noRenew) {
      const stay = el('button', 'cm-btn ghost', 'ابقى مع ' + c.ar); stay.type = 'button';
      stay.addEventListener('click', () => choose(-1));
      box.appendChild(stay);
    }
  }

  function choose(i) {
    E.chooseOffer(S, i, Math.random);
    S.pointsGiven = false;
    tab = 'home'; tabLeague = S.league; fxFilter = 'all';
    save(); render();
    if (S.phase === 'play') backupNow(true);
  }

  /* ====== شاشة التوقيع ====== */
  function renderSign() {
    const box = $('cmSign'); box.textContent = '';
    const d = S.deal, c = club(d.clubId), card = el('div', 'cm-card cm-contract');
    card.appendChild(el('div', 'cm-sub', S.signFor === 'start' ? 'أول عقد احتراف ليك' : S.signFor === 'renew' ? 'عقدك خلص، النادي عايز يجدد' : 'انتقال جديد'));
    card.appendChild(el('h2', 'cm-sum-title', 'توقيع العقد'));
    const cc = el('div', 'cm-ct-club'); cc.append(badge(c), el('b', '', c.ar), el('small', 'cm-sub', LG[c.league] ? LG[c.league].ar : ''));
    card.appendChild(cc);
    E.applyTerms(S, d.sel || { years: 3, release: false, agent: !!S.agent });
    const t = el('div', 'cm-ct-terms');
    const ctl = el('div', 'cm-terms-ctl');
    const clausesBox = el('div', 'cm-clauses');
    function drawTerms() {
      t.textContent = '';
      [['مدة العقد', d.years + ' سنين'], ['الراتب السنوي', money(d.salary)], ['مكافأة التوقيع', money(d.signing)], [d.fee ? 'قيمة الصفقة' : 'نوع العقد', d.fee ? (d.free ? 'انتقال حر' : fmt(d.fee) + ' مليون ' + d.cur) : S.signFor === 'renew' ? 'تجديد' : 'عقد ناشئ']].forEach(x => {
        const e = el('div'); e.append(el('small', '', x[0]), el('b', '', x[1])); t.appendChild(e);
      });
      clausesBox.textContent = ''; clausesBox.appendChild(el('h3', '', 'اتفاقيات النادي معاك'));
      [['كل هدف تسجله', d.perGoal], ['كل هدف تصنعه (أسيست)', d.perAssist], ['كل جايزة رجل المباراة', d.perMotm]].forEach((x, i) => {
        const r = el('div', 'cm-clause'); r.append(el('span', 'n', String(i + 1)), el('span', '', x[0]), el('b', '', '+' + money(x[1]))); clausesBox.appendChild(r);
      });
      clausesBox.appendChild(el('div', 'cm-note', 'المكافآت دي بتنزل في رصيدك أول بأول مع كل مباراة.'));
    }
    function setSel(patch) { E.applyTerms(S, Object.assign({}, d.sel, patch)); drawTerms(); drawCtl(); }
    function drawCtl() {
      ctl.textContent = '';
      ctl.appendChild(el('small', 'cm-sub', 'مدة العقد: الأطول أمان أكتر بس راتب سنوي أقل'));
      const yr = el('div', 'cm-chips');
      [2, 3, 4, 5].forEach(y => { const b = el('button', 'cm-chip' + (d.sel.years === y ? ' active' : ''), y + ' سنين'); b.type = 'button'; b.addEventListener('click', () => setSel({ years: y })); yr.appendChild(b); });
      ctl.appendChild(yr);
      const rel = el('button', 'cm-btn ghost cm-opt' + (d.sel.release ? ' on' : ''), (d.sel.release ? '✓ ' : '') + 'بند فسخ: لو النادي طردك يدفعلك 100% من باقي العقد (الراتب -5%)'); rel.type = 'button';
      rel.addEventListener('click', () => setSel({ release: !d.sel.release }));
      const ag = el('button', 'cm-btn ghost cm-opt' + (d.sel.agent ? ' on' : ''), (d.sel.agent ? '✓ ' : '') + 'وكيل أعمال: راتب +12% ومكافأة توقيع +25% (عمولته 8% من دخلك كل موسم)'); ag.type = 'button';
      ag.addEventListener('click', () => setSel({ agent: !d.sel.agent }));
      ctl.append(rel, ag);
    }
    drawCtl(); drawTerms();
    card.append(ctl, t);
    card.appendChild(el('div', 'cm-sub', 'دورك المتوقع في الفريق: ' + E.squadRole(S)));
    card.appendChild(el('div', 'cm-sub', 'وقّع بصباعك جوه المربع'));
    const sb = el('div', 'cm-sigbox'), cv = document.createElement('canvas'); cv.width = 480; cv.height = 180;
    const hint = el('div', 'hint', 'ارسم توقيعك هنا');
    const xm = el('div', 'x'); xm.innerHTML = ic('x'); sb.append(cv, hint, el('div', 'line'), xm);
    card.appendChild(sb);
    const ctx = cv.getContext('2d'); ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#14213d';
    let drawing = false, last = null, ink = 0;
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; };
    const row = el('div', 'cm-row cm-sticky-row');
    const clear = el('button', 'cm-btn ghost', 'امسح'); clear.type = 'button';
    const ok = el('button', 'cm-btn', 'وقّع العقد'); ok.type = 'button'; ok.disabled = true;
    row.append(clear, ok); card.appendChild(row);
    cv.addEventListener('pointerdown', e => { e.preventDefault(); drawing = true; last = pos(e); try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } ctx.beginPath(); ctx.arc(last[0], last[1], 1.6, 0, 6.3); ctx.fillStyle = '#14213d'; ctx.fill(); hint.hidden = true; });
    cv.addEventListener('pointermove', e => {
      if (!drawing) return; e.preventDefault();
      const p = pos(e); ctx.beginPath(); ctx.moveTo(last[0], last[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
      ink += Math.hypot(p[0] - last[0], p[1] - last[1]); last = p; if (ink > 140) ok.disabled = false;
    });
    const end = () => { drawing = false; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('pointerleave', end);
    clear.addEventListener('click', () => { ctx.clearRect(0, 0, cv.width, cv.height); ink = 0; ok.disabled = true; hint.hidden = false; });
    ok.addEventListener('click', () => {
      const sig = cv.toDataURL('image/png');
      E.signContract(S, sig, Math.random);
      S.pointsGiven = false; tab = 'home'; tabLeague = S.league; fxFilter = 'all';
      buzz([40, 30, 40]); save(); render();
    });

    card.appendChild(clausesBox);
    box.appendChild(card);
    setTimeout(() => { try { sb.scrollIntoView({ block: 'center' }); } catch (e) { /* ignore */ } }, 80);
  }

  /* ====== الصيف: المنتخب وكأس العالم للأندية ====== */
  function evSummary(e) {
    const r = e.res; if (!r) return 'لسه ماحصلتش';
    if (r.skipped) return 'اتخطيتها • البطل: ' + club(r.champion).ar;
    if (r.injured) return 'إصابتك منعتك من المشاركة • البطل: ' + club(r.champion).ar;
    if (r.noQual) return 'منتخبك ماتأهلش • البطل: ' + club(r.champion).ar;
    if (r.notSelected) return 'ماتختارتش في القايمة • البطل: ' + club(r.champion).ar;
    return (r.out && r.out.placed) + ' • البطل: ' + club(r.champion).ar;
  }
  function showEventResult(e) {
    const r = e.res, w = el('div'); w.appendChild(el('div', 'cm-sum-title', e.ar));
    if (r.noQual) w.appendChild(el('div', 'cm-note down', 'منتخبك ماتأهلش للبطولة دي. البطل: ' + club(r.champion).ar));
    else if (r.notSelected) w.appendChild(el('div', 'cm-note down', 'المدرب ماختارش اسمك في القايمة. حسّن مستواك واتسدعى أكتر مع المنتخب. البطل: ' + club(r.champion).ar));
    else {
      const o = r.out, win = o.placed === 'بطل';
      w.appendChild(el('div', 'cm-euro-t ' + (win ? 'win' : 'out'), win ? 'مبروك! بطل ' + e.ar : 'نتيجتك: ' + o.placed));
      if (o.groupPos) w.appendChild(el('div', 'cm-sub', 'ترتيبك في المجموعة: ' + o.groupPos));
      o.my.forEach(m => {
        const pm = m.pm, row = el('div', 'cm-tmatch');
        row.append(el('span', 'st', m.stage), el('span', 'mt', club(m.h).ar + ' ' + m.hg + ' - ' + m.ag + ' ' + club(m.a).ar + (m.pens ? ' (ترجيح)' : '') + (pm.goals ? ' • ' + pm.goals + ' هدف' : '') + (pm.assists ? ' • ' + pm.assists + ' أسيست' : '')),
          el('span', 'rt', pm.rating != null ? pm.rating.toFixed(1) : outTxt(pm)));
        w.appendChild(row);
      });
      w.appendChild(el('div', 'cm-sub', 'البطل: ' + club(r.champion).ar));
    }
    if (r.prize) w.appendChild(el('div', 'cm-note up', 'مكافأة البطولة: +' + money(r.prize)));
    openModal(w, 'تمام');
  }
  function liveCard(e, i) {
    const L = S.live, nx = L.next, card = el('div', 'cm-card cm-next');
    card.appendChild(el('h3', '', e.ar + ' • ' + nx.label));
    const home = nx.home ? L.meId : nx.opp, away = nx.home ? nx.opp : L.meId;
    const vs = el('div', 'cm-vs'); vs.append(teamBlock(home, 'أرض'), el('span', 'cm-sub', 'ضد'), teamBlock(away, 'ضيف')); card.appendChild(vs);
    if (L.phase === 'group' && L.rows) {
      const tb = el('div', 'cm-gtab');
      Object.keys(L.rows).map(k => L.rows[k]).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga)).forEach(r => {
        const row = el('div', 'cm-gr' + (r.id === L.meId ? ' me' : '')); row.append(el('span', 'n', club(r.id).ar), el('span', '', String(r.gf - r.ga > 0 ? '+' + (r.gf - r.ga) : r.gf - r.ga)), el('b', '', r.pts + ' نقطة')); tb.appendChild(row);
      });
      card.appendChild(tb);
    }
    L.hist.forEach(m => { const r = el('div', 'cm-tmatch'); r.append(el('span', 'st', m.stage.replace('مرحلة المجموعات • ', '')), el('span', 'mt', club(m.h).ar + ' ' + m.hg + ' - ' + m.ag + ' ' + club(m.a).ar + (m.pens ? ' (ترجيح)' : '')), el('span', 'rt', m.pm.rating != null ? m.pm.rating.toFixed(1) : outTxt(m.pm))); card.appendChild(r); });
    const b = el('button', 'cm-btn', 'العب المباراة'); b.type = 'button';
    b.addEventListener('click', () => {
      const pm = E.playLive(S, Math.random); buzz(30); save();
      openModal(reportNode(pm), 'تمام', () => { renderSummer(); });
    });
    card.appendChild(b); return card;
  }
  function renderSummer() {
    const box = $('cmSummer'); box.textContent = '';
    const head = el('div', 'cm-card'); head.append(el('div', 'cm-sub', 'صيف ' + (S.year + 1)), el('h2', 'cm-sum-title', 'بطولات الصيف'));
    box.appendChild(head);
    S.summer.forEach((e, i) => {
      if (e.status === 'active' && S.live) { box.appendChild(liveCard(e, i)); return; }
      const c = el('div', 'cm-card cm-ev-card' + (e.status === 'done' ? ' done' : '')); const info = el('div', 'info');
      info.append(el('b', '', e.ar), el('small', '', e.status === 'done' ? evSummary(e) : e.nat ? 'بطولة منتخبات' : 'بطولة أندية'));
      c.appendChild(info);
      const skipped = e.status === 'done' && e.res && e.res.skipped;
      if (!skipped) {
        const b = el('button', 'cm-btn' + (e.status === 'done' ? ' ghost' : ''), e.status === 'done' ? 'التفاصيل' : 'ابدأ البطولة'); b.type = 'button';
        b.addEventListener('click', () => { if (e.status === 'done') showEventResult(e); else { const x = E.runSummerEvent(S, i, Math.random); buzz(30); save(); renderSummer(); if (x.status === 'done') showEventResult(x); } });
        c.appendChild(b);
      }
      if (e.status !== 'done') {
        const xb = el('button', 'cm-skip'); xb.type = 'button'; xb.setAttribute('aria-label', 'تخطي البطولة'); xb.title = 'تخطي البطولة'; xb.innerHTML = ic('x');
        xb.addEventListener('click', () => {
          window.KoraDialog.confirm({ title: 'تتخطى ' + e.ar + '؟', message: 'مش هتشارك فيها وهتتحاكى من غيرك.', okText: 'اتخطى', cancelText: 'لأ' })
            .then(ok => { if (ok) { E.runSummerEvent(S, i, Math.random, true); save(); renderSummer(); } });
        });
        c.appendChild(xb);
      }
      box.appendChild(c);
    });
    const fin = el('button', 'cm-btn', 'كمّل لسوق الانتقالات'); fin.type = 'button'; fixBtn(fin); fin.disabled = S.summer.some(e => e.status !== 'done');
    fin.addEventListener('click', () => { E.finishSummer(S); save(); render(); });
    box.appendChild(fin);
  }

  /* ====== القائمة (3 شرط) ====== */
  function closeDrawer() { $('cmDrawer').hidden = true; }
  function openDrawer() {
    const pn = $('cmDrawerPanel'); pn.textContent = '';
    const wb = el('b', '', money(0)); countUp(wb, S.money);
    const w = el('div', 'cm-wallet'); w.append(el('small', '', 'فلوس اللاعب'), wb, el('em', '', S.contract ? 'راتبك ' + money(S.contract.salary) + ' في السنة' : ''));
    pn.appendChild(w);
    const fm = el('div', 'cm-fame'); const ft = el('div', 'cm-fame-t'); ft.append(el('span', '', 'الشهرة'), el('b', '', (S.fame || 0) + ' / 100'));
    const fb = el('div', 'cm-bar'); const ff = el('i'); ff.style.width = clampPct(S.fame || 0) + '%'; fb.appendChild(ff); fm.append(ft, fb); pn.appendChild(fm);
    [['trophies', 'trophy', 'بطولاتي', 'البطولات والجوايز اللي كسبتها'], ['assets', 'home', 'ممتلكاتي', 'بيوت وعربيات وموتوسيكلات ودراجات'], ['clubs', 'clip', 'الأندية اللي لعبتلها', 'ومعدل إنجازك في كل نادي']].forEach(m => {
      const b = el('button', 'cm-menu-item'); b.type = 'button';
      const tx = el('div'); tx.append(el('div', '', m[2]), el('small', '', m[3]));
      b.append(icon(m[1]), tx);
      b.addEventListener('click', () => { tab = m[0]; closeDrawer(); renderPane(); window.scrollTo(0, 0); });
      pn.appendChild(b);
    });
    pn.appendChild(el('div', 'cm-menu-sep'));
    if (S.player.age >= 33) {
      const rb = el('button', 'cm-menu-item'); rb.type = 'button';
      const tx = el('div'); tx.append(el('div', '', 'اعتزل الكورة'), el('small', '', 'ابدأ مهنة المدرب بعد الاعتزال'));
      rb.append(icon('exit'), tx);
      rb.addEventListener('click', () => {
        window.KoraDialog.confirm({ title: 'تعتزل دلوقتي؟', message: 'مسيرتك كلاعب هتخلص وهتتفتحلك مهنة المدرب.', okText: 'اعتزل', cancelText: 'لأ، كمّل' })
          .then(ok => { if (ok) { closeDrawer(); E.retireNow(S); save(); render(); } });
      });
      pn.appendChild(rb);
    }
    const cb = el('button', 'cm-link', 'إغلاق'); cb.type = 'button'; cb.addEventListener('click', closeDrawer); pn.appendChild(cb);
    $('cmDrawer').hidden = false;
  }
  $('cmDrawerBg').addEventListener('click', closeDrawer);


  function renderRetire() {
    try { localStorage.setItem('koraPlayerRetired', '1'); } catch (e) { /* ignore */ }
    const box = $('cmRetire'); box.textContent = '';
    const card = el('div', 'cm-card');
    card.appendChild(el('h2', 'cm-sum-title', 'اعتزلت الكورة'));
    card.appendChild(el('div', 'cm-sub', S.player.name + ' • ' + S.history.length + ' موسم'));
    const g = el('div', 'cm-sum-grid');
    [['مباريات', S.totals.apps], ['أهداف', S.totals.goals], ['أسيست', S.totals.assists]].forEach(x => {
      const d = el('div', 'cm-stat'); d.append(el('small', '', x[0]), el('b', '', fmt(x[1]))); g.appendChild(d);
    });
    card.appendChild(g);
    const best = S.history.length ? Math.max.apply(null, S.history.map(h => h.ovrAfter)) : S.player.ovr;
    card.appendChild(el('div', 'cm-note', 'أعلى طاقة وصلتلها: ' + Math.floor(best) + ' • ثروتك: ' + money(S.money) + ' • عدد البطولات والجوايز: ' + (S.honors || []).length));
    card.appendChild(el('div', 'cm-note up', 'مهنة المدرب اتفتحتلك!'));
    const cb = el('a', 'cm-btn', 'ابدأ مهنة مدرب'); cb.href = 'coach.html'; cb.style.cssText = 'display:block;text-align:center;text-decoration:none;margin-bottom:8px';
    const b = el('button', 'cm-btn ghost', 'ابدأ مسيرة لاعب جديدة'); b.type = 'button';
    b.addEventListener('click', newCareer);
    card.append(cb, b);
    box.appendChild(card);
  }

  function newCareer() { S = null; try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } render(); }

  /* ====== اختيار المهنة ====== */
  function renderMode() {
    let c = null; try { c = JSON.parse(localStorage.getItem('koraCoach') || 'null'); } catch (e) { /* ignore */ }
    let open = false; try { open = localStorage.getItem('koraPlayerRetired') === '1'; } catch (e) { /* ignore */ }
    const ca = $('cmModeCoach');
    ca.classList.toggle('locked', !open); $('cmCoachLock').hidden = open;
    if (open) { ca.setAttribute('href', 'coach.html'); ca.removeAttribute('aria-disabled'); } else { ca.removeAttribute('href'); ca.setAttribute('aria-disabled', 'true'); }
    $('cmModeCoachNote').textContent = open && c && c.kind === 'coach' ? 'كمّل مسيرتك مع ' + (c.clubs && c.me && c.clubs[c.me.clubId] ? c.clubs[c.me.clubId].ar : '') : '';
    $('cmModePlayerNote').textContent = S ? 'عندك مسيرة شغالة — كمّل' : '';
  }
  window.addEventListener('hashchange', render);
  $('cmModeCoach').addEventListener('click', e => {
    let open = false; try { open = localStorage.getItem('koraPlayerRetired') === '1'; } catch (x) { /* ignore */ }
    if (!open) { e.preventDefault(); window.KoraDialog.confirm({ title: 'مهنة المدرب مقفولة', message: 'لازم تخلّص مهنة لاعب وتعتزل الأول عشان تتفتح.', okText: 'تمام', cancelText: 'إغلاق' }); }
  });
  /* ====== نسخة احتياطية على الحساب ====== */
  const BK_MAX = 9 * 1024 * 1024;
  async function pack(str) {
    if (!window.CompressionStream) return 'j:' + str;
    const buf = new Uint8Array(await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
    let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return 'g:' + btoa(bin);
  }
  async function unpack(v) {
    if (v.slice(0, 2) === 'j:') return v.slice(2);
    const bin = atob(v.slice(2)), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  function bkRef() {
    const u = window.KoraAuth && window.KoraAuth.user;
    return u && window.firebase && firebase.database ? firebase.database().ref('careerBackup/' + u.uid) : null;
  }
  async function backupNow(silent) {
    const ref = bkRef();
    if (!ref || !S) { if (!silent) toast('سجّل دخول الأول عشان تحفظ نسخة احتياطية', 'bad'); return; }
    try {
      const c = JSON.parse(JSON.stringify(S));
      if (c.contract) delete c.contract.sig;
      (c.contracts || []).forEach(x => { delete x.sig; });
      const data = await pack(JSON.stringify(c));
      if (data.length > BK_MAX) throw new Error('big');
      await ref.set({ data: data, t: firebase.database.ServerValue.TIMESTAMP, name: String(S.player.name).slice(0, 30), year: S.year, age: S.player.age });
      if (!silent) toast('اتحفظت نسخة احتياطية من مسيرتك', 'up');
    } catch (e) { if (!silent) toast('معرفتش أحفظ النسخة (اتأكد من قواعد Firebase: careerBackup)', 'bad'); }
  }
  async function restoreBackup() {
    const ref = bkRef();
    if (!ref) { toast('سجّل دخول الأول', 'bad'); return; }
    try {
      const snap = await ref.once('value'), v = snap.val();
      if (!v || !v.data) { toast('مفيش نسخة احتياطية على حسابك', 'bad'); return; }
      const ok = await window.KoraDialog.confirm({ title: 'استرجاع المسيرة؟', message: 'هتسترجع مسيرة ' + v.name + ' (موسم ' + v.year + ') وهتحل محل المسيرة الحالية على الجهاز ده.', okText: 'استرجع', cancelText: 'لأ', danger: true });
      if (!ok) return;
      const st = JSON.parse(await unpack(String(v.data)));
      if (!st || st.v !== 2 || !st.player || !st.world) throw new Error('bad');
      S = st; save(); tab = 'home'; tabLeague = S.league; render();
      toast('اتسترجعت مسيرتك', 'up');
    } catch (e) { toast('النسخة مش سليمة أو حصل خطأ في القراءة', 'bad'); }
  }
  $('cmBackup').addEventListener('click', () => backupNow(false));
  $('cmRestore').addEventListener('click', restoreBackup);

  $('cmChange').addEventListener('click', () => { location.hash = ''; render(); });

  /* ====== التشغيل ====== */
  function render() {
    if (location.hash !== '#player') { renderMode(); show('cmMode'); return; }
    if (!S) { show('cmCreate'); return; }
    if (S.phase === 'retired') { renderRetire(); show('cmRetire'); return; }
    if (S.phase === 'sign') { renderSign(); show('cmSign'); return; }
    if (S.phase === 'summer') { renderSummer(); show('cmSummer'); return; }
    if (S.phase === 'awards') { renderAwards(); show('cmAwards'); return; }
    if (S.phase === 'offers') { renderSeason(); show('cmSeason'); return; }
    renderPlayer(); renderPane(); show('cmGame');
  }

  $('cmTabs').addEventListener('click', e => {
    const b = e.target.closest('.cm-tab'); if (!b) return;
    tab = b.dataset.tab; renderPane();
  });
  $('cmReset').addEventListener('click', () => {
    window.KoraDialog.confirm({ title: 'تبدأ مسيرة جديدة؟', message: 'مسيرتك الحالية هتتمسح ومش هترجع تاني.', okText: 'امسح وابدأ', cancelText: 'لأ، كمّل' })
      .then(ok => { if (ok) newCareer(); });
  });
  $('cmModal').addEventListener('click', e => { if (e.target === $('cmModal')) $('cmModal').hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { $('cmModal').hidden = true; closeDrawer(); } });

  try { 
    buildCreate(); 
  } catch (e) { 
    console.error(e); 
    window.dispatchEvent(new ErrorEvent('error', { message: 'buildCreate: ' + e.message, filename: 'careermode.js', lineno: 0 })); 
  }

  S = load();
  if (S) { 
    tabLeague = S.league; 
  }
  render();
})();
