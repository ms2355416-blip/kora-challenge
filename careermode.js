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
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  };
  const ic = n => '<svg class="cm-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC_P[n] + '</svg>';
  const icon = n => { const sp = el('span', 'ic'); sp.innerHTML = ic(n); return sp; };
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
      if (!file || !/^image\//.test(file.type)) { rej(new Error('type')); return; }
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
      const name = $('cmName').value.trim();
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

  function cupCard(c) {
    const card = el('div', 'cm-card cm-cup');
    card.appendChild(el('b', '', c.ar));
    const t = c.status === 'active' ? 'الدور الجاي: ' + c.next.label + ' (بعد الجولة ' + c.next.after + ')' : c.result;
    card.appendChild(el('div', 'cm-euro-t ' + (c.status === 'champ' ? 'win' : c.status === 'out' ? 'out' : ''), t));
    return card;
  }

  function roleText(r) {
    return r.role === 'start' ? 'أساسي • ' + r.minutes + ' دقيقة' : r.role === 'sub' ? 'نزلت بديل • ' + r.minutes + ' دقيقة' : r.role === 'bench' ? 'على الدكة' : 'خارج القايمة';
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
        el('span', 'rt', pm.rating != null ? pm.rating.toFixed(1) : (pm.role === 'bench' ? 'دكة' : 'خارج')));
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
      const right = el('span', '', pm.rating != null ? pm.rating.toFixed(1) + (pm.goals ? ' • ' + pm.goals + ' هدف' : '') + (pm.assists ? ' • ' + pm.assists + ' أسيست' : '') : (pm.role === 'bench' ? 'دكة' : 'خارج'));
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
    const skip = el('button', 'cm-link', 'تخطي العرض'); skip.type = 'button'; skip.style.cssText = 'display:block;margin:10px auto'; box.insertBefore(skip, tail);
    function finish() {
      clearTimeout(awTimer); skip.remove();
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
      const b = el('button', 'cm-btn cm-fixedbtn', 'كمّل'); b.type = 'button';
      b.addEventListener('click', () => { E.continueAfterAwards(S); save(); render(); });
      tail.appendChild(b);
    }
    skip.addEventListener('click', finish);
    function reveal(i) {
      if (i >= items.length) { awTimer = setTimeout(finish, 600); return; }
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
    card.appendChild(el('div', 'cm-note', 'طاقتك: ' + Math.floor(sm.ovrBefore) + ' ← ' + Math.floor(sm.ovrAfter) + (d >= 0 ? ' (+' + d + ')' : ' (' + d + ')') + ' • عمرك ' + sm.age));
    if (sm.euro && sm.euro.text) card.appendChild(el('div', 'cm-note' + (sm.euro.status === 'champ' ? ' up' : ''), 'دوري الأبطال: ' + sm.euro.text));
    const qk = S.euroQual && S.euroQual[S.clubId];
    if (qk) card.appendChild(el('div', 'cm-note up', qk === 'cl' ? 'ناديك اتأهل لدوري أبطال أوروبا الموسم الجاي!' : 'ناديك هيلعب تصفيات دوري الأبطال الموسم الجاي.'));
    if (sm.moved === 'up') card.appendChild(el('div', 'cm-note up', 'ناديك طلع للدرجة الأعلى في الموسم الجاي!'));
    if (sm.moved === 'down') card.appendChild(el('div', 'cm-note down', 'ناديك هبط للدرجة الأقل في الموسم الجاي.'));
    (sm.cups || []).forEach(cp => card.appendChild(el('div', 'cm-note' + (cp.status === 'champ' ? ' up' : ''), cp.result)));
    card.appendChild(el('div', 'cm-note', '+' + sm.points + ' نقطة اتضافت لرصيدك في الموقع'));
    box.appendChild(card);

    const mc = el('div', 'cm-card'); mc.appendChild(el('h3', 'cm-sum-title', 'فلوس الموسم')); mc.lastChild.style.fontSize = '.95rem';
    const ptot = (sm.prizes || []).reduce((a, x) => a + x.amt, 0);
    const mg = el('div', 'cm-money-grid');
    [['راتب الموسم', sm.salary], ['مكافآت الأهداف', sm.bonus], ['مكافآت البطولات', ptot]].forEach(x => { const d = el('div'); d.append(el('small', '', x[0]), el('b', '', money(x[1]))); mg.appendChild(d); });
    mc.appendChild(mg);
    (sm.prizes || []).forEach(x => { const r = el('div', 'cm-prize'); r.append(el('span', '', x.text), el('b', '', '+' + money(x.amt))); mc.appendChild(r); });
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
