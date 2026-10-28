/* Kora Challenge — وضع المدرب (الواجهة) */
(function () {
  'use strict';
  const E = window.KoraCoachEngine, D = E.D, KEY = 'koraCoach', STATS_KEY = 'koraChallengeStats';
  const $ = id => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NATS = D.NATS || {};
  let S = null, rng = E.mulberry((Date.now() ^ 0x5bd1e995) >>> 0);
  let view = 'squad', sortBy = 'pos', compSel = null, compTab = 'table', mkt = { f: { pos: 'F', foot: 'both' }, res: null }, careerClub = null;
  let pick = { country: 'eng', name: '', preview: null, seed: 0, q: '' };

  /* ====== حفظ ====== */
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ممتلئ */ } }
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!(s && s.kind === 'coach' && s.v === 2)) return null; const c = s.career; if (c.stints.length) c.cur = c.stints[c.stints.length - 1]; if (c.nat && c.natHist.length) c.nat = c.natHist[c.natHist.length - 1]; return s; } catch (e) { return null; } }
  function addPoints(pts) {
    if (!pts) return;
    try {
      const st = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      st.gamesPlayed = (Number(st.gamesPlayed) || 0) + 1;
      st.bestScore = Math.max(Number(st.bestScore) || 0, pts);
      st.totalPoints = (Number(st.totalPoints) || 0) + pts;
      localStorage.setItem(STATS_KEY, JSON.stringify(st));
      window.dispatchEvent(new StorageEvent('storage', { key: STATS_KEY }));
    } catch (e) { /* ignore */ }
    try { window.KoraStreak && KoraStreak.touch(); } catch (e) { /* ignore */ }
  }

  /* ====== عناصر مشتركة ====== */
  function hashColor(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return 'hsl(' + (h % 360) + ',45%,38%)'; }
  function badge(c) {
    const b = el('span', 'cm-badge');
    const fb = () => { b.textContent = Array.from(c.ar || '؟')[0]; b.style.background = hashColor(c.id || c.ar); };
    if (c.crest) {
      const i = document.createElement('img'); i.alt = ''; i.loading = 'lazy';
      i.src = 'https://crests.football-data.org/' + c.crest + '.png';
      i.addEventListener('error', () => { i.remove(); fb(); }); b.appendChild(i);
    } else fb();
    return b;
  }
  function flagImg(code, cls) {
    const i = document.createElement('img'); i.className = cls || 'cm-flag'; i.alt = ''; i.src = 'https://flagcdn.com/w40/' + code + '.png';
    i.addEventListener('error', () => i.remove()); return i;
  }
  function flagOf(nat) { const n = NATS[nat]; return n ? n[1] : null; }
  const club = id => S.clubs[id];
  const lg = lk => D.LEAGUES[lk];
  const cur = () => (S && S.me && club(S.me.clubId) ? (D.COUNTRIES[club(S.me.clubId).country] || {}).cur : '') || '€';
  function money(m) { m = Number(m) || 0; return (m >= 1000 ? (m / 1000).toFixed(2).replace(/\.?0+$/, '') + ' مليار' : (Math.round(m * 10) / 10) + ' م') + ' ' + cur(); }
  function ovrCls(o) { return o >= 90 ? 'o90' : o >= 80 ? 'o80' : o >= 70 ? 'o70' : o >= 60 ? 'o60' : 'o50'; }
  const enCls = e => e < 45 ? 'lo' : e < 75 ? 'mid' : 'hi';
  const footAr = f => f === 'R' ? 'يمين' : f === 'L' ? 'شمال' : 'الاتنين';
  const footTag = f => f === 'R' ? 'ي' : f === 'L' ? 'ش' : 'ي/ش';
  function show(id) {
    ['chSelect', 'chGame', 'chSummary', 'chCareer'].forEach(k => { $(k).hidden = k !== id; });
    $('chBar').hidden = id !== 'chGame';
    window.scrollTo(0, 0);
  }
  function modal(html, wide) {
    const m = $('cmModal'), sh = $('cmSheet'); sh.innerHTML = html; m.hidden = false;
    sh.scrollTop = 0; return sh;
  }
  function closeModal() { $('cmModal').hidden = true; }
  $('cmModal').addEventListener('click', e => { if (e.target === $('cmModal')) closeModal(); });
  function toast(msg, bad) { const t = el('div', 'ch-msg' + (bad ? ' bad' : ''), esc(msg)); const p = $('chPane'); if (p) p.prepend(t); setTimeout(() => t.remove(), 4000); }
  const ico = {
    squad: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M17 14c2.5 0 4 1.8 4 4.5"/></svg>',
    market: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16l-1.5 11a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7Z"/><path d="M8 7a4 4 0 0 1 8 0"/></svg>',
    cup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/><path d="M12 14v4M8 21h8M9 18h6"/></svg>',
    money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M14.5 9a2.5 2 0 0 0-2.5-1.5c-1.4 0-2.5.8-2.5 2s1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2a2.5 2 0 0 1-2.5-1.5M12 6v1.5M12 16.5V18"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    out: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/></svg>',
    career: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/><path d="M12 14v4M8 21h8M9 18h6"/></svg>'
  };

  /* ====== اختيار النادي ====== */
  function startSelect(forced) {
    pick.seed = (Date.now() >>> 0) || 1;
    const tmp = {}; E.initWorldClubs(tmp, E.mulberry(pick.seed));
    Object.keys(tmp.clubs).forEach(id => { tmp.clubs[id].t = Math.round(E.squadOvr(tmp, id)); });
    pick.preview = tmp; pick.forced = !!forced; renderSelect();
    show('chSelect');
  }
  function renderSelect() {
    const root = $('chSelect'), tmp = pick.preview; root.innerHTML = '';
    const hero = el('div', 'ch-hero', '<span class="cm-kicker">COACH MODE</span><h1>مهنة مدرب</h1><p>' + (pick.mode === 'fired' ? 'اتفصلت من نادي. اختار نادي جديد تكمل بيه مسيرتك.' : 'اختار أي نادي في 18 دوري وابدأ مسيرتك. الرقم الأخضر هو ميزانية النادي للتعاقدات.') + '</p>');
    root.appendChild(hero);
    if (!S) {
      const nm = el('label', 'ch-name', '<span>اسم المدرب</span><input id="chNameIn" maxlength="22" placeholder="اكتب اسمك" value="' + esc(pick.name) + '">');
      root.appendChild(nm);
      nm.querySelector('input').addEventListener('input', e => { pick.name = e.target.value; });
    }
    const chips = el('div', 'ch-scroll');
    D.COUNTRY_ORDER.forEach(ck => {
      const c = D.COUNTRIES[ck], b = el('button', 'ch-flagchip' + (pick.country === ck ? ' on' : ''));
      b.type = 'button'; b.appendChild(flagImg(c.code)); b.appendChild(document.createTextNode(c.ar));
      b.addEventListener('click', () => { pick.country = ck; renderSelect(); }); chips.appendChild(b);
    });
    root.appendChild(chips);
    const q = el('input', 'ch-search'); q.placeholder = 'دوّر على نادي'; q.value = pick.q; q.style.marginBottom = '10px';
    root.appendChild(q);
    const list = el('div'); root.appendChild(list);
    function draw() {
      list.innerHTML = '';
      const qq = pick.q.trim();
      D.COUNTRIES[pick.country].leagues.forEach(lk => {
        const h = el('h3', 'ch-rdh', esc(lg(lk).ar)); let n = 0; const wrap = el('div');
        Object.keys(tmp.clubs).map(id => tmp.clubs[id]).filter(c => c.league === lk && (!qq || c.ar.indexOf(qq) > -1)).sort((a, b) => b.t - a.t).forEach(c => {
          n++;
          const r = el('button', 'ch-clubrow'); r.type = 'button';
          r.appendChild(badge(c));
          r.appendChild(el('span', 'nm', '<b>' + esc(c.ar) + '</b><small>قوة الفريق ' + c.t + '</small>'));
          r.appendChild(el('span', 'ch-bud', '<small>الميزانية</small><b>' + esc(money(D.budgetFor(c.t, c.league))) + '</b>'));
          r.addEventListener('click', () => chooseClub(c.id)); wrap.appendChild(r);
        });
        if (n) { list.appendChild(h); list.appendChild(wrap); }
      });
    }
    q.addEventListener('input', () => { pick.q = q.value; draw(); });
    draw();
    if (S && pick.mode === 'resign') { const b = el('button', 'cm-btn ghost', 'رجوع للعبة'); b.type = 'button'; b.style.marginTop = '12px'; b.addEventListener('click', () => { renderGame(); }); root.appendChild(b); }
  }
  async function chooseClub(id) {
    const c = pick.preview.clubs[id];
    const ok = await KoraDialog.confirm({ title: 'تدرّب ' + c.ar + '؟', message: 'الميزانية: ' + money(D.budgetFor(c.t, c.league)), okText: 'ابدأ', cancelText: 'لأ' });
    if (!ok) return;
    if (S) { E.selectClub(S, id, rng); if (S.phase === 'summary' && S.summary) { S.summary.newClub = true; S.summary.sacked = false; } }
    else { S = E.startCareer({ name: (pick.name || '').trim() || 'المدرب', clubId: id }, E.mulberry(pick.seed)); }
    pick.mode = null; save(); view = 'squad'; if (S.phase === 'summary') renderSummary(); else renderGame();
  }

  /* ====== اللعبة ====== */
  function renderGame() {
    show('chGame');
    if (S.phase === 'summary') return renderSummary();
    const tabs = $('chTabs'); tabs.innerHTML = '';
    [['squad', 'الفريق', ico.squad], ['market', 'السوق', ico.market], ['comp', 'البطولات', ico.cup], ['fin', 'المالية', ico.money]].forEach(t => {
      const b = el('button', 'ch-tab' + (view === t[0] ? ' on' : ''), t[2] + '<span>' + t[1] + '</span>'); b.type = 'button';
      b.addEventListener('click', () => { view = t[0]; renderGame(); }); tabs.appendChild(b);
    });
    const mb = el('button', 'ch-tab', ico.menu + '<span>القائمة</span>'); mb.type = 'button'; mb.addEventListener('click', openDrawer); tabs.appendChild(mb);
    const pane = $('chPane'); pane.innerHTML = '';
    pane.appendChild(clubCard());
    if (view === 'squad') drawSquad(pane); else if (view === 'market') drawMarket(pane); else if (view === 'comp') drawComp(pane); else drawFin(pane);
    drawBar();
  }
  function clubCard() {
    const me = club(S.me.clubId), nx = E.nextMine(S), card = el('div', 'cm-card');
    const top = el('div', 'ch-club'); top.appendChild(badge(me));
    top.appendChild(el('div', 'meta', '<b>' + esc(me.ar) + '</b><small>' + esc(lg(me.league).ar) + ' · موسم ' + S.year + '/' + String(S.year + 1).slice(2) + '</small><small>المدرب: ' + esc(S.career.name) + '</small>'));
    card.appendChild(top);
    const k = el('div', 'ch-kpis');
    [['قوة الفريق', E.squadOvr(S, me.id)], ['الميزانية', money(S.budget)], ['ثقة الإدارة', S.boardConf + '%']].forEach(x => k.appendChild(el('div', 'cm-stat', '<b>' + x[1] + '</b><span>' + x[0] + '</span>')));
    card.appendChild(k);
    if (nx) {
      const n = el('div', 'ch-next', '<div class="t">' + esc(nx.comp) + ' · ' + esc(nx.stage) + '</div>');
      const vs = el('div', 'vs'); const a = el('span'), b = el('span');
      a.appendChild(badge(club(nx.home))); a.appendChild(document.createTextNode(club(nx.home).ar));
      b.appendChild(document.createTextNode(club(nx.away).ar)); b.appendChild(badge(club(nx.away)));
      vs.appendChild(a); vs.appendChild(el('span', '', 'ضد')); vs.appendChild(b); n.appendChild(vs); card.appendChild(n);
    } else card.appendChild(el('div', 'ch-next', '<div class="t">الموسم خلص — دوس على إنهاء الموسم</div>'));
    return card;
  }
  function drawBar() {
    const bar = $('chBar'); bar.innerHTML = '';
    const nx = E.nextMine(S);
    const b = el('button', 'cm-btn', nx ? 'العب المباراة' : 'إنهاء الموسم'); b.type = 'button';
    b.addEventListener('click', nx ? playMatch : endSeason); bar.appendChild(b);
  }
  function playMatch() {
    const rep = E.playNext(S, rng);
    if (!rep) { if (!S.seasonOver) { S.seasonOver = true; } save(); renderGame(); return; }
    save(); showReport(rep);
  }
  function showReport(rep) {
    const h = club(rep.home), a = club(rep.away), me = S.me.clubId;
    let html = '<div class="cm-sheet-h"><b>' + esc(rep.comp) + '</b><small>' + esc(rep.stage) + '</small></div>';
    html += '<div class="ch-next"><div class="vs"><span id="rpH"></span><b style="font-size:1.5rem">' + rep.hg + ' - ' + rep.ag + '</b><span id="rpA"></span></div>' + (rep.pens ? '<div class="t" style="text-align:center;margin-top:6px">ركلات الترجيح ' + rep.pens[0] + ' - ' + rep.pens[1] + '</div>' : '') + '</div>';
    html += '<div style="margin-top:10px">' + (rep.ev || []).map(e => '<div class="ch-ev"><span class="min">' + e.m + '\'</span><span>⚽ ' + esc(e.s) + (e.a ? ' <small style="color:var(--muted)">(صناعة ' + esc(e.a) + ')</small>' : '') + ' <small style="color:var(--muted)">— ' + esc(e.tm === 'h' ? h.ar : a.ar) + '</small></span></div>').join('') + '</div>';
    html += '<div class="ch-lu"><div><h5>' + esc(h.ar) + '</h5><ol>' + (rep.hx || []).map(p => '<li>' + esc(p.n) + ' <small>' + p.o + '</small></li>').join('') + '</ol></div><div><h5>' + esc(a.ar) + '</h5><ol>' + (rep.ax || []).map(p => '<li>' + esc(p.n) + ' <small>' + p.o + '</small></li>').join('') + '</ol></div></div>';
    html += '<button class="cm-btn" id="rpOk" type="button" style="margin-top:14px;width:100%">تمام</button>';
    const sh = modal(html);
    const sp1 = sh.querySelector('#rpH'), sp2 = sh.querySelector('#rpA');
    sp1.appendChild(badge(h)); sp1.appendChild(document.createTextNode(h.ar)); sp2.appendChild(document.createTextNode(a.ar)); sp2.appendChild(badge(a));
    sh.querySelector('#rpOk').addEventListener('click', () => { closeModal(); renderGame(); });
    void me;
  }

  /* ====== قايمة اللاعبين ====== */
  const POS = ['G', 'D', 'M', 'F'];
  function playerRow(p, extra) {
    const r = el('button', 'ch-pl'); r.type = 'button';
    const ph = el('span', 'ch-ph', esc(Array.from(p.n.replace(/^(\S+\s)+?(?=\S+$)/, ''))[0] || '؟'));
    const fc = flagOf(p.t); if (fc) ph.appendChild(flagImg(fc, ''));
    r.appendChild(ph);
    const pn = el('span', 'ch-pn', '<b>' + esc(p.n) + '</b>');
    const tags = el('span', 'ch-tags', '<span class="ch-tag pos">' + E.POS_AR[p.p] + '</span><span class="ch-tag">' + footTag(E.footOf(p)) + '</span>' + (p.f ? '<span class="ch-tag sale">للبيع</span>' : ''));
    pn.appendChild(tags);
    if (!extra) pn.appendChild(el('div', 'ch-en ' + enCls(p.e), '<i style="width:' + Math.max(4, Math.round(p.e)) + '%"></i>'));
    r.appendChild(pn);
    if (extra) r.appendChild(extra); else r.appendChild(el('span', 'ch-num', p.a + ' سنة'));
    r.appendChild(el('span', 'ch-ovr ' + ovrCls(p.o), String(p.o)));
    return r;
  }
  function drawSquad(pane) {
    const sq = S.squads[S.me.clubId].slice();
    const card = el('div', 'cm-card');
    const hd = el('div', 'ch-sorth', '<span>ترتيب:</span>');
    [['pos', 'المركز'], ['ovr', 'القوة'], ['en', 'الطاقة'], ['age', 'السن']].forEach(s => {
      const b = el('button', sortBy === s[0] ? 'on' : '', s[1]); b.type = 'button'; b.addEventListener('click', () => { sortBy = s[0]; renderGame(); }); hd.appendChild(b);
    });
    hd.appendChild(el('span', 'sp')); hd.appendChild(el('span', '', sq.length + ' لاعب'));
    card.appendChild(hd);
    const key = { pos: (a, b) => POS.indexOf(a.p) - POS.indexOf(b.p) || b.o - a.o, ovr: (a, b) => b.o - a.o, en: (a, b) => a.e - b.e, age: (a, b) => a.a - b.a }[sortBy];
    sq.sort(key);
    let last = null;
    sq.forEach(p => {
      if (sortBy === 'pos' && p.p !== last) { last = p.p; card.appendChild(el('div', 'ch-rdh', E.POS_AR[p.p] === 'حارس' ? 'حراس المرمى' : esc({ G: 'حراس المرمى', D: 'المدافعين', M: 'لاعبي الوسط', F: 'المهاجمين' }[p.p]))); }
      const r = playerRow(p); r.addEventListener('click', () => playerModal(p, true)); card.appendChild(r);
    });
    pane.appendChild(card);
  }
  function playerModal(p, mine, club0) {
    const price = E.priceOf(p), v = E.valueOf(p);
    let html = '<div class="cm-sheet-h"><b>' + esc(p.n) + '</b><small>' + E.POS_AR[p.p] + ' · ' + p.a + ' سنة</small></div><div class="ch-kpis">';
    [['القوة', p.o], ['الطاقة', Math.round(p.e) + '%'], ['القيمة', money(v)], ['الطول', E.heightOf(p) + ' سم'], ['القدم', footAr(E.footOf(p))], ['الجنسية', (NATS[p.t] || [])[0] || '—']].forEach(x => { html += '<div class="cm-stat"><b>' + x[1] + '</b><span>' + x[0] + '</span></div>'; });
    html += '</div>';
    if (club0) html += '<p class="cm-note">النادي: ' + esc(club(club0).ar) + '</p>';
    html += '<div class="ch-fab" id="pmAct"></div><button class="cm-btn ghost" id="pmX" type="button" style="width:100%;margin-top:8px">قفل</button>';
    const sh = modal(html), act = sh.querySelector('#pmAct');
    sh.querySelector('#pmX').addEventListener('click', closeModal);
    if (mine) { const b = el('button', 'cm-btn', 'اعرض للبيع'); b.type = 'button'; b.style.flex = '1'; b.addEventListener('click', () => sellFlow(p)); act.appendChild(b); }
    else { const b = el('button', 'cm-btn', 'تعاقد بـ ' + money(price)); b.type = 'button'; b.style.flex = '1'; b.addEventListener('click', () => buyFlow(p)); act.appendChild(b); }
  }
  async function sellFlow(p) {
    const m = E.marketOpen(S); if (!m.open) { closeModal(); return toast(m.label, true); }
    const o = E.sellOffer(S, p.i, rng); if (!o) return;
    closeModal();
    const ok = await KoraDialog.confirm({ title: 'عرض لـ ' + p.n, message: club(o.buyer).ar + ' عرض ' + money(o.fee) + '. تبيع؟', okText: 'بيع', cancelText: 'لأ' });
    if (!ok) return;
    const r = E.sell(S, o, rng); save(); renderGame(); toast(r.msg, !r.ok);
  }
  async function buyFlow(p) {
    const ok = await KoraDialog.confirm({ title: 'تعاقد مع ' + p.n, message: 'السعر ' + money(E.priceOf(p)) + ' — ميزانيتك ' + money(S.budget), okText: 'تعاقد', cancelText: 'لأ' });
    if (!ok) return;
    const r = E.buy(S, p.i, rng); closeModal(); if (r.ok) { save(); mkt.res = null; view = 'market'; }
    renderGame(); toast(r.msg, !r.ok);
  }

  /* ====== السوق ====== */
  function drawMarket(pane) {
    const m = E.marketOpen(S);
    pane.appendChild(el('div', 'ch-market ' + (m.open ? 'open' : 'closed'), esc(m.label) + ' · ميزانيتك ' + esc(money(S.budget))));
    const f = mkt.f;
    const bar = el('div', 'ch-fab');
    const fb = el('button', 'cm-btn ghost', 'الفلاتر'); fb.type = 'button'; fb.style.flex = '1'; fb.addEventListener('click', filterSheet);
    const sb = el('button', 'cm-btn', 'ابحث'); sb.type = 'button'; sb.style.flex = '1'; sb.addEventListener('click', () => { mkt.res = E.searchPlayers(S, f, 60); renderGame(); });
    bar.appendChild(fb); bar.appendChild(sb); pane.appendChild(bar);
    const sum = [f.pos && f.pos !== 'all' ? E.POS_AR[f.pos] : 'كل المراكز', f.foot === 'R' ? 'قدم يمين' : f.foot === 'L' ? 'قدم شمال' : 'الاتنين'];
    pane.appendChild(el('p', 'cm-note', 'الفلتر الحالي: ' + sum.join(' · ')));
    if (!mkt.res) mkt.res = E.searchPlayers(S, f, 60);
    const card = el('div', 'cm-card');
    if (!mkt.res.length) card.appendChild(el('p', 'cm-note', 'مفيش لاعيبة بالمواصفات دي.'));
    mkt.res.forEach(x => {
      const pr = el('span', 'ch-price', '<b>' + esc(money(x.price)) + '</b><small>' + esc(club(x.club).ar) + '</small>');
      const r = playerRow(x.p, pr); r.addEventListener('click', () => playerModal(x.p, false, x.club)); card.appendChild(r);
    });
    pane.appendChild(card);
  }
  function filterSheet() {
    const f = mkt.f;
    const nats = Object.keys(NATS).map(k => '<option value="' + k + '"' + (f.nat === k ? ' selected' : '') + '>' + esc(NATS[k][0]) + '</option>').join('');
    const val = v => v == null ? '' : v;
    const html = '<div class="cm-sheet-h"><b>فلاتر البحث</b></div><div class="ch-filters">' +
      '<div class="ch-fr"><label>المركز<select id="fPos">' + ['all', 'G', 'D', 'M', 'F'].map(p => '<option value="' + p + '"' + (f.pos === p ? ' selected' : '') + '>' + (p === 'all' ? 'كل المراكز' : E.POS_AR[p]) + '</option>').join('') + '</select></label>' +
      '<label>القدم<select id="fFoot"><option value="both">الاتنين</option><option value="R"' + (f.foot === 'R' ? ' selected' : '') + '>يمين</option><option value="L"' + (f.foot === 'L' ? ' selected' : '') + '>شمال</option></select></label></div>' +
      '<label class="ch-fr" style="display:block"><label>الجنسية<select id="fNat"><option value="all">الكل</option>' + nats + '</select></label></label>' +
      '<div class="ch-fr"><label>القوة من<input id="fOMin" type="number" value="' + val(f.ovrMin) + '"></label><label>القوة لحد<input id="fOMax" type="number" value="' + val(f.ovrMax) + '"></label>' +
      '<label>القيمة من (مليون)<input id="fVMin" type="number" value="' + val(f.vMin) + '"></label><label>القيمة لحد (مليون)<input id="fVMax" type="number" value="' + val(f.vMax) + '"></label>' +
      '<label>السن من<input id="fAMin" type="number" value="' + val(f.ageMin) + '"></label><label>السن لحد<input id="fAMax" type="number" value="' + val(f.ageMax) + '"></label>' +
      '<label>الطول من (سم)<input id="fHMin" type="number" value="' + val(f.hMin) + '"></label><label>الطول لحد (سم)<input id="fHMax" type="number" value="' + val(f.hMax) + '"></label></div>' +
      '<label class="ch-tog">للبيع بس<input id="fSale" type="checkbox"' + (f.sale ? ' checked' : '') + '></label><label class="ch-tog">نجوم بس (84+)<input id="fStar" type="checkbox"' + (f.star ? ' checked' : '') + '></label>' +
      '<div class="ch-fab"><button class="cm-btn ghost" id="fReset" type="button" style="flex:1">إعادة ضبط</button><button class="cm-btn" id="fOk" type="button" style="flex:1">تطبيق</button></div></div>';
    const sh = modal(html), g = id => sh.querySelector('#' + id), n = id => { const v = g(id).value; return v === '' ? undefined : Number(v); };
    g('fReset').addEventListener('click', () => { mkt.f = { pos: 'F', foot: 'both' }; mkt.res = null; closeModal(); renderGame(); });
    g('fOk').addEventListener('click', () => {
      mkt.f = { pos: g('fPos').value, foot: g('fFoot').value, nat: g('fNat').value, ovrMin: n('fOMin'), ovrMax: n('fOMax'), vMin: n('fVMin'), vMax: n('fVMax'), ageMin: n('fAMin'), ageMax: n('fAMax'), hMin: n('fHMin'), hMax: n('fHMax'), sale: g('fSale').checked, star: g('fStar').checked };
      mkt.res = null; closeModal(); renderGame();
    });
  }

  /* ====== البطولات ====== */
  function myCountry() { return club(S.me.clubId).country; }
  function drawComp(pane) {
    if (!compSel) compSel = { t: 'lg', k: club(S.me.clubId).league };
    if (compSel.t === 'lg' && !S.world.leagues[compSel.k]) compSel = { t: 'lg', k: club(S.me.clubId).league };
    const isLg = compSel.t === 'lg', L = isLg ? lg(compSel.k) : null, cp = isLg ? null : E.cupOf(S, compSel.k);
    const ctry = D.COUNTRIES[isLg ? L.country : (cp ? cp.country : myCountry())];
    const btn = el('button', 'ch-compbtn'); btn.type = 'button';
    btn.appendChild(flagImg(ctry.code, '')); btn.appendChild(el('span', 'sp', esc(isLg ? L.ar : (cp ? cp.ar : '')))); btn.insertAdjacentHTML('beforeend', ico.chev);
    btn.addEventListener('click', compPicker); pane.appendChild(btn);
    if (isLg) {
      const sub = el('div', 'ch-sub');
      [['table', 'الترتيب'], ['scorers', 'الهدافين'], ['assists', 'الصناع']].forEach(t => { const b = el('button', 'cm-tab' + (compTab === t[0] ? ' active' : ''), t[1]); b.type = 'button'; b.addEventListener('click', () => { compTab = t[0]; renderGame(); }); sub.appendChild(b); });
      pane.appendChild(sub);
      const card = el('div', 'cm-card');
      if (compTab === 'table') leagueTable(card, compSel.k); else leaders(card, compSel.k, compTab === 'assists' ? 'a' : 'g');
      pane.appendChild(card);
    } else if (cp) cupView(pane, cp);
  }
  function leagueTable(card, lk) {
    const L = lg(lk), tab = E.table(S, lk), n = tab.length;
    const upN = L.tier === 1 ? 4 : 2;
    let h = '<table class="cm-table"><thead><tr><th>#</th><th class="l">الفريق</th><th>ل</th><th>ف</th><th>ت</th><th>خ</th><th>+/-</th><th>ن</th></tr></thead><tbody>';
    tab.forEach((r, i) => {
      const c = club(r.id), cls = [r.id === S.me.clubId ? 'me' : '', i < upN ? 'up' : '', i >= n - L.rel ? 'down' : ''].join(' ');
      h += '<tr class="' + cls + '"><td>' + (i + 1) + '</td><td class="l">' + esc(c.ar) + '</td><td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td><td>' + r.gd + '</td><td><b>' + r.pts + '</b></td></tr>';
    });
    card.innerHTML = '<div style="overflow-x:auto">' + h + '</tbody></table></div>';
    card.appendChild(el('p', 'cm-note', L.tier === 1 ? 'الأخضر: المراكز الأولى · الأحمر: الهبوط' : 'الأخضر: الصعود · الأحمر: الهبوط'));
  }
  function leaders(card, lk, kind) {
    const list = E.topScorers(S, lk, kind, 30);
    if (!list.length) return card.appendChild(el('p', 'cm-note', 'لسه مفيش أرقام.'));
    list.forEach((x, i) => {
      const c = club(x.club), r = el('div', 'ch-ld' + (x.club === S.me.clubId ? ' me' : ''));
      r.appendChild(el('span', 'rk', String(i + 1))); r.appendChild(badge(c));
      r.appendChild(el('span', 'nm', '<b>' + esc(x.p.n) + '</b><small>' + esc(c.ar) + '</small>'));
      r.appendChild(el('span', 'val', String(kind === 'a' ? x.a : x.g))); card.appendChild(r);
    });
  }
  function cupView(pane, cp) {
    const card = el('div', 'cm-card');
    if (cp.kind === 'po' && !cp.rounds.length) card.appendChild(el('p', 'cm-note', 'البلاي أوف بيبدأ بعد انتهاء الموسم العادي.'));
    if (cp.winner) card.appendChild(el('div', 'ch-msg', 'البطل: ' + esc(club(cp.winner).ar)));
    cp.rounds.forEach(rd => {
      card.appendChild(el('div', 'ch-rdh', esc(rd.name)));
      rd.ties.forEach(t => {
        const row = el('div', 'ch-tie'), h = club(t.h), a = club(t.a);
        const l = el('span', 't'); l.appendChild(badge(h)); l.appendChild(el('span', t.w === t.h ? 'w' : '', esc(h.ar)));
        const r = el('span', 't b'); r.appendChild(badge(a)); r.appendChild(el('span', t.w === t.a ? 'w' : '', esc(a.ar)));
        const sc = el('span', 'sc', t.res ? t.res[0] + ' - ' + t.res[1] + (t.pens ? '<small>ترجيح ' + t.pens[0] + '-' + t.pens[1] + '</small>' : '') : '—');
        row.appendChild(l); row.appendChild(sc); row.appendChild(r); if (t.h === S.me.clubId || t.a === S.me.clubId) row.style.background = 'color-mix(in srgb,var(--green) 10%,transparent)'; card.appendChild(row);
      });
    });
    pane.appendChild(card);
  }
  function compPicker() {
    let html = '<div class="cm-sheet-h"><b>اختار البطولة</b></div><div class="ch-pickc">';
    D.COUNTRY_ORDER.forEach(ck => {
      const c = D.COUNTRIES[ck];
      html += '<h4><img src="https://flagcdn.com/w40/' + c.code + '.png" alt="" onerror="this.remove()">' + esc(c.ar) + '</h4>';
      c.leagues.forEach(lk => { html += '<button class="cm-chip" data-t="lg" data-k="' + lk + '" type="button">' + esc(lg(lk).ar) + '</button>'; });
      S.world.cups.filter(x => x.country === ck).forEach(x => { html += '<button class="cm-chip" data-t="cup" data-k="' + x.key + '" type="button">' + esc(x.ar) + '</button>'; });
    });
    const sh = modal(html + '</div>');
    sh.querySelectorAll('.cm-chip').forEach(b => b.addEventListener('click', () => { compSel = { t: b.dataset.t, k: b.dataset.k }; compTab = 'table'; closeModal(); renderGame(); }));
  }

  /* ====== المالية ====== */
  function drawFin(pane) {
    const card = el('div', 'cm-card'), cf = S.boardConf;
    card.innerHTML = '<h3>ثقة الإدارة</h3><div class="ch-conf"><i class="' + (cf < 35 ? 'lo' : cf < 65 ? 'mid' : 'hi') + '" style="width:' + cf + '%;background:' + (cf < 35 ? '#ff7a59' : cf < 65 ? '#f6c445' : '#24e982') + '"></i></div><p class="cm-note">' + cf + '% · الإدارة متوقعة مركز ' + (S.exp || '—') + ' في الدوري. لو الثقة نزلت تحت 22% آخر الموسم هتتفصل.</p>';
    pane.appendChild(card);
    const k = el('div', 'cm-card'); k.innerHTML = '<h3>الميزانية</h3><div class="ch-kpis"><div class="cm-stat"><b>' + esc(money(S.budget)) + '</b><span>متاح للتعاقدات</span></div></div>';
    pane.appendChild(k);
    const tr = (S.news || []).filter(n => n.mine).slice(-12).reverse();
    const t = el('div', 'cm-card'); t.innerHTML = '<h3>آخر صفقاتي</h3>';
    if (!tr.length) t.appendChild(el('p', 'cm-note', 'لسه مفيش صفقات.'));
    tr.forEach(n => { const buy = n.to === S.me.clubId; t.appendChild(el('div', 'ch-ev', '<span class="min">' + n.yr + '</span><span>' + (buy ? 'اشتريت ' : 'بعت ') + esc(n.n) + ' (' + n.o + ') ' + (buy ? 'من ' + esc(club(n.from).ar) : 'لـ ' + esc(club(n.to).ar)) + ' بـ ' + esc(money(n.fee)) + '</span>')); });
    pane.appendChild(t);
    const w = (S.news || []).filter(n => !n.mine).slice(-8).reverse();
    if (w.length) { const c2 = el('div', 'cm-card'); c2.innerHTML = '<h3>أخبار الانتقالات</h3>'; w.forEach(n => { if (club(n.from) && club(n.to)) c2.appendChild(el('div', 'ch-ev', '<span class="min">' + n.yr + '</span><span>' + esc(n.n) + ' (' + n.o + ') من ' + esc(club(n.from).ar) + ' إلى ' + esc(club(n.to).ar) + '</span>')); }); pane.appendChild(c2); }
  }

  /* ====== القائمة الجانبية ====== */
  function openDrawer() {
    const me = club(S.me.clubId), p = $('chDrawerPanel'); p.innerHTML = '';
    const h = el('div', 'ch-dh'); h.appendChild(badge(me)); h.appendChild(el('div', '', '<b>' + esc(me.ar) + '</b><small>' + esc(S.career.name) + '</small>')); p.appendChild(h);
    const rs = el('button', 'ch-resign', 'استقالة'); rs.type = 'button'; rs.addEventListener('click', resign); p.appendChild(rs);
    [['squad', 'الفريق', ico.squad], ['career', 'المسيرة المهنية', ico.career]].forEach(m => {
      const b = el('button', 'ch-mi' + (m[0] === 'squad' && view === 'squad' ? ' on' : ''), m[2] + '<span>' + m[1] + '</span>'); b.type = 'button';
      b.addEventListener('click', () => { closeDrawer(); if (m[0] === 'career') renderCareer(); else { view = 'squad'; renderGame(); } }); p.appendChild(b);
    });
    const nw = el('button', 'ch-mi', ico.out + '<span>مسيرة جديدة</span>'); nw.type = 'button'; nw.addEventListener('click', newCareer); p.appendChild(nw);
    $('chDrawer').hidden = false;
  }
  function closeDrawer() { $('chDrawer').hidden = true; }
  $('chDrawerBack').addEventListener('click', closeDrawer);
  async function resign() {
    closeDrawer();
    const ok = await KoraDialog.confirm({ title: 'استقالة', message: 'هتسيب ' + club(S.me.clubId).ar + ' وتختار نادي جديد. متأكد؟', okText: 'استقالة', cancelText: 'لأ', danger: true });
    if (!ok) return;
    pick.mode = 'resign'; pick.fresh = false; startSelect(false);
  }
  async function newCareer() {
    closeDrawer();
    const ok = await KoraDialog.confirm({ title: 'مسيرة جديدة', message: 'المسيرة الحالية هتتمسح. متأكد؟', okText: 'امسح وابدأ', cancelText: 'لأ', danger: true });
    if (!ok) return;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    S = null; pick.fresh = false; pick.mode = 'new'; startSelect(false);
  }

  /* ====== المسيرة المهنية ====== */
  function renderCareer() {
    show('chCareer');
    const root = $('chCareer'), c = S.career; root.innerHTML = '';
    root.appendChild(el('div', 'ch-career-h', '<span class="cm-kicker">COACH</span><br><b>' + esc(c.name) + '</b>'));
    const back = el('button', 'cm-btn ghost', 'رجوع للعبة'); back.type = 'button'; back.style.marginBottom = '12px'; back.addEventListener('click', renderGame); root.appendChild(back);
    const card = el('div', 'cm-card'); card.innerHTML = '<h3>الفرق اللي دربتها</h3>';
    const tot = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 };
    let h = '<div style="overflow-x:auto"><table class="ch-ct"><thead><tr><th class="cl">الفريق</th><th>ل</th><th>ف</th><th>ت</th><th>خ</th><th>له</th><th>عليه</th><th>ن%</th></tr></thead><tbody>';
    c.stints.forEach((s, i) => {
      Object.keys(tot).forEach(k => { tot[k] += s[k]; });
      h += '<tr class="click" data-i="' + i + '"><td class="cl"><div><span class="bd" data-i="' + i + '"></span><span>' + esc(s.ar) + '<small>' + s.from + (s.to ? '–' + s.to : '–الآن') + '</small></span></div></td><td>' + s.p + '</td><td>' + s.w + '</td><td>' + s.d + '</td><td>' + s.l + '</td><td>' + s.gf + '</td><td>' + s.ga + '</td><td>' + (s.p ? Math.round(s.w / s.p * 100) : 0) + '</td></tr>';
    });
    h += '<tr><td class="cl"><b>الإجمالي</b></td><td>' + tot.p + '</td><td>' + tot.w + '</td><td>' + tot.d + '</td><td>' + tot.l + '</td><td>' + tot.gf + '</td><td>' + tot.ga + '</td><td>' + (tot.p ? Math.round(tot.w / tot.p * 100) : 0) + '</td></tr></tbody></table></div>';
    card.insertAdjacentHTML('beforeend', h); root.appendChild(card);
    card.querySelectorAll('.bd').forEach(sp => { const s = c.stints[sp.dataset.i]; sp.appendChild(badge({ id: s.clubId, ar: s.ar, crest: s.crest })); });
    card.querySelectorAll('tr.click').forEach(tr => tr.addEventListener('click', () => stintModal(c.stints[tr.dataset.i])));
    const nat = el('div', 'cm-card'); nat.innerHTML = '<h3>المنتخبات اللي دربتها</h3>';
    if (!c.natHist.length) nat.appendChild(el('p', 'cm-note', 'لسه ما دربتش أي منتخب. بعد ما تبني سمعة هتجيلك عروض.'));
    c.natHist.forEach(n => { const r = el('div', 'ch-ld'); r.appendChild(flagImg(n.code, 'cm-flag')); r.appendChild(el('span', 'nm', '<b>' + esc(n.ar) + '</b><small>من ' + n.from + (c.nat === n ? ' · حاليًا' : '') + '</small>')); nat.appendChild(r); });
    root.appendChild(nat);
    const tr = el('div', 'cm-card'); tr.innerHTML = '<h3>البطولات (' + c.trophies.length + ')</h3>';
    const g = {}; c.trophies.forEach(t => { const k = t.text + '|' + t.clubAr; (g[k] = g[k] || { t: t, n: 0, y: [] }).n++; g[k].y.push(t.year); });
    const grid = el('div', 'ch-trs');
    Object.keys(g).forEach(k => { const x = g[k]; grid.appendChild(el('div', 'ch-tr won', ico.trophy + '<b>' + esc(x.t.text) + '</b><span>' + esc(x.t.clubAr) + '</span><span>' + x.n + '× · ' + x.y.join('، ') + '</span>')); });
    if (!c.trophies.length) tr.appendChild(el('p', 'cm-note', 'لسه مفيش بطولات. كمّل!')); else tr.appendChild(grid);
    root.appendChild(tr);
  }
  function stintModal(s) {
    let h = '<div class="cm-sheet-h"><b>' + esc(s.ar) + '</b><small>' + s.from + ' – ' + (s.to || 'الآن') + '</small></div><div class="cm-card" style="box-shadow:none">';
    if (!s.seasons.length) h += '<p class="cm-note">لسه مفيش مواسم كاملة.</p>';
    s.seasons.forEach(x => { h += '<div class="ch-ev"><span class="min">' + x.year + '</span><span>' + esc(lg(x.league).ar) + ' — المركز ' + x.pos + '</span></div>'; });
    s.trophies.forEach(t => { h += '<div class="ch-ev"><span class="min">' + t.year + '</span><span>🏆 ' + esc(t.text) + '</span></div>'; });
    modal(h + '</div><button class="cm-btn ghost" id="stX" type="button" style="width:100%;margin-top:8px">قفل</button>').querySelector('#stX').addEventListener('click', closeModal);
  }

  /* ====== نهاية الموسم ====== */
  function endSeason() {
    const out = E.finishSeason(S, rng);
    addPoints(10 + (out.champion ? 40 : out.pos <= 3 ? 15 : 0) + out.trophies.length * 20);
    save(); renderGame();
  }
  function renderSummary() {
    show('chSummary');
    const o = S.summary, root = $('chSummary'), c = S.clubs[o.clubId]; root.innerHTML = '';
    const card = el('div', 'cm-card'); const top = el('div', 'ch-club'); top.appendChild(badge(c));
    top.appendChild(el('div', 'meta', '<b>نهاية موسم ' + o.year + '/' + String(o.year + 1).slice(2) + '</b><small>' + esc(c.ar) + ' · ' + esc(lg(o.league).ar) + '</small>')); card.appendChild(top);
    const k = el('div', 'ch-kpis'); [['المركز', o.pos + ' من ' + o.teams], ['النقاط', o.row.pts], ['الفرق', o.row.gd]].forEach(x => k.appendChild(el('div', 'cm-stat', '<b>' + x[1] + '</b><span>' + x[0] + '</span>')));
    card.appendChild(k); root.appendChild(card);
    const info = el('div', 'cm-card');
    let html = '';
    if (o.trophies.length) html += o.trophies.map(t => '<div class="ch-msg">🏆 ' + esc(t.text) + '</div>').join('');
    o.cups.forEach(x => { html += '<div class="ch-ev"><span class="min">🏟</span><span>' + esc(x.ar) + ': ' + esc(x.reached) + '</span></div>'; });
    if (o.moved) html += '<div class="ch-msg' + (o.moved === 'down' ? ' bad' : '') + '">' + (o.moved === 'up' ? 'فريقك صعد للدرجة الأعلى!' : 'فريقك هبط للدرجة الأدنى.') + '</div>';
    html += '<h3>ثقة الإدارة: ' + o.conf + '%</h3><div class="ch-conf"><i style="width:' + o.conf + '%;background:' + (o.conf < 35 ? '#ff7a59' : o.conf < 65 ? '#f6c445' : '#24e982') + '"></i></div><p class="cm-note">كانت متوقعة المركز ' + o.exp + '. دخل الموسم: ' + esc(money(o.income)) + '</p>';
    if (o.scorers && o.scorers.length) html += '<h3>هدافو الدوري</h3>' + o.scorers.map((x, i) => '<div class="ch-ev"><span class="min">' + (i + 1) + '</span><span>' + esc(x.p.n) + ' — ' + x.g + ' هدف (' + esc(S.clubs[x.club].ar) + ')</span></div>').join('');
    info.innerHTML = html; root.appendChild(info);
    const act = el('div', 'cm-card'); root.appendChild(act);
    if (o.natOffer && !o.natHandled) {
      act.appendChild(el('p', '', 'عرض: تدريب منتخب <b>' + esc(o.natOffer.ar) + '</b>'));
      const a = el('button', 'cm-btn', 'اقبل'), d = el('button', 'cm-btn ghost', 'ارفض'); a.type = d.type = 'button'; d.style.marginTop = '8px';
      a.addEventListener('click', () => { E.acceptNational(S, o.natOffer); o.natHandled = 1; save(); renderSummary(); });
      d.addEventListener('click', () => { o.natHandled = 1; save(); renderSummary(); }); act.appendChild(a); act.appendChild(d); return;
    }
    if (o.sacked && !o.newClub) {
      act.appendChild(el('div', 'ch-msg bad', 'الإدارة فصلتك من ' + esc(c.ar) + '.'));
      const b = el('button', 'cm-btn', 'اختار نادي جديد'); b.type = 'button'; b.addEventListener('click', () => { pick.mode = 'fired'; pick.fresh = false; startSelect(true); }); act.appendChild(b); return;
    }
    const b = el('button', 'cm-btn', 'ابدأ الموسم الجديد'); b.type = 'button';
    b.addEventListener('click', () => { E.startNextSeason(S, rng); save(); view = 'squad'; mkt.res = null; compSel = null; renderGame(); }); act.appendChild(b);
    const cb = el('button', 'cm-btn ghost', 'المسيرة المهنية'); cb.type = 'button'; cb.style.marginTop = '8px'; cb.addEventListener('click', renderCareer); act.appendChild(cb);
  }

  /* ====== تشغيل ====== */
  S = load();
  if (S) { try { E.nextMine(S); club(S.me.clubId); S.phase === 'summary' ? renderSummary() : renderGame(); } catch (e) { S = null; startSelect(false); } }
  else startSelect(false);
})();
