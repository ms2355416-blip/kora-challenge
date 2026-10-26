/* Kora Challenge — كارير مود (الواجهة) */
(() => {
  'use strict';

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
  const sel = { color: COLORS[0], pos: 'ST', start: 'eng3' };

  /* ====== التخزين ====== */
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.v === 1 && s.player && s.world ? s : null; } catch (e) { return null; } }
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

  function hashColor(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return 'hsl(' + (h % 360) + ',45%,38%)'; }
  function badge(club) {
    const b = el('span', 'cm-badge');
    const initial = Array.from(club.ar)[0];
    const fallback = () => { b.textContent = initial; b.style.background = hashColor(club.id); };
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
    ['cmCreate', 'cmGame', 'cmAwards', 'cmSeason', 'cmRetire'].forEach(k => { $(k).hidden = k !== id; });
    window.scrollTo(0, 0);
  }

  /* ====== شاشة الإنشاء ====== */
  function buildCreate() {
    const natSel = $('cmNat');
    D.NATIONS.forEach(n => { const o = document.createElement('option'); o.value = n[1]; o.textContent = n[0]; natSel.appendChild(o); });

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
      b.addEventListener('click', () => { sel.color = c; cols.querySelectorAll('.cm-sw').forEach(x => x.classList.toggle('on', x === b)); $('cmPrev').innerHTML = avatarSVG(c); });
      cols.appendChild(b);
    });

    const st = $('cmStart');
    D.STARTS.forEach(s => {
      const b = el('button', 'cm-chip' + (s.id === sel.start ? ' on' : ''));
      b.type = 'button'; b.setAttribute('role', 'radio');
      b.append(el('b', '', s.ar), el('small', '', s.note));
      b.addEventListener('click', () => { sel.start = s.id; st.querySelectorAll('.cm-chip').forEach(x => x.classList.toggle('on', x === b)); });
      st.appendChild(b);
    });
    $('cmPrev').innerHTML = avatarSVG(sel.color);

    $('cmForm').addEventListener('submit', e => {
      e.preventDefault();
      const name = $('cmName').value.trim();
      if (!name) return;
      const opt = natSel.options[natSel.selectedIndex];
      S = E.newCareer({ name, nat: opt.textContent, natCode: opt.value, pos: sel.pos, color: sel.color, start: sel.start }, Math.random);
      S.pointsGiven = false;
      tab = 'home'; tabLeague = S.league;
      save(); render();
    });
  }

  /* ====== شاشة اللعب ====== */
  function renderPlayer() {
    const p = S.player, c = club(S.clubId), box = $('cmPlayer');
    box.textContent = '';

    const ph = el('div', 'cm-ph');
    const av = el('div', 'cm-avatar-sm'); av.innerHTML = avatarSVG(p.color);
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

    const due = E.euroDue(S);
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
        const nx = S.euro.next;
        fx = { home: nx.home ? S.clubId : nx.opp, away: nx.home ? nx.opp : S.clubId };
        card.classList.add('cm-next-euro');
        card.appendChild(el('h3', '', 'دوري أبطال أوروبا • ' + E.STAGE_AR[nx.stage] + (nx.md ? ' (' + nx.md + ' من 8)' : '')));
      } else {
        fx = E.myFixtures(S).find(f => f.round === S.round + 1);
        card.appendChild(el('h3', '', 'الجولة ' + (S.round + 1) + ' من ' + myRounds + ' • ' + LG[S.league].ar));
      }
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
    [['all', 'الكل'], ['played', 'اللي اتلعبت'], ['next', 'اللي جاية']].concat(S.log.some(x => x.comp) ? [['cl', 'دوري الأبطال']] : []).forEach(f => {
      const b = el('button', 'cm-tab' + (fxFilter === f[0] ? ' active' : ''), f[1]); b.type = 'button';
      b.addEventListener('click', () => { fxFilter = f[0]; paneFixtures(); });
      chips.appendChild(b);
    });
    pane.appendChild(chips);
    const card = el('div', 'cm-card');
    if (fxFilter === 'cl') {
      const items = S.log.filter(x => x.comp);
      if (!items.length) card.appendChild(el('div', 'cm-soon', 'لسه ماتلعبتش مباريات أوروبية.'));
      items.forEach(x => {
        const row = el('div', 'cm-fx click'); row.tabIndex = 0;
        row.appendChild(el('span', 'rd', 'أوروبا'));
        const mt = el('div', 'mt'), homeMe = x.home === S.clubId, opp = club(homeMe ? x.away : x.home);
        mt.appendChild(document.createTextNode((homeMe ? 'ضد ' : 'عند ') + opp.ar));
        mt.appendChild(el('small', '', E.STAGE_AR[x.stage] + (x.pens ? ' • ترجيح ' + (homeMe ? x.pens[0] + '-' + x.pens[1] : x.pens[1] + '-' + x.pens[0]) : '')));
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

  function paneHonors() {
    const pane = $('cmPane'); pane.textContent = '';
    const hs = S.honors || [];
    if (!hs.length) { const c = el('div', 'cm-card cm-soon'); c.append(el('b', '', 'بطولاتي'), el('div', '', 'لسه مكسبتش حاجة. العب كويس وهتلاقي بطولاتك وجوايزك هنا.')); pane.appendChild(c); return; }
    const c = el('div', 'cm-card');
    hs.slice().reverse().forEach(h => { const r = el('div', 'cm-fx'); r.append(el('span', 'rd', String(h.year)), el('div', 'mt', h.text)); c.appendChild(r); });
    pane.appendChild(c);
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
    else paneSoon('بطولات النادي');
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
    const myHome = pm.home === S.clubId;
    const sc = el('div', 'cm-score');
    sc.append(el('span', '', club(pm.home).ar), el('span', 'num', pm.hg + ' - ' + pm.ag), el('span', '', club(pm.away).ar));
    wrap.appendChild(sc);
    const cmp = pm.comp ? 'دوري الأبطال • ' + E.STAGE_AR[pm.stage] : 'الجولة ' + pm.round;
    wrap.appendChild(el('div', 'cm-sub', cmp + ' • ' + (myHome ? 'على ملعبك' : 'خارج الأرض')));
    if (pm.pens) wrap.appendChild(el('div', 'cm-sub', 'اتحسمت بركلات الترجيح ' + (myHome ? pm.pens[0] + ' - ' + pm.pens[1] : pm.pens[1] + ' - ' + pm.pens[0]) + ' لصالح ' + (pm.pens[0] > pm.pens[1] ? club(S.clubId).ar : 'الخصم')));
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

  function playRounds(n) {
    const reports = [];
    const myRounds = E.rounds(S.league);
    for (let i = 0; i < n && (S.round < myRounds || E.euroDue(S)); i++) {
      const rep = E.playRound(S, Math.random);
      if (rep.my) reports.push(rep.my);
    }
    if (window.KoraStreak) window.KoraStreak.touch();
    save();
    renderPlayer(); renderPane();
    if (!reports.length) return;
    if (reports.length === 1) { openModal(reportNode(reports[0]), 'تمام'); return; }
    const wrap = el('div', 'cm-multi');
    wrap.appendChild(el('div', 'cm-sum-title', 'ملخص ' + reports.length + ' جولات'));
    const evs = el('div', 'cm-events');
    reports.forEach(pm => {
      const r = el('div', 'cm-ev');
      const left = el('span', '', (pm.comp ? 'أوروبا' : 'ج' + pm.round) + ' • ' + club(pm.home).ar + ' ' + pm.hg + '-' + pm.ag + ' ' + club(pm.away).ar);
      const right = el('span', '', pm.rating != null ? pm.rating.toFixed(1) + (pm.goals ? ' • ' + pm.goals + ' هدف' : '') + (pm.assists ? ' • ' + pm.assists + ' أسيست' : '') : (pm.role === 'bench' ? 'دكة' : 'خارج'));
      r.append(left, right); evs.appendChild(r);
    });
    wrap.appendChild(evs);
    const last = reports[reports.length - 1];
    openModal(wrap, (S.seasonOver || S.round >= myRounds) && !E.euroDue(S) ? 'كمّل' : 'تمام');
    void last;
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
    glove: '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 58V40L10 28l5-5 7 8V12a4 4 0 0 1 8 0v14h2V8a4 4 0 0 1 8 0v18h2V12a4 4 0 0 1 8 0v26c0 12-6 20-16 20z" fill="currentColor"/></svg>'
  };
  function renderAwards() {
    const box = $('cmAwards'); box.textContent = '';
    const sm = S.summary, aw = S.awards, head = el('div', 'cm-card');
    head.appendChild(el('div', 'cm-sub', 'موسم ' + sm.year + '/' + String(sm.year + 1).slice(2)));
    head.appendChild(el('h2', 'cm-sum-title', 'جوائز الموسم'));
    box.appendChild(head);
    const lg = LG[sm.league].ar;
    [['ballon', 'الكرة الذهبية', 'أحسن لاعب في العالم'], ['boot', 'الحذاء الذهبي', 'هداف ' + lg], ['glove', 'القفاز الذهبي', 'أحسن حارس في ' + lg]].forEach(a => {
      const w = aw[a[0]], card = el('div', 'cm-card cm-award' + (w.mine ? ' mine' : ''));
      const ic = el('div', 'cm-award-ic'); ic.innerHTML = AW_ICONS[a[0]];
      const info = el('div', 'cm-award-info');
      info.append(el('small', '', a[2]), el('b', 'cm-award-t', a[1]));
      const who = el('div', 'cm-award-who');
      who.append(badge(club(w.clubId)), el('span', 'cm-award-name', w.name));
      if (w.mine) who.appendChild(el('span', 'cm-award-me', 'إنت!'));
      info.appendChild(who);
      info.append(el('small', 'cm-award-club', club(w.clubId).ar + ' • ' + w.stat));
      card.append(ic, info);
      box.appendChild(card);
    });
    const won = ['ballon', 'boot', 'glove'].filter(k => aw[k].mine).length;
    box.appendChild(el('div', 'cm-note', won ? 'مبروك! كسبت ' + won + (won === 1 ? ' جايزة' : ' جوايز') + ' وفيه نقاط زيادة اتضافت لرصيدك.' : 'ماكسبتش جوايز الموسم ده. كمّل وحسّن مستواك وهتقرّب منهم.'));
    const b = el('button', 'cm-btn', 'كمّل'); b.type = 'button';
    b.addEventListener('click', () => { E.continueAfterAwards(S); save(); render(); });
    box.appendChild(b);
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
    card.appendChild(el('div', 'cm-note', '+' + sm.points + ' نقطة اتضافت لرصيدك في الموقع'));
    box.appendChild(card);

    const h = el('h3', 'cm-sum-title', 'العروض'); h.style.fontSize = '1rem'; h.style.margin = '14px 0 8px';
    box.appendChild(h);
    if (!S.offers.length) {
      box.appendChild(el('div', 'cm-card cm-soon', S.offersReason || 'مفيش عروض.'));
    } else {
      S.offers.forEach((o, i) => {
        const oc = club(o.clubId), row = el('div', 'cm-card cm-offer');
        row.appendChild(badge(oc));
        const info = el('div', 'info');
        info.append(el('b', '', oc.ar), el('small', '', LG[o.league].ar), el('span', 'cm-fee', 'عرض بـ ' + fmt(o.fee) + ' مليون ' + o.cur));
        row.appendChild(info);
        const b = el('button', 'cm-btn', 'اقبل'); b.type = 'button';
        b.addEventListener('click', () => {
          window.KoraDialog.confirm({ title: 'تنتقل لـ ' + oc.ar + '؟', message: 'الصفقة بـ ' + fmt(o.fee) + ' مليون ' + o.cur + '.', okText: 'أنتقل', cancelText: 'لأ', danger: false })
            .then(ok => { if (ok) choose(i); });
        });
        row.appendChild(b);
        box.appendChild(row);
      });
    }
    const stay = el('button', 'cm-btn ghost', 'ابقى مع ' + c.ar); stay.type = 'button';
    stay.addEventListener('click', () => choose(-1));
    box.appendChild(stay);
  }

  function choose(i) {
    E.chooseOffer(S, i, Math.random);
    S.pointsGiven = false;
    tab = 'home'; tabLeague = S.league; fxFilter = 'all';
    save(); render();
  }

  function renderRetire() {
    const box = $('cmRetire'); box.textContent = '';
    const card = el('div', 'cm-card');
    card.appendChild(el('h2', 'cm-sum-title', 'اعتزلت الكورة'));
    card.appendChild(el('div', 'cm-sub', S.player.name + ' • ' + S.history.length + ' موسم'));
    const g = el('div', 'cm-sum-grid');
    [['مباريات', S.totals.apps], ['أهداف', S.totals.goals], ['أسيست', S.totals.assists]].forEach(x => {
      const d = el('div', 'cm-stat'); d.append(el('small', '', x[0]), el('b', '', fmt(x[1]))); g.appendChild(d);
    });
    card.appendChild(g);
    const best = Math.max.apply(null, S.history.map(h => h.ovrAfter));
    card.appendChild(el('div', 'cm-note', 'أعلى طاقة وصلتلها: ' + Math.floor(best)));
    const b = el('button', 'cm-btn', 'ابدأ مسيرة جديدة'); b.type = 'button';
    b.addEventListener('click', newCareer);
    card.appendChild(b);
    box.appendChild(card);
  }

  function newCareer() { S = null; try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } render(); }

  /* ====== التشغيل ====== */
  function render() {
    if (!S) { show('cmCreate'); return; }
    if (S.phase === 'retired') { renderRetire(); show('cmRetire'); return; }
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
  document.addEventListener('keydown', e => { if (e.key === 'Escape') $('cmModal').hidden = true; });

  buildCreate();
  S = load();
  if (S) { tabLeague = S.league; }
  render();
})();
