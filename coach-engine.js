/* Kora Challenge — محرك وضع المدرب (منطق بس من غير واجهة) */
(function (root) {
  'use strict';
  var D = (typeof require !== 'undefined' && typeof module !== 'undefined') ? require('./coach-data.js') : root.KoraCoachData;
  var LG = D.LEAGUES, CT = D.COUNTRIES;
  var SQ = D.SQUADS.map;

  /* ====== أدوات ====== */
  function mulberry(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
  function shuffle(a, rng) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function poisson(l, rng) { var L = Math.exp(-l), k = 0, p = 1; do { k++; p *= rng(); } while (p > L && k < 12); return k - 1; }
  function gauss(rng) { var u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function round1(x) { return Math.round(x * 10) / 10; }
  function hash(str) { var h = 2166136261; str = String(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function ids(o) { return Object.keys(o); }

  var POS_ORDER = { G: 0, D: 1, M: 2, F: 3 };
  var POS_AR = { G: 'حارس', D: 'مدافع', M: 'وسط', F: 'مهاجم' };

  /* ====== لاعبين ====== */
  function genName(nat, rng) {
    var n = D.NATS[nat] || D.NATS.hr, key = n[2], F = D.FIRST[key] || D.FIRST.gen, L = D.LAST[key] || D.LAST.gen;
    return pick(F, rng) + ' ' + pick(L, rng);
  }
  function newP(state, name, pos, age, ovr, nat) { return { i: 'p' + (state.pid++), n: name, p: pos, a: age, o: Math.round(ovr), t: nat, e: 100, f: 0 }; }
  function genP(state, ck, pos, ovr, age, rng) {
    var nat = rng() < 0.7 ? D.LOCAL[ck] : pick(D.FOREIGN[ck], rng);
    return newP(state, genName(nat, rng), pos, age, clamp(ovr, 38, 94), nat);
  }
  function genAge(rng) { return 18 + Math.floor(Math.pow(rng(), 1.15) * 18); }

  function footOf(p) { var h = hash(p.i) % 10; return h < 7 ? 'R' : h < 9 ? 'L' : 'B'; }
  function heightOf(p) { var h = hash(p.i + 'h') % 33; return 164 + h + (p.p === 'G' ? 11 : p.p === 'D' ? 5 : p.p === 'F' ? 2 : 0); }
  function valueOf(p) {
    var v = 0.25 * Math.exp((p.o - 50) / 6.2), a = p.a;
    v *= a <= 21 ? 1.35 : a <= 24 ? 1.15 : a <= 28 ? 1 : a <= 31 ? 0.7 : a <= 34 ? 0.4 : 0.2;
    if (p.p === 'G') v *= 0.8;
    return v >= 20 ? Math.round(v) : Math.max(0.1, Math.round(v * 10) / 10);
  }
  function priceOf(p) { var v = valueOf(p) * (p.f ? 1.1 : (p.o >= 78 ? 1.7 : 1.45)); return v >= 20 ? Math.round(v) : Math.round(v * 10) / 10; }
  function eff(p) { return p.o * (0.82 + 0.18 * p.e / 100); }

  var NEED = { G: 3, D: 8, M: 8, F: 6 };
  var START = { G: 1, D: 4, M: 3, F: 3 };

  function buildSquad(state, club, rng) {
    var list = [], real = SQ[club.id];
    if (real) real.split(';').forEach(function (e) {
      var f = e.split('|'); if (f.length < 5) return;
      list.push(newP(state, f[0], f[1], +f[2], +f[3], f[4]));
    });
    var base = club.t;
    ['G', 'D', 'M', 'F'].forEach(function (pos) {
      var have = list.filter(function (p) { return p.p === pos; });
      var strong = have.filter(function (p) { return p.o >= base - 4; }).length;
      var missingStart = Math.max(0, START[pos] - strong);
      var need = Math.max(0, NEED[pos] - have.length);
      for (var k = 0; k < need; k++) {
        var starter = k < missingStart;
        list.push(genP(state, club.country, pos, starter ? base - 1 + gauss(rng) * 2.4 : base - 8 + gauss(rng) * 3, genAge(rng), rng));
      }
    });
    return list;
  }

  function initWorldClubs(state, rng) {
    state.clubs = {}; state.squads = {}; state.pid = 1;
    function add(c, lk, country) {
      state.clubs[c[0]] = { id: c[0], ar: c[1], t: c[2], crest: c[3] || null, league: lk, country: country, crestFile: null };
    }
    ids(LG).forEach(function (lk) { D.CLUBS[lk].forEach(function (c) { add(c, lk, LG[lk].country); }); });
    ids(D.POOLS).forEach(function (ck) { D.POOLS[ck].forEach(function (c) { add([c[0], c[1], c[2], null], ck + '_pool', ck); }); });
    ids(state.clubs).forEach(function (id) { state.squads[id] = buildSquad(state, state.clubs[id], rng); });
  }

  /* ====== التشكيلة وقوة الفريق ====== */
  function lineup(state, id) {
    var sq = state.squads[id], xi = [], used = {};
    ['G', 'D', 'M', 'F'].forEach(function (pos) {
      var c = sq.filter(function (p) { return p.p === pos; }).sort(function (a, b) { return eff(b) - eff(a); }).slice(0, START[pos]);
      c.forEach(function (p) { xi.push(p); used[p.i] = 1; });
    });
    if (xi.length < 11) sq.slice().sort(function (a, b) { return eff(b) - eff(a); }).forEach(function (p) { if (xi.length < 11 && !used[p.i]) { xi.push(p); used[p.i] = 1; } });
    return xi;
  }
  function teamStr(state, id, xi) {
    xi = xi || lineup(state, id);
    var s = 0; xi.forEach(function (p) { s += eff(p); });
    return s / xi.length;
  }
  function squadOvr(state, id) { return round1(teamStr(state, id)); }

  /* ====== جداول الدوريات ====== */
  function genFixtures(teams, rng, rounds) {
    var t = shuffle(teams, rng), n = t.length, half = [], arr = t.slice(), r, i;
    var odd = n % 2; if (odd) arr.push(null);
    var m = arr.length;
    for (r = 0; r < m - 1; r++) {
      var rd = [];
      for (i = 0; i < m / 2; i++) {
        var a = arr[i], b = arr[m - 1 - i];
        if (a == null || b == null) continue;
        rd.push((r + i) % 2 ? [b, a] : [a, b]);
      }
      half.push(rd);
      arr.splice(1, 0, arr.pop());
    }
    half = shuffle(half, rng);
    var second = half.map(function (rd) { return rd.map(function (x) { return [x[1], x[0]]; }); });
    var all = half.concat(second);
    return rounds ? all.slice(0, rounds) : all;
  }
  function leagueRounds(lk) { var n = LG[lk].size; return lk === 'usa1' ? 34 : 2 * (n - (n % 2 ? 0 : 1)); }

  function table(state, lk, upTo) {
    var L = state.world.leagues[lk], rows = {}, r, i;
    L.teams.forEach(function (id) { rows[id] = { id: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }; });
    var lim = upTo == null ? L.results.length : Math.min(upTo, L.results.length);
    for (r = 0; r < lim; r++) {
      if (!L.results[r]) continue;
      for (i = 0; i < L.results[r].length; i++) {
        var res = L.results[r][i]; if (!res) continue;
        var m = L.fixtures[r][i], h = rows[m[0]], a = rows[m[1]];
        h.p++; a.p++; h.gf += res[0]; h.ga += res[1]; a.gf += res[1]; a.ga += res[0];
        if (res[0] > res[1]) { h.w++; h.pts += 3; a.l++; }
        else if (res[0] < res[1]) { a.w++; a.pts += 3; h.l++; }
        else { h.d++; a.d++; h.pts++; a.pts++; }
      }
    }
    return Object.keys(rows).map(function (k) { var x = rows[k]; x.gd = x.gf - x.ga; return x; })
      .sort(function (x, y) { return y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || (state.clubs[y.id].t - state.clubs[x.id].t); });
  }

  /* ====== مباراة ====== */
  function teamLambda(hs, as) {
    var d = hs - as;
    return [clamp(1.42 * Math.exp((d + 3) / 40), 0.25, 4.6), clamp(1.12 * Math.exp((-d - 3) / 40), 0.2, 4.0)];
  }
  var W_SCORE = { F: 1, M: 0.34, D: 0.07, G: 0.002 }, W_ASSIST = { F: 0.6, M: 1, D: 0.35, G: 0.01 };
  function wpick(arr, wf, rng) {
    var w = arr.map(wf), t = 0; w.forEach(function (x) { t += x; });
    var x = rng() * t, k = 0; while (k < arr.length - 1 && x > w[k]) { x -= w[k]; k++; } return arr[k];
  }

  /* opt.neutral = ملعب محايد، opt.detail = نرجّع تفاصيل الأحداث، opt.sc = خريطة الهدافين */
  function simMatch(state, home, away, rng, opt) {
    opt = opt || {};
    var hx = lineup(state, home), ax = lineup(state, away);
    var hs = teamStr(state, home, hx) + (opt.neutral ? 0 : 2.2), as = teamStr(state, away, ax);
    var l = teamLambda(hs, as), hg = poisson(l[0], rng), ag = poisson(l[1], rng);
    var ev = [];
    function goals(n, xi, tm) {
      for (var i = 0; i < n; i++) {
        var sc = wpick(xi, function (p) { return W_SCORE[p.p] * Math.pow(p.o / 75, 4); }, rng), as2 = null;
        if (rng() < 0.72) as2 = wpick(xi.filter(function (p) { return p !== sc; }), function (p) { return W_ASSIST[p.p] * Math.pow(p.o / 75, 3); }, rng);
        if (opt.sc) {
          var e = opt.sc[sc.i] || (opt.sc[sc.i] = [0, 0]); e[0]++;
          if (as2) { var e2 = opt.sc[as2.i] || (opt.sc[as2.i] = [0, 0]); e2[1]++; }
        }
        if (opt.detail) ev.push({ m: 1 + Math.floor(rng() * 90), tm: tm, s: sc.n, a: as2 ? as2.n : null, sp: sc.i });
      }
    }
    goals(hg, hx, 'h'); goals(ag, ax, 'a');
    ev.sort(function (a, b) { return a.m - b.m; });
    return { hg: hg, ag: ag, ev: ev, hx: hx, ax: ax };
  }

  function playedEnergy(state, played, rng) {
    ids(state.squads).forEach(function (id) {
      var xi = played[id], inx = {};
      if (xi) xi.forEach(function (p) { inx[p.i] = 1; });
      state.squads[id].forEach(function (p) {
        if (xi) p.e = clamp(p.e + (inx[p.i] ? -(9 + rng() * 5) : 7), 22, 100);
        else p.e = clamp(p.e + 9, 22, 100);
        p.e = Math.round(p.e);
      });
    });
  }

  /* ====== بناء العالم (دوريات وكؤوس وروزنامة) ====== */
  var RD_NAME = { 32: 'دور الـ32', 16: 'دور الـ16', 8: 'ربع النهائي', 4: 'نصف النهائي', 2: 'النهائي' };
  var FRACS = {
    32: [0.10, 0.22, 0.40, 0.62, 0.90], 16: [0.18, 0.40, 0.62, 0.90]
  };
  var FRACS_LC = [0.13, 0.26, 0.45, 0.68, 0.84];

  function makeRound(teams, rng, shuf) {
    var t = shuf === false ? teams.slice() : shuffle(teams, rng), ties = [];
    for (var i = 0; i + 1 < t.length; i += 2) ties.push({ h: t[i], a: t[i + 1], res: null, pens: null, w: null });
    return { name: RD_NAME[t.length] || 'جولة', ties: ties };
  }

  function buildWorld(state, rng) {
    var world = { leagues: {}, cups: [], cal: [], nr: 0 }, me = state.me.clubId;
    ids(LG).forEach(function (lk) {
      var teams = ids(state.clubs).filter(function (id) { return state.clubs[id].league === lk; });
      var R = leagueRounds(lk);
      world.leagues[lk] = { teams: teams, fixtures: genFixtures(teams, rng, R), results: [], sc: {} };
      world.nr = Math.max(world.nr, R);
    });
    state.world = world;
    ids(CT).forEach(function (ck) {
      var c = CT[ck];
      c.cups.forEach(function (cd) {
        var sel = [], pool = {};
        cd.from.forEach(function (lk) { pool[lk] = shuffle(world.leagues[lk].teams, rng); });
        cd.from.forEach(function (lk) { if (sel.length < cd.n) sel = sel.concat(pool[lk].slice(0, cd.n - sel.length)); });
        var mine = ids(state.clubs).indexOf(me) > -1 && state.clubs[me].country === ck;
        if (mine && sel.indexOf(me) < 0) sel[sel.length - 1] = me;
        var fr = cd.id === 'lc' ? FRACS_LC : FRACS[cd.n];
        world.cups.push({ key: cd.id, country: ck, ar: cd.ar, n: cd.n, kind: 'cup', rounds: [makeRound(sel, rng)], cur: 0, winner: null, runner: null,
          after: fr.map(function (f) { return Math.floor(f * world.nr); }) });
      });
      if (c.sup) {
        var last = (state.last || {})[ck], top = world.leagues[c.leagues[0]].teams.slice().sort(function (a, b) { return state.clubs[b].t - state.clubs[a].t; });
        var a = last && state.clubs[last.champ] ? last.champ : top[0], b = last && last.cupw && last.cupw !== a && state.clubs[last.cupw] ? last.cupw : (top[0] === a ? top[1] : top[0]);
        world.cups.push({ key: c.sup.id, country: ck, ar: c.sup.ar, n: 2, kind: 'sup', rounds: [{ name: 'النهائي', ties: [{ h: a, a: b, res: null, pens: null, w: null }] }], cur: 0, winner: null, runner: null, after: [-1] });
      }
      if (c.playoff) world.cups.push({ key: c.playoff.id, country: ck, ar: c.playoff.ar, n: c.playoff.n, kind: 'po', rounds: [], cur: 0, winner: null, runner: null, after: [] });
    });
    var cal = [];
    if (world.cups.some(function (x) { return x.kind === 'sup'; })) cal.push({ t: 'sup' });
    for (var s = 0; s < world.nr; s++) {
      cal.push({ t: 'lg', s: s });
      world.cups.forEach(function (cp) {
        if (cp.kind !== 'cup') return;
        cp.after.forEach(function (af, rd) { if (af === s) cal.push({ t: 'cup', key: cp.key, rd: rd }); });
      });
    }
    world.cups.forEach(function (cp) { if (cp.kind === 'po') { for (var r = 0; r < 3; r++) cal.push({ t: 'po', key: cp.key, rd: r }); } });
    world.cal = cal;
    state.idx = 0; state.step = 0; state.log = []; state.seasonOver = false;
  }

  function cupOf(state, key) { return state.world.cups.filter(function (c) { return c.key === key; })[0]; }

  function tieSim(state, tie, rd, total, rng, mine, played) {
    var neutral = total === 2 && rd.name === 'النهائي';
    var r = simMatch(state, tie.h, tie.a, rng, { neutral: neutral, detail: mine });
    tie.res = [r.hg, r.ag];
    if (r.hg === r.ag) {
      var p = clamp(0.5 + (teamStr(state, tie.h, r.hx) - teamStr(state, tie.a, r.ax)) / 160, 0.3, 0.7);
      var hw = rng() < p; tie.pens = hw ? [5, 4] : [4, 5]; tie.w = hw ? tie.h : tie.a;
    } else tie.w = r.hg > r.ag ? tie.h : tie.a;
    played[tie.h] = r.hx; played[tie.a] = r.ax;
    return r;
  }

  function playCupRound(state, cp, rdIdx, rng, played, rep) {
    var rd = cp.rounds[rdIdx]; if (!rd || cp.done) return;
    var me = state.me.clubId;
    rd.ties.forEach(function (t) {
      var mine = t.h === me || t.a === me;
      var r = tieSim(state, t, rd, rd.ties.length * 2, rng, mine, played);
      if (mine) { rep.my = { comp: cp.ar, ck: cp.key, stage: rd.name, home: t.h, away: t.a, hg: r.hg, ag: r.ag, pens: t.pens, ev: r.ev, hx: r.hx.map(function (p) { return p.n; }), ax: r.ax.map(function (p) { return p.n; }) }; }
    });
    var winners = rd.ties.map(function (t) { return t.w; });
    cp.cur = rdIdx + 1;
    if (winners.length === 1) {
      cp.winner = winners[0]; cp.runner = rd.ties[0].w === rd.ties[0].h ? rd.ties[0].a : rd.ties[0].h; cp.done = true;
    } else cp.rounds[rdIdx + 1] = makeRound(winners, rng);
  }

  function playLeagueStep(state, s, rng, played, rep) {
    var world = state.world, me = state.me.clubId;
    ids(world.leagues).forEach(function (lk) {
      var L = world.leagues[lk], R = L.fixtures.length, k = L.results.length;
      if (k >= R) return;
      if (Math.floor((s + 1) * R / world.nr) <= Math.floor(s * R / world.nr)) return;
      var out = [];
      L.fixtures[k].forEach(function (m, i) {
        var mine = m[0] === me || m[1] === me;
        var r = simMatch(state, m[0], m[1], rng, { sc: L.sc, detail: mine });
        out[i] = [r.hg, r.ag]; played[m[0]] = r.hx; played[m[1]] = r.ax;
        if (mine) rep.my = { comp: LG[lk].ar, ck: lk, stage: 'الجولة ' + (k + 1), round: k + 1, home: m[0], away: m[1], hg: r.hg, ag: r.ag, ev: r.ev, hx: r.hx.map(function (p) { return p.n; }), ax: r.ax.map(function (p) { return p.n; }) };
      });
      L.results[k] = out;
    });
    state.step = s + 1;
  }

  function startPlayoffs(state, cp, rng) {
    var tab = table(state, CT[cp.country].leagues[0]), top = tab.slice(0, cp.n).map(function (r) { return r.id; });
    cp.rounds = [makeRound([top[0], top[7], top[3], top[4], top[1], top[6], top[2], top[5]].filter(Boolean), rng, false)];
    cp.rounds[0].name = 'ربع النهائي';
  }

  function playEvent(state, rng) {
    var ev = state.world.cal[state.idx], played = {}, rep = { my: null, ev: ev };
    if (!ev) return null;
    if (ev.t === 'lg') playLeagueStep(state, ev.s, rng, played, rep);
    else if (ev.t === 'sup') state.world.cups.filter(function (c) { return c.kind === 'sup'; }).forEach(function (cp) { playCupRound(state, cp, 0, rng, played, rep); });
    else if (ev.t === 'cup') { var cp = cupOf(state, ev.key); if (cp && cp.rounds[ev.rd] && !cp.done) playCupRound(state, cp, ev.rd, rng, played, rep); }
    else if (ev.t === 'po') {
      var cp2 = cupOf(state, ev.key);
      if (ev.rd === 0 && !cp2.rounds.length) startPlayoffs(state, cp2, rng);
      if (cp2.rounds[ev.rd] && !cp2.done) playCupRound(state, cp2, ev.rd, rng, played, rep);
    }
    playedEnergy(state, played, rng);
    state.idx++;
    if (rep.my) {
      var m = rep.my; m.yr = state.year;
      state.log.push({ comp: m.comp, ck: m.ck, stage: m.stage, home: m.home, away: m.away, hg: m.hg, ag: m.ag, pens: m.pens || null, ev: m.ev, hx: m.hx, ax: m.ax, yr: state.year });
      var cr = state.career.cur; if (cr) {
        var home = m.home === state.me.clubId, ours = home ? m.hg : m.ag, theirs = home ? m.ag : m.hg;
        cr.p++; cr.gf += ours; cr.ga += theirs;
        if (ours > theirs || (ours === theirs && m.pens && ((home && m.pens[0] > m.pens[1]) || (!home && m.pens[1] > m.pens[0])))) cr.w++;
        else if (ours === theirs && !m.pens) cr.d++; else if (ours === theirs) cr.l++; else cr.l++;
      }
    }
    if (state.idx >= state.world.cal.length) state.seasonOver = true;
    return rep;
  }

  /* بيلعب لحد ما فريقي يلعب (أو الموسم يخلص) */
  function playNext(state, rng) {
    var rep = null, guard = 0;
    while (state.idx < state.world.cal.length && guard++ < 400) {
      rep = playEvent(state, rng);
      if (rep.my) return rep.my;
    }
    return null;
  }

  function nextMine(state) {
    /* المباراة الجاية لفريقي (وصف سريع) */
    var me = state.me.clubId, world = state.world, i;
    for (i = state.idx; i < world.cal.length; i++) {
      var ev = world.cal[i];
      if (ev.t === 'lg') {
        var lk = state.clubs[me].league, L = world.leagues[lk], R = L.fixtures.length, k = L.results.length;
        if (k < R && Math.floor((ev.s + 1) * R / world.nr) > Math.floor(ev.s * R / world.nr)) {
          var m = L.fixtures[k].filter(function (x) { return x[0] === me || x[1] === me; })[0];
          if (m) return { comp: LG[lk].ar, stage: 'الجولة ' + (k + 1) + ' من ' + R, home: m[0], away: m[1], idx: i };
        }
      } else if (ev.t === 'sup' || ev.t === 'cup' || ev.t === 'po') {
        var cps = ev.t === 'sup' ? world.cups.filter(function (c) { return c.kind === 'sup'; }) : [cupOf(state, ev.key)], hit = null;
        cps.forEach(function (cp) {
          if (!cp || cp.done) return;
          var rd = cp.rounds[ev.t === 'sup' ? 0 : ev.rd];
          if (!rd) return;
          rd.ties.forEach(function (t) { if (t.h === me || t.a === me) hit = { comp: cp.ar, stage: rd.name, home: t.h, away: t.a, idx: i }; });
        });
        if (hit) return hit;
      }
    }
    return null;
  }

  /* ====== المهنة والمدرب ====== */
  function myLeague(state) { return state.clubs[state.me.clubId].league; }
  function rankInLeague(state, id) {
    var lk = state.clubs[id].league, arr = state.world.leagues[lk].teams.map(function (x) { return { id: x, s: teamStr(state, x) }; }).sort(function (a, b) { return b.s - a.s; });
    return arr.findIndex(function (x) { return x.id === id; }) + 1;
  }
  function beginStint(state) {
    var c = state.clubs[state.me.clubId];
    var st = { clubId: c.id, ar: c.ar, crest: c.crest, from: state.year, to: null, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, seasons: [], trophies: [] };
    state.career.stints.push(st); state.career.cur = st;
    state.exp = rankInLeague(state, c.id);
  }

  function startCareer(opts, rng) {
    var state = { v: 2, kind: 'coach', year: 2026, pid: 1, last: {}, news: [], budget: 0, boardConf: 65 };
    initWorldClubs(state, rng);
    ids(state.clubs).forEach(function (id) { if (SQ[id]) state.clubs[id].t = Math.round(teamStr(state, id)); });
    state.me = { clubId: opts.clubId };
    state.career = { name: opts.name || 'المدرب', stints: [], cur: null, trophies: [], nat: null, natHist: [], seasons: [] };
    var c = state.clubs[opts.clubId];
    state.budget = D.budgetFor(c.t, c.league);
    buildWorld(state, rng);
    beginStint(state);
    summerFlags(state, rng);
    return state;
  }

  /* تغيير النادي (استقالة أو فصل أو عرض) */
  function selectClub(state, clubId, rng) {
    var cr = state.career.cur; if (cr) cr.to = state.year;
    state.me.clubId = clubId;
    var c = state.clubs[clubId];
    state.budget = D.budgetFor(c.t, c.league);
    state.boardConf = 65; state.sacked = false;
    beginStint(state);
    if (state.idx === 0) buildWorldKeep(state, rng);
  }
  function buildWorldKeep(state, rng) { /* قبل ما الموسم يبدأ: نعيد القرعة عشان نادي المدرب الجديد يدخل الكؤوس */
    var nr = state.world.nr; buildWorld(state, rng); void nr;
  }

  function reputation(state) {
    var t = state.career.trophies.length, s = state.career.seasons.length;
    return t * 4 + s;
  }

  function finishSeason(state, rng) {
    while (state.idx < state.world.cal.length) playEvent(state, rng);
    var me = state.me.clubId, c = state.clubs[me], lk = c.league, tab = table(state, lk), pos = tab.findIndex(function (r) { return r.id === me; }) + 1;
    var mine = tab[pos - 1];
    var out = { year: state.year, clubId: me, league: lk, pos: pos, teams: tab.length, row: mine, trophies: [], cups: [], champion: pos === 1 };
    var year = state.year, cr = state.career.cur;
    function addTr(type, key, text) {
      var t = { year: year, type: type, key: key, text: text, clubId: me, clubAr: c.ar };
      state.career.trophies.push(t); if (cr) cr.trophies.push(t); out.trophies.push(t);
    }
    if (pos === 1) addTr('league', lk, 'بطل ' + LG[lk].ar);
    state.world.cups.forEach(function (cp) {
      if (cp.country !== c.country) return;
      var champ = cp.winner === me;
      if (cp.done && champ) addTr(cp.kind === 'sup' ? 'super' : cp.kind === 'po' ? 'po' : 'cup', cp.key, 'بطل ' + cp.ar);
      var reached = null;
      cp.rounds.forEach(function (rd) { rd.ties.forEach(function (t) { if (t.h === me || t.a === me) reached = rd.name; }); });
      if (reached && cp.kind !== 'sup') out.cups.push({ key: cp.key, ar: cp.ar, reached: champ ? 'بطل' : (cp.done && cp.runner === me ? 'وصيف' : 'وصلت ' + reached) });
    });
    /* حفظ أبطال الموسم عشان السوبر */
    ids(CT).forEach(function (ck) {
      var l1 = CT[ck].leagues[0], t1 = table(state, l1), cup = state.world.cups.filter(function (x) { return x.country === ck && x.kind === 'cup'; })[0];
      state.last[ck] = { champ: t1[0].id, cupw: cup && cup.winner };
    });
    /* مجلس الإدارة */
    var diff = (state.exp || pos) - pos;
    var delta = clamp(diff * 2.4, -16, 14) + (pos === 1 ? 10 : 0) + out.trophies.length * 3 - (pos > tab.length - LG[lk].rel ? 12 : 0);
    state.boardConf = clamp(Math.round(state.boardConf * 0.65 + 35 * 0.35 + delta), 0, 100);
    out.conf = state.boardConf; out.exp = state.exp;
    out.sacked = state.boardConf < 22;
    /* الدخل */
    var b0 = D.budgetFor(c.t, lk);
    var income = b0 * 0.32 * (1.3 - 0.9 * (pos - 1) / Math.max(1, tab.length - 1)) + out.trophies.length * 0.12 * b0;
    income = Math.round(income * 10) / 10; state.budget = round1(state.budget + income); out.income = income;
    /* سجل الموسم */
    var seasonRec = { year: year, clubId: me, clubAr: c.ar, league: lk, pos: pos, row: mine };
    state.career.seasons.push(seasonRec); if (cr) cr.seasons.push(seasonRec);
    out.scorers = topScorers(state, lk, 'g', 3);
    /* الصعود والهبوط (بعد الملخص) */
    out.moves = applyPromotions(state, rng);
    out.moved = out.moves.map[me] || null;
    state.summary = out;
    /* المنتخب */
    out.nat = natSeason(state, rng);
    out.natOffer = null;
    if (!state.career.nat && !out.sacked && reputation(state) >= 8 && rng() < 0.6) {
      var cand = D.NATIONAL.filter(function (n) { return n[2] <= 70 + reputation(state) * 0.8; });
      if (cand.length) { var nn = pick(cand, rng); out.natOffer = { ar: nn[0], code: nn[1], str: nn[2] }; }
    }
    state.phase = 'summary';
    return out;
  }

  function topScorers(state, lk, kind, limit) {
    var L = state.world.leagues[lk], idx = kind === 'a' ? 1 : 0, byId = {}, arr = [];
    L.teams.forEach(function (id) { state.squads[id].forEach(function (p) { byId[p.i] = { p: p, club: id }; }); });
    ids(L.sc).forEach(function (pid) { if (byId[pid] && L.sc[pid][idx] > 0) arr.push({ p: byId[pid].p, club: byId[pid].club, g: L.sc[pid][0], a: L.sc[pid][1] }); });
    arr.sort(function (x, y) { return kind === 'a' ? (y.a - x.a || y.g - x.g) : (y.g - x.g || y.a - x.a); });
    return limit ? arr.slice(0, limit) : arr;
  }

  function applyPromotions(state, rng) {
    var map = {}, list = [];
    function move(id, lk, dir) { var c = state.clubs[id]; c.league = lk; c.t = clamp(round1(c.t + (dir === 'up' ? 1.5 : -1.2)), 38, 94); map[id] = dir; list.push({ id: id, dir: dir, to: lk }); }
    ids(CT).forEach(function (ck) {
      var lgs = CT[ck].leagues, tabs = {};
      lgs.forEach(function (lk) { tabs[lk] = table(state, lk).map(function (r) { return r.id; }); });
      for (var i = 0; i < lgs.length - 1; i++) {
        var U = lgs[i], L = lgs[i + 1], k = LG[U].rel, uT = tabs[U], lT = tabs[L];
        var down = [], up = [];
        if (LG[L].po) {
          down = uT.slice(-k); up = lT.slice(0, k - 1);
          var cand = lT.slice(k - 1, k + 3), w = cand[0], c1 = cand.slice(1);
          while (c1.length) { var o = c1.shift(); w = rng() < clamp(0.5 + (state.clubs[w].t - state.clubs[o].t) / 80, 0.3, 0.7) ? w : o; }
          up.push(w);
        } else if (LG[U].po) {
          down = uT.slice(-k, uT.length).slice(1); up = lT.slice(0, k - 1);
          var u16 = uT[uT.length - k], l3 = lT[k - 1], ph = state.clubs[u16].t + 1.5, pa = state.clubs[l3].t;
          if (rng() < clamp(0.5 + (ph - pa) / 80, 0.3, 0.7)) { /* بيفضل */ } else { down.push(u16); up.push(l3); }
        } else { down = uT.slice(-k); up = lT.slice(0, k); }
        down.forEach(function (id) { move(id, L, 'down'); });
        up.forEach(function (id) { move(id, U, 'up'); });
      }
      /* أسفل الهرم: هبوط للبول */
      var bottom = lgs[lgs.length - 1], rel = LG[bottom].rel;
      if (rel > 0) {
        var pool = ids(state.clubs).filter(function (id) { return state.clubs[id].league === ck + '_pool'; });
        var outs = tabs[bottom].filter(function (id) { return id !== state.me.clubId; }).slice(-rel);
        outs.forEach(function (id) {
          if (!pool.length) return;
          var inc = pool.splice(Math.floor(rng() * pool.length), 1)[0];
          state.clubs[id].league = ck + '_pool'; state.clubs[id].t = clamp(round1(state.clubs[id].t - 1.2), 38, 94); map[id] = 'down'; list.push({ id: id, dir: 'down', to: ck + '_pool' });
          state.clubs[inc].league = bottom; state.clubs[inc].t = clamp(round1(state.clubs[inc].t + 1.5), 38, 94); map[inc] = 'up'; list.push({ id: inc, dir: 'up', to: bottom });
        });
      }
    });
    return { map: map, list: list };
  }

  /* ====== بين المواسم ====== */
  var DEV = { 17: 3.6, 18: 3.4, 19: 3, 20: 2.6, 21: 2.1, 22: 1.6, 23: 1.2, 24: 0.8, 25: 0.4, 26: 0.1, 27: 0, 28: -0.1, 29: -0.4, 30: -0.9, 31: -1.3, 32: -1.7, 33: -2.1, 34: -2.5 };
  function develop(p, rng) {
    var d = DEV[p.a] != null ? DEV[p.a] : (p.a < 17 ? 3.6 : -3);
    if (p.p === 'G' && p.a >= 28 && p.a <= 33) d += 0.8;
    d += gauss(rng) * 1.2;
    if (p.o > 86) d -= (p.o - 86) * 0.15;
    p.o = clamp(Math.round(p.o + d), 38, 95);
  }
  function fillSquad(state, id, rng) {
    var c = state.clubs[id], sq = state.squads[id];
    ['G', 'D', 'M', 'F'].forEach(function (pos) {
      var have = sq.filter(function (p) { return p.p === pos; }).length;
      for (var k = have; k < NEED[pos]; k++) sq.push(genP(state, c.country, pos, c.t - 12 + gauss(rng) * 3, 17 + Math.floor(rng() * 4), rng));
    });
    while (sq.length > 32) {
      var worst = sq.reduce(function (a, b) { return (b.o + (b.a < 21 ? 4 : 0)) < (a.o + (a.a < 21 ? 4 : 0)) ? b : a; });
      sq.splice(sq.indexOf(worst), 1);
    }
  }
  function recruit(state, id, rng) {
    var c = state.clubs[id], sq = state.squads[id], tries = 0;
    while (teamStr(state, id, lineupOvr(sq)) < c.t - 1.2 && tries++ < 3) {
      var xi = lineupOvr(sq), w = xi.filter(function (p) { return p.p !== 'G'; }).sort(function (a, b) { return a.o - b.o; })[0];
      if (!w) break;
      var np = genP(state, c.country, w.p, c.t + 0.6 + gauss(rng) * 1.8, 22 + Math.floor(rng() * 8), rng);
      sq.push(np);
    }
  }
  function lineupOvr(sq) {
    var xi = [];
    ['G', 'D', 'M', 'F'].forEach(function (pos) { sq.filter(function (p) { return p.p === pos; }).sort(function (a, b) { return b.o - a.o; }).slice(0, START[pos]).forEach(function (p) { xi.push({ p: p.p, o: p.o, e: 100, n: p.n, i: p.i }); }); });
    return xi;
  }
  function summerFlags(state, rng) {
    ids(state.squads).forEach(function (id) { state.squads[id].forEach(function (p) { p.f = (id !== state.me.clubId && rng() < 0.08) ? 1 : 0; }); });
  }

  function aiTransfers(state, rng) {
    var clubs = ids(state.clubs).filter(function (id) { return state.clubs[id].league.indexOf('_pool') < 0 && id !== state.me.clubId; });
    var news = [], i;
    for (i = 0; i < 26; i++) {
      var B = wpick(clubs, function (id) { return Math.pow(Math.max(1, state.clubs[id].t - 45), 1.7); }, rng), bc = state.clubs[B];
      var sellers = clubs.filter(function (id) { return id !== B && state.clubs[id].t <= bc.t + 2 && state.clubs[id].t >= bc.t - 13; });
      if (!sellers.length) continue;
      var A = pick(sellers, rng), top = state.squads[A].slice().sort(function (a, b) { return b.o - a.o; }).slice(0, 7);
      var p = pick(top, rng);
      if (p.o < bc.t - 6 || p.a > 33) continue;
      var bsq = state.squads[B], same = bsq.filter(function (x) { return x.p === p.p; }).sort(function (a, b) { return a.o - b.o; })[0];
      if (!same || same.o >= p.o) continue;
      state.squads[A].splice(state.squads[A].indexOf(p), 1);
      bsq.splice(bsq.indexOf(same), 1); bsq.push(p);
      news.push({ n: p.n, from: A, to: B, fee: valueOf(p), o: p.o, yr: state.year });
      fillSquad(state, A, rng);
    }
    state.news = news;
  }

  function rollSeason(state, rng) {
    ids(state.squads).forEach(function (id) {
      var sq = state.squads[id];
      state.squads[id] = sq.filter(function (p) {
        p.a++; develop(p, rng); p.e = 100;
        var lim = p.p === 'G' ? 38 : 35;
        return !(p.a >= lim + 5 || (p.a >= lim && rng() < (p.a - lim + 1) * 0.2));
      });
      fillSquad(state, id, rng);
    });
    ids(state.clubs).forEach(function (id) {
      if (id === state.me.clubId) return;
      recruit(state, id, rng);
      fillSquad(state, id, rng);
      var c = state.clubs[id]; c.t = round1(clamp(c.t * 0.7 + teamStr(state, id, lineupOvr(state.squads[id])) * 0.3 + gauss(rng) * 0.3, 38, 94));
    });
    aiTransfers(state, rng);
  }

  function startNextSeason(state, rng) {
    state.year++;
    rollSeason(state, rng);
    state.phase = 'play'; state.summary = null;
    buildWorld(state, rng);
    state.exp = rankInLeague(state, state.me.clubId);
    summerFlags(state, rng);
    var cr = state.career.cur; void cr;
    natTournament(state, rng);
  }

  /* ====== المنتخب ====== */
  function acceptNational(state, n) { state.career.nat = { ar: n.ar, code: n.code, str: n.str, from: state.year, results: [] }; state.career.natHist.push(state.career.nat); }
  function natSeason() { return null; }
  function natTournament(state, rng) {
    var nt = state.career.nat; if (!nt) return;
    var y = state.year;
    var kind = y % 4 === 2 ? 'wc' : y % 4 === 0 ? 'cont' : null;
    if (!kind) return;
    var score = nt.str + gauss(rng) * 5 + Math.min(reputation(state), 12) * 0.4, gap = score - (kind === 'wc' ? 76 : 72);
    var stage = gap > 11 ? 'بطل' : gap > 7 ? 'وصيف' : gap > 4 ? 'نصف النهائي' : gap > 1.5 ? 'ربع النهائي' : gap > -2 ? 'دور الـ16' : 'دور المجموعات';
    var name = kind === 'wc' ? 'كأس العالم ' + y : 'البطولة القارية ' + y;
    var res = { year: y, text: name + ': ' + stage, stage: stage, kind: kind, name: name };
    nt.results.push(res);
    if (stage === 'بطل') { var t = { year: y, type: 'nat', key: kind, text: 'بطل ' + name + ' مع ' + nt.ar, clubId: null, clubAr: nt.ar }; state.career.trophies.push(t); }
  }
  function resignNational(state) { state.career.nat = null; }

  /* ====== سوق اللاعبين ====== */
  function marketOpen(state) {
    var nr = state.world.nr;
    if (state.step === 0) return { open: true, label: 'فترة الانتقالات الصيفية' };
    if (state.step >= Math.floor(nr * 0.46) && state.step <= Math.floor(nr * 0.54)) return { open: true, label: 'فترة الانتقالات الشتوية' };
    return { open: false, label: 'السوق مقفول، هيفتح في الصيف أو الشتاء' };
  }
  function allOthers(state) {
    var out = [], me = state.me.clubId;
    ids(state.squads).forEach(function (id) { if (id === me || state.clubs[id].league.indexOf('_pool') > -1) return; state.squads[id].forEach(function (p) { out.push({ p: p, club: id }); }); });
    return out;
  }
  function searchPlayers(state, f, limit) {
    f = f || {};
    var res = allOthers(state).filter(function (x) {
      var p = x.p;
      if (f.pos && f.pos !== 'all' && p.p !== f.pos) return false;
      if (f.foot && f.foot !== 'both') { var ft = footOf(p); if (ft !== f.foot && ft !== 'B') return false; }
      if (f.ovrMin != null && p.o < f.ovrMin) return false;
      if (f.ovrMax != null && p.o > f.ovrMax) return false;
      if (f.ageMin != null && p.a < f.ageMin) return false;
      if (f.ageMax != null && p.a > f.ageMax) return false;
      if (f.hMin != null && heightOf(p) < f.hMin) return false;
      if (f.hMax != null && heightOf(p) > f.hMax) return false;
      if (f.nat && f.nat !== 'all' && p.t !== f.nat) return false;
      if (f.sale && !p.f) return false;
      if (f.star && p.o < 84) return false;
      if (f.q && p.n.indexOf(f.q) < 0) return false;
      var v = valueOf(p);
      if (f.vMin != null && v < f.vMin) return false;
      if (f.vMax != null && v > f.vMax) return false;
      return true;
    }).map(function (x) { return { p: x.p, club: x.club, value: valueOf(x.p), price: priceOf(x.p) }; });
    res.sort(function (a, b) { return b.value - a.value || b.p.o - a.p.o; });
    return limit ? res.slice(0, limit) : res;
  }
  function findP(state, pid) {
    var ks = ids(state.squads);
    for (var i = 0; i < ks.length; i++) { var sq = state.squads[ks[i]]; for (var j = 0; j < sq.length; j++) if (sq[j].i === pid) return { p: sq[j], club: ks[i], idx: j }; }
    return null;
  }
  function buy(state, pid, rng) {
    var m = marketOpen(state); if (!m.open) return { ok: false, msg: m.label };
    var f = findP(state, pid); if (!f || f.club === state.me.clubId) return { ok: false, msg: 'اللاعب مش متاح.' };
    var price = priceOf(f.p), my = state.squads[state.me.clubId];
    if (my.length >= 34) return { ok: false, msg: 'قايمتك مليانة (34 لاعب). بيع حد الأول.' };
    if (state.budget < price) return { ok: false, msg: 'ميزانيتك مش كفاية. محتاج ' + price + ' مليون.' };
    state.squads[f.club].splice(f.idx, 1);
    f.p.f = 0; f.p.e = 100; my.push(f.p);
    state.budget = round1(state.budget - price);
    fillSquad(state, f.club, rng);
    var c = state.clubs[state.me.clubId];
    state.news = (state.news || []).concat([{ n: f.p.n, from: f.club, to: c.id, fee: price, o: f.p.o, yr: state.year, mine: true }]);
    return { ok: true, price: price, msg: 'اتم التعاقد مع ' + f.p.n + ' بـ ' + price + ' مليون.' };
  }
  function sellOffer(state, pid, rng) {
    var f = findP(state, pid); if (!f || f.club !== state.me.clubId) return null;
    var v = valueOf(f.p), cand = ids(state.clubs).filter(function (id) { var c = state.clubs[id]; return id !== state.me.clubId && c.league.indexOf('_pool') < 0 && D.budgetFor(c.t, c.league) * 0.6 >= v * 0.9 && c.t >= f.p.o - 12; });
    if (!cand.length) cand = ids(state.clubs).filter(function (id) { return id !== state.me.clubId && state.clubs[id].league.indexOf('_pool') < 0; });
    var buyer = pick(cand, rng), fee = v * (0.82 + rng() * 0.36);
    fee = fee >= 20 ? Math.round(fee) : Math.round(fee * 10) / 10;
    return { pid: pid, buyer: buyer, fee: fee, p: f.p };
  }
  function sell(state, offer, rng) {
    var m = marketOpen(state); if (!m.open) return { ok: false, msg: m.label };
    var f = findP(state, offer.pid); if (!f || f.club !== state.me.clubId) return { ok: false, msg: 'اللاعب مش عندك.' };
    if (state.squads[state.me.clubId].length <= 18) return { ok: false, msg: 'قايمتك صغيرة (18 لاعب). مينفعش تبيع أكتر.' };
    state.squads[f.club].splice(f.idx, 1);
    f.p.e = 100; f.p.f = 0; state.squads[offer.buyer].push(f.p);
    state.budget = round1(state.budget + offer.fee);
    fillSquad(state, offer.buyer, rng);
    state.news = (state.news || []).concat([{ n: f.p.n, from: f.club, to: offer.buyer, fee: offer.fee, o: f.p.o, yr: state.year, mine: true }]);
    return { ok: true, msg: 'اتباع ' + f.p.n + ' بـ ' + offer.fee + ' مليون.' };
  }

  var API = { mulberry: mulberry, startCareer: startCareer, selectClub: selectClub, playNext: playNext, nextMine: nextMine, finishSeason: finishSeason, startNextSeason: startNextSeason,
    table: table, lineup: lineup, teamStr: teamStr, squadOvr: squadOvr, valueOf: valueOf, priceOf: priceOf, footOf: footOf, heightOf: heightOf, eff: eff,
    topScorers: topScorers, searchPlayers: searchPlayers, buy: buy, sellOffer: sellOffer, sell: sell, marketOpen: marketOpen, findP: findP, cupOf: cupOf,
    acceptNational: acceptNational, resignNational: resignNational, reputation: reputation, leagueRounds: leagueRounds, POS_AR: POS_AR, POS_ORDER: POS_ORDER, initWorldClubs: initWorldClubs, D: D };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.KoraCoachEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
