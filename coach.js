/* Kora Challenge — وضع المدرب (الواجهة) */
(function () {
  'use strict';
  const E = window.KoraCoachEngine, D = E.D, KEY = 'koraCoach', STATS_KEY = 'koraChallengeStats';
  const $ = id => document.getElementById(id);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const NATS = D.NATS || {};
  let S = null, rng = E.mulberry((Date.now() ^ 0x5bd1e995) >>> 0);
  let squadMode = 'xi', view = 'squad', sortBy = 'pos', compSel = null, compTab = 'table', mkt = { f: { pos: 'F', foot: 'both' }, res: null }, careerClub = null;
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
    ['chSelect', 'chGame', 'chPre', 'chLive', 'chSummary', 'chCareer'].forEach(k => { $(k).hidden = k !== id; });
    $('chBar').hidden = id !== 'chGame' && id !== 'chPre';
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


  /* ====== الرجوع خطوة ====== */
  let depth = 0, curSnap = null;
  function navPush(snap) { curSnap = snap; try { history.pushState(snap, ''); depth++; } catch (e) { /* ignore */ } }
  function overlayOpen() { return !$('cmModal').hidden || !$('chDrawer').hidden; }
  function goBack() {
    if (LV && !LV.done) return;
    if (overlayOpen()) { closeModal(); closeDrawer(); return; }
    if (depth > 0) history.back(); else location.href = 'careermode.html';
  }
  window.addEventListener('popstate', e => {
    if (LV && !LV.done) { try { history.pushState(curSnap, ''); } catch (x) { /* ignore */ } return; }
    if (overlayOpen()) { closeModal(); closeDrawer(); try { history.pushState(curSnap, ''); } catch (x) { /* ignore */ } return; }
    depth = Math.max(0, depth - 1);
    const st = e.state || null; curSnap = st;
    if (!S) { startSelect(false); return; }
    if (st && st.scr === 'career') return renderCareer();
    if (st && st.scr === 'pre') return renderPre();
    if (st && st.scr === 'select') { startSelect(false); return; }
    view = st && st.view || 'squad'; if (S.phase === 'summary') renderSummary(); else renderGame();
  });
  $('chBack').addEventListener('click', e => { e.preventDefault(); goBack(); });

  /* ====== اختيار النادي ====== */
  function startSelect(forced) {
    if (S) { pick.preview = S; pick.seed = 0; }
    else {
      pick.seed = (Date.now() >>> 0) || 1;
      const tmp = {}; E.initWorldClubs(tmp, E.mulberry(pick.seed));
      Object.keys(tmp.clubs).forEach(id => { tmp.clubs[id].t = Math.round(E.squadOvr(tmp, id)); });
      pick.preview = tmp;
    }
    pick.forced = !!forced; renderSelect();
    show('chSelect');
  }
  function renderSelect() {
    const root = $('chSelect'), tmp = pick.preview; root.innerHTML = '';
    const hero = el('div', 'ch-hero', '<span class="cm-kicker">COACH MODE</span><h1>مهنة مدرب</h1><p>' + (pick.mode === 'fired' ? 'اتفصلت من نادي. اختار نادي جديد تكمل بيه مسيرتك.' : 'اختار أي نادي في 18 دوري وابدأ مسيرتك. الرقم الأخضر هو ميزانية النادي للتعاقدات.') + '</p>');
    root.appendChild(hero);
    if (!S) {
      const row = el('div', 'ch-namerow');
      const nm = el('label', 'ch-name', '<span>اسم المدرب</span><input id="chNameIn" maxlength="22" placeholder="اكتب اسمك" value="' + esc(pick.name) + '">');
      const nt = el('label', 'ch-name', '<span>جنسية المدرب</span><select id="chNatIn">' + D.NATIONAL.slice().sort((a, b) => a[0].localeCompare(b[0], 'ar')).map(n => '<option value="' + n[1] + '"' + (pick.nat === n[1] ? ' selected' : '') + '>' + esc(n[0]) + '</option>').join('') + '</select>');
      row.appendChild(nm); row.appendChild(nt); root.appendChild(row);
      nm.querySelector('input').addEventListener('input', e => { pick.name = e.target.value; });
      nt.querySelector('select').addEventListener('change', e => { pick.nat = e.target.value; });
      if (!pick.nat) { pick.nat = 'eg'; nt.querySelector('select').value = 'eg'; }
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
        Object.keys(tmp.clubs).map(id => tmp.clubs[id]).filter(c => c.league === lk && (!S || c.id !== S.me.clubId) && (!qq || c.ar.indexOf(qq) > -1)).sort((a, b) => b.t - a.t).forEach(c => {
          n++;
          const bn = S && S.banned && S.banned[c.id];
          const r = el('button', 'ch-clubrow' + (bn ? ' locked' : '')); r.type = 'button';
          r.appendChild(badge(c));
          r.appendChild(el('span', 'nm', '<b>' + esc(c.ar) + '</b><small>قوة الفريق ' + c.t + '</small>'));
          r.appendChild(el('span', 'ch-bud', '<small>الميزانية</small><b>' + esc(money(D.budgetFor(c.t, c.league))) + '</b>'));
          if (bn) r.appendChild(el('span', 'ch-lock', 'مفصول منه'));
          r.addEventListener('click', () => chooseClub(c.id)); wrap.appendChild(r);
        });
        if (n) { list.appendChild(h); list.appendChild(wrap); }
      });
    }
    q.addEventListener('input', () => { pick.q = q.value; draw(); });
    draw();
    if (S && pick.mode === 'resign') { const b = el('button', 'cm-btn ghost', 'رجوع للعبة'); b.type = 'button'; b.style.marginTop = '12px'; b.addEventListener('click', goBack); root.appendChild(b); }
  }
  async function chooseClub(id) {
    const c = pick.preview.clubs[id];
    if (S && S.banned && S.banned[id]) {
      const ask = await KoraDialog.confirm({ title: 'اتفصلت من ' + c.ar, message: 'مينفعش ترجع تدرّبه غير لو رئيس النادي وافق. تطلب منه يرجّعك؟', okText: 'اطلب الرجوع', cancelText: 'لأ' });
      if (!ask) return;
      const r = E.askReturn(S, id, rng); save();
      if (!r.ok) { await KoraDialog.confirm({ title: 'الرد', message: r.msg, okText: 'تمام', cancelText: 'قفل' }); return; }
    }
    const ok = await KoraDialog.confirm({ title: 'تدرّب ' + c.ar + '؟', message: 'الميزانية: ' + money(D.budgetFor(c.t, c.league)), okText: 'ابدأ', cancelText: 'لأ' });
    if (!ok) return;
    if (S) { E.selectClub(S, id, rng); S.xi = null; S.captain = null; if (S.world && E.nextMine(S) == null) { /* لسه */ } if (S.phase === 'summary' && S.summary) { S.summary.newClub = true; S.summary.sacked = false; } }
    else { const nn = D.NATIONAL.filter(n => n[1] === (pick.nat || 'eg'))[0]; S = E.startCareer({ name: (pick.name || '').trim() || 'المدرب', clubId: id, nat: nn ? { ar: nn[0], code: nn[1] } : null }, E.mulberry(pick.seed)); }
    pick.mode = null; save(); view = 'squad'; if (S.phase === 'summary') renderSummary(); else renderGame();
  }

  /* ====== اللعبة ====== */
  function renderGame() {
    show('chGame');
    if (S.phase === 'summary') return renderSummary();
    const tabs = $('chTabs'); tabs.innerHTML = '';
    [['squad', 'الفريق', ico.squad], ['market', 'السوق', ico.market], ['comp', 'البطولات', ico.cup], ['fin', 'المالية', ico.money]].forEach(t => {
      const b = el('button', 'ch-tab' + (view === t[0] ? ' on' : ''), t[2] + '<span>' + t[1] + '</span>'); b.type = 'button';
      b.addEventListener('click', () => { view = t[0]; if (view === 'comp') { compSel = null; compTab = 'table'; } navPush({ scr: 'game', view }); renderGame(); }); tabs.appendChild(b);
    });
    const mb = el('button', 'ch-tab', ico.menu + '<span>القائمة</span>'); mb.type = 'button'; mb.addEventListener('click', openDrawer); tabs.appendChild(mb);
    const pane = $('chPane'); pane.innerHTML = '';
    pane.appendChild(clubCard());
    if (view === 'squad') drawSquad(pane); else if (view === 'market') drawMarket(pane); else if (view === 'comp') drawComp(pane); else drawFin(pane);
    drawBar();
  }
  function clubCard() {
    const me = club(S.me.clubId), nx = E.nextMine(S), card = el('div', 'cm-card ch-cc');
    const top = el('div', 'ch-club'); top.appendChild(badge(me));
    top.appendChild(el('div', 'meta', '<b>' + esc(me.ar) + '</b><small>' + esc(lg(me.league).ar) + ' · ' + S.year + '/' + String(S.year + 1).slice(2) + ' · ' + esc(S.career.name) + '</small>'));
    const k = el('div', 'ch-mini');
    [['القوة', E.squadOvr(S, me.id)], ['الميزانية', money(S.budget)], ['الثقة', S.boardConf + '%']].forEach(x => k.appendChild(el('span', '', '<small>' + x[0] + '</small><b>' + x[1] + '</b>')));
    top.appendChild(k); card.appendChild(top);
    if (nx) {
      const n = el('div', 'ch-next'); n.appendChild(el('div', 't', esc(nx.comp) + ' · ' + esc(nx.stage)));
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
    const b = el('button', 'cm-btn', nx ? 'ابدأ' : 'إنهاء الموسم'); b.type = 'button';
    b.addEventListener('click', nx ? () => { navPush({ scr: 'pre' }); renderPre(); } : endSeason); bar.appendChild(b);
  }
  function playMatch() {
    const rep = E.playNext(S, rng);
    if (!rep) { if (!S.seasonOver) { S.seasonOver = true; } save(); renderGame(); return; }
    save(); showReport(rep);
  }
  function showReport(rep, fromLive) {
    const h = club(rep.home), a = club(rep.away), me = S.me.clubId;
    let html = '<div class="cm-sheet-h"><b>' + esc(rep.comp) + '</b><small>' + esc(rep.stage) + '</small></div>';
    html += '<div class="ch-next"><div class="vs"><span id="rpH"></span><b style="font-size:1.5rem">' + rep.hg + ' - ' + rep.ag + '</b><span id="rpA"></span></div>' + (rep.pens ? '<div class="t" style="text-align:center;margin-top:6px">ركلات الترجيح ' + rep.pens[0] + ' - ' + rep.pens[1] + '</div>' : '') + '</div>';
    html += '<div style="margin-top:10px">' + (rep.ev || []).map(e => '<div class="ch-ev"><span class="min">' + e.m + '\'</span><span>⚽ ' + esc(e.s) + (e.a ? ' <small style="color:var(--muted)">(صناعة ' + esc(e.a) + ')</small>' : '') + ' <small style="color:var(--muted)">— ' + esc(e.tm === 'h' ? h.ar : a.ar) + '</small></span></div>').join('') + '</div>';
    html += '<div class="ch-lu"><div><h5>' + esc(h.ar) + '</h5><ol>' + (rep.hx || []).map(n => '<li>' + esc(n) + '</li>').join('') + '</ol></div><div><h5>' + esc(a.ar) + '</h5><ol>' + (rep.ax || []).map(n => '<li>' + esc(n) + '</li>').join('') + '</ol></div></div>';
    html += '<button class="cm-btn" id="rpOk" type="button" style="margin-top:14px;width:100%">تمام</button>';
    const sh = modal(html);
    const sp1 = sh.querySelector('#rpH'), sp2 = sh.querySelector('#rpA');
    sp1.appendChild(badge(h)); sp1.appendChild(document.createTextNode(h.ar)); sp2.appendChild(document.createTextNode(a.ar)); sp2.appendChild(badge(a));
    sh.querySelector('#rpOk').addEventListener('click', () => { closeModal(); if (LV && !LV.done) return; LV = null; renderGame(); });
    void me;
  }

  /* ====== قايمة اللاعبين ====== */

  /* ====== صور اللاعيبة (من ويكيبيديا العربية، وبتتخزن) ====== */
  const PH_KEY = 'koraCoachPh2';
  let phCache = {}; try { phCache = JSON.parse(localStorage.getItem(PH_KEY) || '{}'); } catch (e) { phCache = {}; }
  let phQueue = [], phBusy = 0, phDirty = 0;
  function phSave() { if (phDirty++ % 8 === 0) try { localStorage.setItem(PH_KEY, JSON.stringify(phCache)); } catch (e) { phCache = {}; } }
  function phNext() {
    while (phBusy < 4 && phQueue.length) {
      const job = phQueue.shift(); phBusy++;
      fetch('https://www.wikidata.org/w/api.php?action=wbgetentities&sites=arwiki&titles=' + encodeURIComponent(job.name) + '&props=claims&format=json&origin=*')
        .then(r => r.ok ? r.json() : null)
        .then(j => {
          let url = 0;
          const ents = j && j.entities ? Object.keys(j.entities).map(k => j.entities[k]) : [];
          const en = ents.filter(x => x && x.claims)[0];
          if (en) {
            const jobs = (en.claims.P106 || []).map(c => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.id);
            const img = (en.claims.P18 || [])[0], f = img && img.mainsnak && img.mainsnak.datavalue && img.mainsnak.datavalue.value;
            if (f && jobs.indexOf('Q937857') > -1) url = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(f) + '?width=160';
          }
          phCache[job.name] = url; phSave(); job.cb(url);
        })
        .catch(() => job.cb(0))
        .then(() => { phBusy--; phNext(); });
    }
  }
  function loadPhoto(name, cb) {
    if (phCache[name] !== undefined) return cb(phCache[name]);
    phQueue.push({ name: name, cb: cb }); phNext();
  }
  const SIL = '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="23" r="11" fill="currentColor" opacity=".55"/><path d="M10 60c0-13 10-22 22-22s22 9 22 22Z" fill="currentColor" opacity=".55"/></svg>';
  function avatar(p) {
    const ph = el('span', 'ch-ph', SIL);
    loadPhoto(p.n, url => { if (!url) return; const i = document.createElement('img'); i.className = 'ch-face'; i.alt = ''; i.src = url; i.addEventListener('load', () => { ph.innerHTML = ''; ph.appendChild(i); const fc = flagOf(p.t); if (fc) ph.appendChild(flagImg(fc, '')); }); });
    const fc = flagOf(p.t); if (fc) ph.appendChild(flagImg(fc, ''));
    return ph;
  }

  const POS = ['G', 'D', 'M', 'F'];
  function playerRow(p, extra) {
    const r = el('button', 'ch-pl'); r.type = 'button';
    r.appendChild(avatar(p));
    const pn = el('span', 'ch-pn', '<b>' + esc(p.n) + '</b>');
    const tags = el('span', 'ch-tags', '<span class="ch-tag pos">' + E.POS_AR[p.p] + '</span><span class="ch-tag">' + footTag(E.footOf(p)) + '</span>' + (p.f ? '<span class="ch-tag sale">للبيع</span>' : ''));
    pn.appendChild(tags);
    if (!extra) pn.appendChild(el('div', 'ch-en ' + enCls(p.e), '<i style="width:' + Math.max(4, Math.round(p.e)) + '%"></i>'));
    r.appendChild(pn);
    if (extra) r.appendChild(extra); else r.appendChild(el('span', 'ch-num', p.a + ' سنة'));
    r.appendChild(el('span', 'ch-ovr ' + ovrCls(p.o), String(p.o)));
    return r;
  }


  function buildPitch(onTap, selId, elig, dragFn) {
    const f = S.formation || '4-3-3', xi = E.lineup(S, S.me.clubId), F0 = E.FORMS[f];
    const cap = S.captain && xi.some(p => p.i === S.captain) ? S.captain : xi.slice().sort((a, b) => b.o - a.o)[0].i;
    const cnt = f === '4-2-3-1' ? [F0.G, F0.D, 2, 3, 1] : [F0.G, F0.D, F0.M, F0.F];
    const groups = []; let at = 0; cnt.forEach(n => { groups.push(xi.slice(at, at + n)); at += n; });
    const rows = groups.slice().reverse();
    const pitch = el('div', 'ch-pitch');
    rows.forEach(r => {
      const row = el('div', 'ch-prow');
      r.forEach(p => {
        const n = el('button', 'ch-pn2' + (selId === p.i ? ' sel' : '') + (elig && elig(p) ? ' elig' : '')); n.type = 'button'; n.dataset.pid = p.i;
        const av = avatar(p); av.classList.add('sm'); n.appendChild(av);
        n.appendChild(el('span', 'ch-pov ' + ovrCls(p.o), String(p.o)));
        n.appendChild(el('span', 'ch-ppos', E.POS_AR[p.p]));
        if (p.i === cap) n.appendChild(el('span', 'ch-cap', 'C'));
        n.appendChild(el('span', 'ch-pnm', esc(p.n.split(' ').slice(-1)[0])));
        n.appendChild(el('span', 'ch-pen ' + enCls(p.e), '<i style="width:' + Math.max(6, Math.round(p.e)) + '%"></i>'));
        n.addEventListener('click', () => { if (!dragBlock) onTap(p); });
        if (dragFn) enableDrag(n, p.i, dragFn);
        row.appendChild(n);
      });
      pitch.appendChild(row);
    });
    return pitch;
  }

  /* سحب وتبديل: اضغط على اللاعب ثانية وبعدين حرّكه فوق لاعب تاني */
  let dragBlock = false;
  function enableDrag(node, id, onDrop) {
    let timer = null, ghost = null, active = false, sx = 0, sy = 0;
    const pt = e => (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || e;
    function start(e) {
      const t = pt(e); sx = t.clientX; sy = t.clientY;
      timer = setTimeout(() => {
        active = true; ghost = node.cloneNode(true); ghost.className = 'ch-ghost'; ghost.style.left = sx + 'px'; ghost.style.top = sy + 'px';
        document.body.appendChild(ghost); node.classList.add('dragging'); try { navigator.vibrate && navigator.vibrate(25); } catch (x) { /* ignore */ }
      }, 700);
    }
    function move(e) {
      const t = pt(e);
      if (!active) { if (Math.abs(t.clientX - sx) > 10 || Math.abs(t.clientY - sy) > 10) clearTimeout(timer); return; }
      e.preventDefault(); ghost.style.left = t.clientX + 'px'; ghost.style.top = t.clientY + 'px';
      document.querySelectorAll('.drop-on').forEach(x => x.classList.remove('drop-on'));
      const u = document.elementsFromPoint(t.clientX, t.clientY).map(x => x.closest && x.closest('[data-pid]')).filter(x => x && x !== node)[0]; if (u) u.classList.add('drop-on');
    }
    function end(e) {
      clearTimeout(timer); document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', end);
      if (!active) return; active = false;
      const t = pt(e); ghost.remove(); node.classList.remove('dragging'); document.querySelectorAll('.drop-on').forEach(x => x.classList.remove('drop-on'));
      const u = document.elementsFromPoint(t.clientX, t.clientY).map(x => x.closest && x.closest('[data-pid]')).filter(x => x && x !== node)[0];
      dragBlock = true; setTimeout(() => { dragBlock = false; }, 80);
      if (u) onDrop(id, u.dataset.pid);
    }
    node.addEventListener('touchstart', start, { passive: true }); node.addEventListener('touchmove', move, { passive: false });
    node.addEventListener('touchend', end); node.addEventListener('touchcancel', end);
    node.addEventListener('mousedown', e => { start(e); document.addEventListener('mousemove', move); document.addEventListener('mouseup', end); });
    node.addEventListener('contextmenu', e => { if (active) e.preventDefault(); });
  }
  function doSwap(a, b) {
    if (a === b) return;
    const sq = S.squads[S.me.clubId], pa = sq.filter(p => p.i === a)[0], pb = sq.filter(p => p.i === b)[0]; if (!pa || !pb) return;
    if ((pa.p === 'G') !== (pb.p === 'G')) { preSel = null; renderPre(); const t = el('div', 'ch-msg bad', 'الحارس بيتبدل بحارس بس.'); $('chPre').prepend(t); setTimeout(() => t.remove(), 2500); return; }
    const ia = S.xi.indexOf(a), ib = S.xi.indexOf(b);
    if (ia > -1 && ib > -1) { S.xi[ia] = b; S.xi[ib] = a; }
    else if (ia > -1) S.xi[ia] = b; else if (ib > -1) S.xi[ib] = a; else return;
    preSel = null; save(); renderPre();
  }

  /* ====== شاشة ما قبل المباراة ====== */
  let preSel = null;
  const PRESS = ['خفيف', 'متوسط', 'عالي'];
  function renderPre() {
    show('chPre');
    const root = $('chPre'), me = S.me.clubId; root.innerHTML = '';
    const xi = E.lineup(S, me), nx = E.nextMine(S);
    if (!nx) { renderGame(); return; }
    S.xi = xi.map(p => p.i);
    const cap = S.captain && xi.some(p => p.i === S.captain) ? S.captain : xi.slice().sort((a, b) => b.o - a.o)[0].i;
    S.captain = cap;
    const tac = el('div', 'ch-tac');
    const c1 = el('button', 'ch-tc', '<small>الخطة التكتيكية</small><b>' + (S.formation || '4-3-3') + '</b>'); c1.type = 'button';
    c1.addEventListener('click', () => {
      const sh = modal('<div class="cm-sheet-h"><b>الخطة التكتيكية</b></div><div class="ch-opts" id="fmL"></div>'), L = sh.querySelector('#fmL');
      Object.keys(E.FORMS).forEach(k => { const b = el('button', 'ch-opt' + (k === (S.formation || '4-3-3') ? ' on' : ''), k); b.type = 'button'; b.addEventListener('click', () => { S.formation = k; S.xi = null; preSel = null; save(); closeModal(); renderPre(); }); L.appendChild(b); });
    });
    const c2 = el('button', 'ch-tc', '<small>الضغط</small><b>' + PRESS[S.pressure || 0] + '</b>'); c2.type = 'button';
    c2.addEventListener('click', () => {
      const sh = modal('<div class="cm-sheet-h"><b>الضغط</b><small>العالي بيزوّد القوة وبيستهلك الطاقة أسرع</small></div><div class="ch-opts" id="prL"></div>'), L = sh.querySelector('#prL');
      PRESS.forEach((k, i) => { const b = el('button', 'ch-opt' + (i === (S.pressure || 0) ? ' on' : ''), k); b.type = 'button'; b.addEventListener('click', () => { S.pressure = i; save(); closeModal(); renderPre(); }); L.appendChild(b); });
    });
    const cp = xi.filter(p => p.i === cap)[0];
    const c3 = el('button', 'ch-tc', '<small>القائد</small><b>' + esc(cp ? cp.n : '—') + '</b>'); c3.type = 'button';
    c3.addEventListener('click', () => {
      const sh = modal('<div class="cm-sheet-h"><b>اختار القائد</b></div><div id="capL"></div>'), L = sh.querySelector('#capL');
      xi.slice().sort((a, b) => b.o - a.o).forEach(p => { const r = playerRow(p); r.addEventListener('click', () => { S.captain = p.i; save(); closeModal(); renderPre(); }); L.appendChild(r); });
    });
    tac.appendChild(c1); tac.appendChild(c2); tac.appendChild(c3); root.appendChild(tac);
    root.appendChild(el('p', 'cm-note ch-hint', 'للتبديل: اضغط على اللاعب ثانية وحرّكه فوق لاعب تاني (في الملعب أو البدلاء). أو دوس على لاعب ثم على اللي هتبدله.'));
    const selP = preSel ? S.squads[me].filter(p => p.i === preSel.id)[0] : null;
    const onPitch = {}; xi.forEach(p => { onPitch[p.i] = 1; });
    function swap(outId, inId) { doSwap(outId, inId); }
    root.appendChild(buildPitch(p => {
      if (preSel && preSel.id !== p.i) return swap(preSel.id, p.i);
      preSel = preSel && preSel.id === p.i ? null : { t: 'pitch', id: p.i }; renderPre();
    }, preSel ? preSel.id : null, null, doSwap));
    root.appendChild(el('div', 'ch-bench-h', 'البدلاء'));
    const grid = el('div', 'ch-bench');
    S.squads[me].filter(p => !onPitch[p.i]).sort((a, b) => POS.indexOf(a.p) - POS.indexOf(b.p) || b.o - a.o).forEach(p => {
      const n = el('button', 'ch-bn' + (preSel && preSel.id === p.i ? ' sel' : '')); n.type = 'button'; n.dataset.pid = p.i;
      const av = avatar(p); av.classList.add('sm'); n.appendChild(av);
      n.appendChild(el('span', 'ch-pov ' + ovrCls(p.o), String(p.o)));
      n.appendChild(el('span', 'ch-ppos', E.POS_AR[p.p]));
      n.appendChild(el('span', 'ch-pnm', esc(p.n.split(' ').slice(-1)[0])));
      n.appendChild(el('span', 'ch-pen ' + enCls(p.e), '<i style="width:' + Math.max(6, Math.round(p.e)) + '%"></i>'));
      n.addEventListener('click', () => {
        if (dragBlock) return;
        if (preSel && preSel.id !== p.i) return swap(preSel.id, p.i);
        preSel = preSel && preSel.id === p.i ? null : { t: 'bench', id: p.i }; renderPre();
      });
      enableDrag(n, p.i, doSwap);
      grid.appendChild(n);
    });
    root.appendChild(grid);
    root.style.paddingBottom = '90px';
    const bar = $('chBar'); bar.innerHTML = '';
    const info = el('div', 'ch-binfo'); info.appendChild(badge(club(nx.home))); info.appendChild(el('span', 'ch-bvs', esc(nx.stage).replace('الجولة', 'ج')));
    info.appendChild(badge(club(nx.away)));
    const go = el('button', 'cm-btn', 'خوض المباراة'); go.type = 'button'; go.addEventListener('click', () => { preSel = null; startLive(); });
    bar.appendChild(info); bar.appendChild(go);
  }

  function drawPitch(pane) {
    const f = S.formation || '4-3-3'; S.formation = f;
    const fs = el('div', 'ch-scroll');
    Object.keys(E.FORMS).forEach(k => { const b = el('button', 'ch-fchip' + (k === f ? ' on' : ''), k); b.type = 'button'; b.addEventListener('click', () => { S.formation = k; S.xi = null; save(); renderGame(); }); fs.appendChild(b); });
    pane.appendChild(fs);
    pane.appendChild(buildPitch(p => playerModal(p, true)));
    const xi = E.lineup(S, S.me.clubId);
    const used = {}; xi.forEach(p => { used[p.i] = 1; });
    const card = el('div', 'cm-card'); card.appendChild(el('div', 'ch-rdh', 'الاحتياطي'));
    S.squads[S.me.clubId].filter(p => !used[p.i]).sort((a, b) => b.o - a.o).forEach(p => { const r = playerRow(p); r.addEventListener('click', () => playerModal(p, true)); card.appendChild(r); });
    pane.appendChild(card);
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
    let html = '<div id="pmAv" style="display:flex;justify-content:center;margin-bottom:10px"></div><div class="cm-sheet-h"><b>' + esc(p.n) + '</b><small>' + E.POS_AR[p.p] + ' · ' + p.a + ' سنة</small></div><div class="ch-kpis">';
    [['القوة', p.o], ['الطاقة', Math.round(p.e) + '%'], ['القيمة', money(v)], ['الطول', E.heightOf(p) + ' سم'], ['القدم', footAr(E.footOf(p))], ['الجنسية', (NATS[p.t] || [])[0] || '—']].forEach(x => { html += '<div class="cm-stat"><small>' + x[0] + '</small><b>' + x[1] + '</b></div>'; });
    html += '</div>';
    if (club0) html += '<p class="cm-note">النادي: ' + esc(club(club0).ar) + '</p>';
    html += '<div class="ch-fab" id="pmAct"></div><button class="cm-btn ghost" id="pmX" type="button" style="width:100%;margin-top:8px">قفل</button>';
    const sh = modal(html), act = sh.querySelector('#pmAct');
    sh.querySelector('#pmX').addEventListener('click', closeModal);
    { const av = avatar(p); av.classList.add('big'); sh.querySelector('#pmAv').appendChild(av); }
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

  function natView(pane) {
    const k = compSel.k, def = E.TOURN[k];
    const btn = el('button', 'ch-compbtn'); btn.type = 'button'; btn.appendChild(el('span', 'sp', esc(def.ar))); btn.insertAdjacentHTML('beforeend', ico.chev); btn.addEventListener('click', compPicker); pane.appendChild(btn);
    const card = el('div', 'cm-card'), past = (S.tourn || []).filter(t => t.key === k).reverse();
    let ny = S.year + 1; while (E.tourneysIn(ny).indexOf(k) < 0) ny++;
    card.appendChild(el('p', 'cm-note', 'النسخة الجاية: ' + ny + ' (بتتلعب في نهاية موسم ' + (ny - 1) + '/' + String(ny).slice(2) + ')'));
    if (!past.length) card.appendChild(el('p', 'cm-note', 'لسه محصلتش نسخة في مسيرتك.'));
    past.forEach(t => {
      const r = el('div', 'ch-ld'); r.appendChild(flagImg(t.champCode, 'cm-flag'));
      r.appendChild(el('span', 'nm', '<b>' + t.year + ' — ' + esc(t.champ) + '</b><small>الوصيف: ' + esc(t.runner) + ' · نصف النهائي: ' + esc(t.semis.join('، ')) + '</small>')); card.appendChild(r);
    });
    pane.appendChild(card);
  }

  function autoComp() {
    const nx = E.nextMine(S), lk = club(S.me.clubId).league;
    if (nx) { const cp = S.world.cups.filter(c => c.ar === nx.comp)[0]; if (cp) return { t: 'cup', k: cp.key }; }
    return { t: 'lg', k: lk };
  }
  function drawComp(pane) {
    const bk = el('button', 'ch-miniback', '→ رجوع'); bk.type = 'button'; bk.addEventListener('click', goBack); pane.appendChild(bk);
    if (!compSel) compSel = autoComp();
    if (compSel.t === 'lg' && !S.world.leagues[compSel.k]) compSel = { t: 'lg', k: club(S.me.clubId).league };
    if (compSel.t === 'nat') return natView(pane);
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
    html += '<h4>المنتخبات</h4>' + Object.keys(E.TOURN).map(k => '<button class="cm-chip" data-t="nat" data-k="' + k + '" type="button">' + esc(E.TOURN[k].ar) + '</button>').join('');
    const sh = modal(html + '</div>');
    sh.querySelectorAll('.cm-chip').forEach(b => b.addEventListener('click', () => { compSel = { t: b.dataset.t, k: b.dataset.k }; compTab = 'table'; closeModal(); renderGame(); }));
  }

  /* ====== المالية ====== */
  function drawFin(pane) {
    const card = el('div', 'cm-card'), cf = S.boardConf;
    card.innerHTML = '<h3>ثقة الإدارة</h3><div class="ch-conf"><i class="' + (cf < 35 ? 'lo' : cf < 65 ? 'mid' : 'hi') + '" style="width:' + cf + '%;background:' + (cf < 35 ? '#ff7a59' : cf < 65 ? '#f6c445' : '#24e982') + '"></i></div><p class="cm-note">' + cf + '% · الإدارة متوقعة مركز ' + (S.exp || '—') + ' في الدوري. لو الثقة نزلت تحت 22% آخر الموسم هتتفصل.</p>';
    pane.appendChild(card);
    const k = el('div', 'cm-card'); k.innerHTML = '<h3>الميزانية</h3><div class="ch-kpis"><div class="cm-stat"><small>متاح للتعاقدات</small><b>' + esc(money(S.budget)) + '</b></div></div>';
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
    const rs = el('button', 'ch-resign', 'استقالة من النادي'); rs.type = 'button'; rs.addEventListener('click', resign); p.appendChild(rs);
    [['squad', 'الفريق', ico.squad], ['career', 'المسيرة المهنية', ico.career]].forEach(m => {
      const b = el('button', 'ch-mi' + (m[0] === 'squad' && view === 'squad' ? ' on' : ''), m[2] + '<span>' + m[1] + '</span>'); b.type = 'button';
      b.addEventListener('click', () => { closeDrawer(); if (m[0] === 'career') { navPush({ scr: 'career' }); renderCareer(); } else { view = 'squad'; navPush({ scr: 'game', view }); renderGame(); } }); p.appendChild(b);
    });
    const nw = el('button', 'ch-restart', 'إعادة البدء من جديد'); nw.type = 'button'; nw.addEventListener('click', newCareer); p.appendChild(nw);
    $('chDrawer').hidden = false;
  }
  function closeDrawer() { $('chDrawer').hidden = true; }
  $('chDrawerBack').addEventListener('click', closeDrawer);
  async function resign() {
    closeDrawer();
    const ok = await KoraDialog.confirm({ title: 'استقالة', message: 'هتسيب ' + club(S.me.clubId).ar + ' وتختار نادي جديد. متأكد؟', okText: 'استقالة', cancelText: 'لأ', danger: true });
    if (!ok) return;
    pick.mode = 'resign'; pick.fresh = false; navPush({ scr: 'select' }); startSelect(false);
  }
  async function newCareer() {
    closeDrawer();
    const ok = await KoraDialog.confirm({ title: 'مسيرة جديدة', message: 'المسيرة الحالية هتتمسح. متأكد؟', okText: 'امسح وابدأ', cancelText: 'لأ', danger: true });
    if (!ok) return;
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    S = null; pick.fresh = false; pick.mode = 'new'; startSelect(false);
  }


  /* ====== المباراة المباشرة ====== */
  let LV = null, lvSel = null;
  const goalsAt = (f, m) => { const evs = f.mine ? LV.myEv : (f.r ? f.r.ev : []); let h = 0, a = 0; evs.forEach(e => { if (e.m <= m) { if (e.tm === 'h') h++; else a++; } }); return [h, a]; };
  function startLive() {
    const live = E.liveBegin(S, rng);
    if (!live) { renderGame(); return; }
    LV = { live: live, myEv: [], minute: 0, subs: 0, done: false, timer: null, rep: null, lastGoal: null };
    show('chLive'); $('chBar').hidden = true;
    drawLive(); LV.timer = setTimeout(tickLive, 700);
  }
  function drawLive() {
    const root = $('chLive'), L = LV.live; root.innerHTML = '';
    const top = el('div', 'ch-lv-top');
    top.appendChild(el('div', 'ch-lv-min', '<b id="lvMin">' + (LV.done ? 'انتهت' : LV.minute + "'") + '</b>'));
    top.appendChild(el('div', 'ch-lv-prog', '<i id="lvProg" style="width:' + Math.min(100, LV.minute / 90 * 100) + '%"></i>'));
    root.appendChild(top);
    root.appendChild(el('div', 'ch-lv-comp', '<b>' + esc(L.comp) + '</b><small>' + esc(L.stage) + '</small>'));
    const list = el('div', 'ch-lv-list', ''); list.id = 'lvList';
    L.fixtures.forEach((f, i) => {
      const r = el('button', 'ch-lv-row' + (f.mine ? ' mine' : '')); r.type = 'button'; r.dataset.i = i;
      const h = el('span', 'ch-lv-t'), a = el('span', 'ch-lv-t b');
      h.appendChild(el('span', 'nm', esc(club(f.home).ar))); h.appendChild(badge(club(f.home)));
      a.appendChild(badge(club(f.away))); a.appendChild(el('span', 'nm', esc(club(f.away).ar)));
      r.appendChild(h); r.appendChild(el('span', 'ch-lv-sc', '0 - 0')); r.appendChild(a);
      if (f.mine) r.addEventListener('click', openMyPanel);
      list.appendChild(r);
    });
    root.appendChild(list);
    const bt = el('div', 'ch-lv-btns'); bt.id = 'lvBtns'; root.appendChild(bt);
    updateLive(); drawLvBtns();
  }
  function drawLvBtns() {
    const bt = $('lvBtns'); if (!bt) return; bt.innerHTML = '';
    if (!LV.done) {
      const t = el('button', 'cm-btn', 'تشكيلتي والتبديلات'); t.type = 'button'; t.addEventListener('click', openMyPanel); bt.appendChild(t);
      const k = el('button', 'cm-btn ghost', 'تخطي للنهاية'); k.type = 'button'; k.addEventListener('click', () => { clearTimeout(LV.timer); while (LV.minute < 90) stepMinute(); finishLive(); }); bt.appendChild(k);
    } else {
      const t = el('button', 'cm-btn', 'تقرير المباراة'); t.type = 'button'; t.addEventListener('click', () => showReport(LV.rep)); bt.appendChild(t);
    }
  }
  function updateLive() {
    const rows = document.querySelectorAll('#lvList .ch-lv-row');
    LV.live.fixtures.forEach((f, i) => {
      const g = goalsAt(f, LV.minute), sc = rows[i] && rows[i].querySelector('.ch-lv-sc'); if (!sc) return;
      const txt = g[0] + ' - ' + g[1];
      if (sc.textContent !== txt) { sc.textContent = txt; sc.classList.add('flash'); setTimeout(() => sc.classList.remove('flash'), 1200); }
    });
    const m = $('lvMin'); if (m) m.textContent = LV.done ? 'انتهت' : (LV.half ? 'استراحة' : LV.minute + "'");
    const pr = $('lvProg'); if (pr) pr.style.width = Math.min(100, LV.minute / 90 * 100) + '%';
  }
  function stepMinute() {
    LV.minute++;
    E.liveGoal(S, LV.live, LV.minute, rng).forEach(e => { LV.myEv.push(e); const mine = LV.live.fixtures.filter(f => f.mine)[0]; void mine; LV.lastGoal = e; });
  }
  function tickLive() {
    if (LV.minute >= 90) return finishLive();
    stepMinute(); updateLive(); refreshPanel();
    if (LV.minute === 45 && !LV.half) { LV.half = true; updateLive(); LV.timer = setTimeout(() => { LV.half = false; updateLive(); LV.timer = setTimeout(tickLive, 333); }, 2200); return; }
    LV.timer = setTimeout(tickLive, 333);
  }
  function finishLive() {
    LV.minute = 90; LV.rep = E.liveFinish(S, LV.live, LV.myEv, rng); LV.done = true; save();
    updateLive(); drawLvBtns();
    const f = LV.live.fixtures.filter(x => x.mine)[0]; if (f) f.r = { ev: LV.myEv };
    setTimeout(() => { if (LV.rep) showReport(LV.rep, true); }, 600);
  }
  function refreshPanel() { const e = $('lvPMin'); if (e) e.textContent = LV.minute + "'  ·  " + goalsAt(LV.live.fixtures.filter(f => f.mine)[0], LV.minute).join(' - '); }
  function openMyPanel() {
    const sh = modal('<div class="ch-ph-head"><div class="cm-sheet-h"><b>تشكيلتي</b><small id="lvPMin"></small></div><button class="cm-btn" id="lvPX" type="button">رجوع للمباراة</button></div><p class="cm-note" id="lvPNote"></p><div id="lvPBody"></div>');
    sh.querySelector('#lvPX').addEventListener('click', closeModal);
    lvSel = null; drawPanel(); refreshPanel();
  }
  function drawPanel() {
    const body = $('lvPBody'); if (!body) return; body.innerHTML = '';
    const me = S.me.clubId, xi = E.lineup(S, me), on = {}; xi.forEach(p => { on[p.i] = 1; });
    $('lvPNote').textContent = 'التبديلات: ' + LV.subs + ' من 5. دوس على لاعب في الملعب ثم على بديل.' + (LV.done ? ' (المباراة انتهت)' : '');
    body.appendChild(buildPitch(p => {
      if (LV.done) return;
      lvSel = lvSel && lvSel.id === p.i ? null : { t: 'p', id: p.i }; drawPanel();
    }, lvSel && lvSel.t === 'p' ? lvSel.id : null, null, null));
    const grid = el('div', 'ch-bench');
    S.squads[me].filter(p => !on[p.i]).sort((a, b) => POS.indexOf(a.p) - POS.indexOf(b.p) || b.o - a.o).forEach(p => {
      const n = el('button', 'ch-bn' + (lvSel && lvSel.t === 'p' ? ' elig' : '')); n.type = 'button';
      const av = avatar(p); av.classList.add('sm'); n.appendChild(av);
      n.appendChild(el('span', 'ch-pov ' + ovrCls(p.o), String(p.o))); n.appendChild(el('span', 'ch-ppos', E.POS_AR[p.p]));
      n.appendChild(el('span', 'ch-pnm', esc(p.n.split(' ').slice(-1)[0])));
      n.appendChild(el('span', 'ch-pen ' + enCls(p.e), '<i style="width:' + Math.max(6, Math.round(p.e)) + '%"></i>'));
      n.addEventListener('click', () => {
        if (LV.done || !lvSel) return;
        if (LV.subs >= 5) { $('lvPNote').textContent = 'خلصت التبديلات الخمسة.'; return; }
        const out = xi.filter(q => q.i === lvSel.id)[0]; if (!out) return;
        if ((out.p === 'G') !== (p.p === 'G')) { $('lvPNote').textContent = 'الحارس بيتبدل بحارس بس.'; return; }
        S.xi = xi.map(q => q.i === out.i ? p.i : q.i); LV.subs++; lvSel = null; save(); drawPanel();
      });
      grid.appendChild(n);
    });
    body.appendChild(el('div', 'ch-bench-h', 'البدلاء')); body.appendChild(grid);
  }

  /* ====== المسيرة المهنية ====== */
  function renderCareer() {
    show('chCareer');
    const root = $('chCareer'), c = S.career; root.innerHTML = '';
    root.appendChild(el('div', 'ch-career-h', '<span class="cm-kicker">COACH</span><br><b>' + esc(c.name) + '</b>'));
    const back = el('button', 'cm-btn ghost', 'رجوع للعبة'); back.type = 'button'; back.style.marginBottom = '12px'; back.addEventListener('click', goBack); root.appendChild(back);
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
    c.natHist.forEach(n => {
      const r = el('div', 'ch-ld'); r.appendChild(flagImg(n.code, 'cm-flag'));
      r.appendChild(el('span', 'nm', '<b>' + esc(n.ar) + '</b><small>من ' + n.from + (c.nat === n ? ' · حاليًا' : '') + '</small>')); nat.appendChild(r);
      (n.results || []).slice(-6).forEach(x => nat.appendChild(el('div', 'ch-ev', '<span class="min">' + x.year + '</span><span>' + esc(x.name) + ': ' + esc(x.stage) + '</span>')));
    });
    if (c.nat) { const rb = el('button', 'cm-btn ghost', 'استقالة من المنتخب'); rb.type = 'button'; rb.style.marginTop = '10px'; rb.addEventListener('click', async () => { if (await KoraDialog.confirm({ title: 'استقالة من ' + c.nat.ar, message: 'متأكد؟', okText: 'استقالة', cancelText: 'لأ', danger: true })) { E.resignNational(S); save(); renderCareer(); } }); nat.appendChild(rb); }
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
    const k = el('div', 'ch-kpis'); [['المركز', o.pos + ' من ' + o.teams], ['النقاط', o.row.pts], ['فارق الأهداف', o.row.gd]].forEach(x => k.appendChild(el('div', 'cm-stat', '<small>' + x[0] + '</small><b>' + x[1] + '</b>')));
    card.appendChild(k); root.appendChild(card);
    const info = el('div', 'cm-card');
    let html = '';
    if (o.trophies.length) html += o.trophies.map(t => '<div class="ch-msg">🏆 ' + esc(t.text) + '</div>').join('');
    o.cups.forEach(x => { html += '<div class="ch-ev"><span class="min">🏟</span><span>' + esc(x.ar) + ': ' + esc(x.reached) + '</span></div>'; });
    if (o.moved) html += '<div class="ch-msg' + (o.moved === 'down' ? ' bad' : '') + '">' + (o.moved === 'up' ? 'فريقك صعد للدرجة الأعلى!' : 'فريقك هبط للدرجة الأدنى.') + '</div>';
    html += '<h3>ثقة الإدارة: ' + o.conf + '%</h3><div class="ch-conf"><i style="width:' + o.conf + '%;background:' + (o.conf < 35 ? '#ff7a59' : o.conf < 65 ? '#f6c445' : '#24e982') + '"></i></div><p class="cm-note">كانت متوقعة المركز ' + o.exp + '. دخل الموسم: ' + esc(money(o.income)) + '</p>';
    if (o.scorers && o.scorers.length) html += '<h3>هدافو الدوري</h3>' + o.scorers.map((x, i) => '<div class="ch-ev"><span class="min">' + (i + 1) + '</span><span>' + esc(x.p.n) + ' — ' + x.g + ' هدف (' + esc(S.clubs[x.club].ar) + ')</span></div>').join('');
    if (o.tourn && o.tourn.length) {
      html += '<h3>بطولات المنتخبات</h3>' + o.tourn.map(t => '<div class="ch-ev"><span class="min">🌍</span><span>' + esc(t.rec.ar) + ' ' + t.rec.year + ': البطل <b>' + esc(t.rec.champ) + '</b> · الوصيف ' + esc(t.rec.runner) + (t.stage ? '<br><small style="color:var(--green)">' + esc(t.nat) + ': ' + esc(t.stage) + '</small>' : '') + '</span></div>').join('');
    }
    info.innerHTML = html; root.appendChild(info);
    const act = el('div', 'cm-card'); root.appendChild(act);
    if (o.natOffer && !o.natHandled) {
      act.appendChild(el('p', 'ch-offer', 'منتخب <b>' + esc(o.natOffer.ar) + '</b> (بلدك) استدعاك بعد أدائك الموسم ده. تقبل تدرّبه؟'));
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
    const cb = el('button', 'cm-btn ghost', 'المسيرة المهنية'); cb.type = 'button'; cb.style.marginTop = '8px'; cb.addEventListener('click', () => { navPush({ scr: 'career' }); renderCareer(); }); act.appendChild(cb);
  }

  /* ====== تشغيل ====== */
  S = load();
  if (S) { try { E.nextMine(S); club(S.me.clubId); S.phase === 'summary' ? renderSummary() : renderGame(); } catch (e) { S = null; startSelect(false); } }
  else startSelect(false);
})();
