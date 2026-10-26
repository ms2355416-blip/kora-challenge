/* Kora Challenge — محرك محاكاة كارير مود (منطق بس، من غير واجهة) */
(function (root) {
  'use strict';

  var D = (typeof require !== 'undefined' && typeof module !== 'undefined') ? require('./careermode-data.js') : root.KoraCMData;
  var LG = D.LEAGUES;

  /* ====== أدوات ====== */
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
  function shuffle(a, rng) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function poisson(l, rng) { var L = Math.exp(-l), k = 0, p = 1; do { k++; p *= rng(); } while (p > L && k < 12); return k - 1; }
  function gauss(rng) { var u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function rounds(key) { return 2 * (LG[key].size - 1); }
  function round1(x) { return Math.round(x * 10) / 10; }

  /* ====== العالم (الدوريات والجداول) ====== */
  function genFixtures(teams, rng) {
    var t = shuffle(teams, rng), n = t.length, r, i, out = [], half = [];
    var arr = t.slice();
    for (r = 0; r < n - 1; r++) {
      var rd = [];
      for (i = 0; i < n / 2; i++) {
        var a = arr[i], b = arr[n - 1 - i];
        rd.push((r + i) % 2 ? [b, a] : [a, b]);
      }
      half.push(rd);
      arr.splice(1, 0, arr.pop()); // تدوير
    }
    half = shuffle(half, rng);
    out = half.concat(half.map(function (rd) { return rd.map(function (m) { return [m[1], m[0]]; }); }));
    return out;
  }

  function initClubs(state) {
    state.clubs = state.clubs || {};
    Object.keys(D.CLUBS).forEach(function (lk) {
      D.CLUBS[lk].forEach(function (c) {
        if (!state.clubs[c[0]]) state.clubs[c[0]] = { id: c[0], ar: c[1], str: c[2], crest: c[3], league: lk };
      });
    });
    (D.EURO || []).forEach(function (c) { if (!state.clubs[c[0]]) state.clubs[c[0]] = { id: c[0], ar: c[1], str: c[2], crest: c[3], league: 'euro' }; });
    Object.keys(D.POOL).forEach(function (ck) {
      D.POOL[ck].forEach(function (c) {
        if (!state.clubs[c[0]]) state.clubs[c[0]] = { id: c[0], ar: c[1], str: c[2], crest: null, league: ck + '_pool' };
      });
    });
  }

  function buildWorld(state, country, rng) {
    var world = { country: country, leagues: {} };
    D.COUNTRIES[country].leagues.forEach(function (lk) {
      var teams = Object.keys(state.clubs).filter(function (id) { return state.clubs[id].league === lk; });
      world.leagues[lk] = { teams: teams, fixtures: genFixtures(teams, rng), results: [] };
    });
    state.world = world;
    state.round = 0;
    state.seasonOver = false;
    state.stats = { apps: 0, starts: 0, goals: 0, assists: 0, ratingSum: 0, rated: 0, yellow: 0, red: 0, minutes: 0 };
    state.log = [];
  }

  function table(state, lk, upTo) {
    var L = state.world.leagues[lk], rows = {}, r, i;
    L.teams.forEach(function (id) { rows[id] = { id: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }; });
    var lim = upTo == null ? L.results.length : Math.min(upTo, L.results.length);
    for (r = 0; r < lim; r++) {
      for (i = 0; i < L.results[r].length; i++) {
        var m = L.fixtures[r][i], res = L.results[r][i];
        if (!res) continue;
        var h = rows[m[0]], a = rows[m[1]];
        h.p++; a.p++; h.gf += res[0]; h.ga += res[1]; a.gf += res[1]; a.ga += res[0];
        if (res[0] > res[1]) { h.w++; h.pts += 3; a.l++; }
        else if (res[0] < res[1]) { a.w++; a.pts += 3; h.l++; }
        else { h.d++; a.d++; h.pts++; a.pts++; }
      }
    }
    return Object.keys(rows).map(function (k) { var x = rows[k]; x.gd = x.gf - x.ga; return x; })
      .sort(function (x, y) { return y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || (state.clubs[y.id].str - state.clubs[x.id].str); });
  }

  /* ====== مباراة عادية (من غير اللاعب) ====== */
  function teamLambda(hs, as) {
    var d = hs - as;
    return [clamp(1.42 * Math.exp((d + 3) / 40), 0.25, 4.6), clamp(1.12 * Math.exp((-d - 3) / 40), 0.2, 4.0)];
  }
  function quickMatch(state, h, a, rng) {
    var l = teamLambda(state.clubs[h].str, state.clubs[a].str);
    return [poisson(l[0], rng), poisson(l[1], rng)];
  }

  /* ====== مباراة اللاعب ====== */
  var POS_G = { ST: 0.30, WG: 0.17, MF: 0.09, DF: 0.035, GK: 0 };
  var POS_A = { ST: 0.06, WG: 0.14, MF: 0.12, DF: 0.045, GK: 0.004 };
  var POS_PW = { ST: 1.2, WG: 1.2, MF: 0.8, DF: 0.25, GK: 0 };   // بيجيب ضربة جزاء
  var POS_PC = { ST: 0.3, WG: 0.3, MF: 0.8, DF: 1.2, GK: 0.5 };  // بيتسبب في ضربة جزاء
  var POS_YC = { ST: 0.09, WG: 0.09, MF: 0.14, DF: 0.15, GK: 0.04 };

  function avgForm(state) {
    var f = state.form || [];
    if (!f.length) return 0;
    var s = 0; f.forEach(function (x) { s += x; });
    return s / f.length - 3;
  }

  function decideRole(state, teamStr, rng) {
    var p = state.player, diff = p.ovr - teamStr;
    var pStart = clamp(0.70 - (p.age <= 19 ? 0.1 : 0) + diff * 0.045 + avgForm(state) * 0.06, 0.03, 0.97);
    if (rng() < pStart) {
      var off = rng() < (pStart < 0.5 ? 0.5 : 0.32) ? 55 + Math.floor(rng() * 32) : 90;
      return { role: 'start', a: 0, b: off, pStart: pStart };
    }
    var out = diff < -12 && rng() < 0.4;
    if (out) return { role: 'out', a: 0, b: 0, pStart: pStart };
    var pSub = clamp(0.42 + diff * 0.03, 0.08, 0.78);
    if (rng() < pSub) {
      var on = 46 + Math.floor(rng() * 38);
      return { role: 'sub', a: on, b: 90, pStart: pStart };
    }
    return { role: 'bench', a: 0, b: 0, pStart: pStart };
  }

  function playerMatch(state, home, away, rng, opt) {
    var p = state.player, me = state.clubId, isHome = home === me;
    var opp = isHome ? away : home;
    var teamStr = state.clubs[me].str, oppStr = state.clubs[opp].str;
    var diffLg = opt && opt.diff != null ? opt.diff : LG[state.league].diff;
    var dec = decideRole(state, teamStr, rng);
    var a = dec.a, b = dec.b, events = [];
    var pos = p.pos;

    var l = isHome ? teamLambda(teamStr, oppStr) : (function () { var x = teamLambda(oppStr, teamStr); return [x[1], x[0]]; })();
    // l = [لفريقنا, للخصم] لو احنا اللي بنلعب أصحاب أرض
    var lOur = isHome ? l[0] : l[0], lOpp = isHome ? l[1] : l[1];
    var frac = (b - a) / 90;
    lOur *= 1 + clamp((p.ovr - teamStr) / 250, -0.1, 0.15) * frac;

    var our = [], oppG = [], i;
    var nOur = poisson(lOur, rng), nOpp = poisson(lOpp, rng);
    for (i = 0; i < nOur; i++) our.push(1 + Math.floor(rng() * 90));
    for (i = 0; i < nOpp; i++) oppG.push(1 + Math.floor(rng() * 90));

    var res = { role: dec.role, a: a, b: b, goals: 0, assists: 0, yellow: 0, red: 0, pw: 0, pc: 0, pm: 0, ourEvents: [], events: events };
    var inPlay = dec.role === 'start' || dec.role === 'sub';

    if (inPlay) {
      // ضربة جزاء جابها
      if (rng() < 0.045 * POS_PW[pos] * frac) {
        var m1 = clamp(a + 1 + Math.floor(rng() * (b - a)), 1, 90);
        res.pw = 1;
        events.push({ m: m1, t: 'pw' });
        var taker = p.ovr >= teamStr - 3 && rng() < 0.7;
        if (rng() < 0.78) {
          our.push(-m1);
          if (taker) { res.goals++; events.push({ m: m1, t: 'goal', pen: true }); }
        } else if (taker) { res.pm = 1; events.push({ m: m1, t: 'pen_miss' }); }
      }
      // ضربة جزاء تسبب فيها
      if (rng() < 0.035 * POS_PC[pos] * frac) {
        var m2 = clamp(a + 1 + Math.floor(rng() * (b - a)), 1, 90);
        res.pc = 1;
        events.push({ m: m2, t: 'pc' });
        if (rng() < 0.78) oppG.push(m2);
      }
      // كروت
      var redMin = 0;
      if (rng() < 0.011 * (b - a) / 90 * (1 + (POS_YC[pos] > 0.1 ? 0.5 : 0))) {
        redMin = clamp(a + 1 + Math.floor(rng() * (b - a)), 1, 90);
        res.red = 1; events.push({ m: redMin, t: 'red' });
        res.b = b = redMin;
      } else if (rng() < POS_YC[pos] * (b - a) / 90) {
        res.yellow = 1; events.push({ m: clamp(a + 1 + Math.floor(rng() * (b - a)), 1, 90), t: 'yellow' });
      }
      // الأهداف العادية: مين سجل ومين صنع
      var lgMult = 1 - 0.05 * diffLg;
      var oppAdj = clamp(1 - (oppStr - p.ovr) * 0.004, 0.85, 1.12);
      var gShare = clamp(POS_G[pos] * (0.55 + (p.ovr - 60) * 0.022) * lgMult * oppAdj, 0, 0.6);
      var aShare = clamp(POS_A[pos] * (0.5 + (p.ovr - 60) * 0.03) * lgMult * oppAdj, 0, 0.22);
      our.forEach(function (m) {
        if (m <= 0) return;
        if (m >= a && m <= b) {
          if (rng() < gShare) { res.goals++; events.push({ m: m, t: 'goal' }); res.ourEvents.push({ m: m, mine: true }); }
          else if (rng() < aShare / Math.max(0.3, 1 - gShare)) { res.assists++; events.push({ m: m, t: 'assist' }); }
        }
      });
    }

    if (dec.role === 'start' && b < 90 && !res.red) events.push({ m: b, t: 'off' });
    if (dec.role === 'sub') events.push({ m: a, t: 'on' });

    // أهداف الفريق والخصم للتسلسل الزمني
    var mine = {};
    events.forEach(function (e) { if (e.t === 'goal') mine[e.m] = true; });
    our.forEach(function (m) { var mm = Math.abs(m); if (!mine[mm]) events.push({ m: mm, t: 'tg' }); });
    oppG.forEach(function (m) { events.push({ m: m, t: 'og' }); });
    var ours = our.length, theirs = oppG.length;
    var minutes = (res.b - res.a);
    res.minutes = Math.max(0, minutes);
    res.ourGoals = ours; res.oppGoals = theirs;
    res.hg = isHome ? ours : theirs; res.ag = isHome ? theirs : ours;

    // التقييم من 5
    if (inPlay) {
      var win = ours > theirs, loss = ours < theirs;
      var r = 3.1;
      if (res.goals) r += 0.6 + 0.4 * Math.min(res.goals - 1, 2);
      r += Math.min(res.assists, 2) * 0.4;
      r += win ? 0.3 : loss ? -0.3 : 0;
      if (theirs === 0) r += pos === 'GK' ? 0.8 : pos === 'DF' ? 0.5 : pos === 'MF' ? 0.15 : 0;
      else if (pos === 'GK' || pos === 'DF') r -= 0.15 * Math.max(0, theirs - 1);
      r -= res.yellow * 0.1 + res.red * 1.0;
      r += res.pw * 0.3 - res.pc * 0.4 - res.pm * 0.5;
      r += clamp((p.ovr - oppStr) / 80, -0.4, 0.4);
      r -= 0.06 * diffLg;
      r += gauss(rng) * 0.22;
      if (res.minutes < 20) r = 3 + (r - 3) * 0.5;
      res.rating = round1(clamp(r, 1, 5));
    } else res.rating = null;

    events.sort(function (x, y) { return x.m - y.m; });
    return res;
  }

  /* ====== الجولة ====== */
  function playRound(state, rng) {
    if (euroDue(state)) return playEuro(state, rng);
    var r = state.round, report = { round: r + 1, my: null, others: 0 };
    var myRounds = rounds(state.league);
    Object.keys(state.world.leagues).forEach(function (lk) {
      var L = state.world.leagues[lk];
      if (r >= L.fixtures.length) return;
      var out = [];
      L.fixtures[r].forEach(function (m, i) {
        if (lk === state.league && (m[0] === state.clubId || m[1] === state.clubId)) {
          var pm = playerMatch(state, m[0], m[1], rng);
          out[i] = [pm.hg, pm.ag];
          report.my = pm; pm.home = m[0]; pm.away = m[1]; pm.round = r + 1;
          recordMatch(state, pm);
        } else out[i] = quickMatch(state, m[0], m[1], rng);
      });
      L.results[r] = out;
    });
    state.round = r + 1;
    if (state.round >= myRounds) finishOthers(state, rng);
    return report;
  }

  function finishOthers(state, rng) {
    var maxR = 0;
    Object.keys(state.world.leagues).forEach(function (lk) { maxR = Math.max(maxR, state.world.leagues[lk].fixtures.length); });
    Object.keys(state.world.leagues).forEach(function (lk) {
      var L = state.world.leagues[lk];
      for (var r = L.results.length; r < L.fixtures.length; r++) {
        L.results[r] = L.fixtures[r].map(function (m) { return quickMatch(state, m[0], m[1], rng); });
      }
    });
    state.seasonOver = true;
  }

  function recordMatch(state, pm) {
    var s = state.stats;
    pm.yr = state.year;
    pm.fm = [formationFor(pm.home, state.year + '|' + pm.round + (pm.comp || '')), formationFor(pm.away, state.year + '|' + pm.round + (pm.comp || ''))];
    state.log.push({ comp: pm.comp || null, stage: pm.stage || null, pens: pm.pens || null, yr: pm.yr, fm: pm.fm, round: pm.round, home: pm.home, away: pm.away, hg: pm.hg, ag: pm.ag, role: pm.role, minutes: pm.minutes,
      goals: pm.goals, assists: pm.assists, rating: pm.rating, y: pm.yellow, r: pm.red, pw: pm.pw, pc: pm.pc, pm: pm.pm, a: pm.a, b: pm.b, events: pm.events });
    if (pm.role === 'start' || pm.role === 'sub') {
      s.apps++; if (pm.role === 'start') s.starts++;
      s.goals += pm.goals; s.assists += pm.assists; s.minutes += pm.minutes;
      s.yellow += pm.yellow; s.red += pm.red;
      s.ratingSum += pm.rating; s.rated++;
      state.form = (state.form || []).concat([pm.rating]).slice(-5);
    }
  }

  /* ====== أسماء وتشكيلات (لاعبين تقريبيين من غير أسماء حقيقية) ====== */
  function hash(str) { var h = 2166136261; str = String(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  var FIRST_EU = ['ماركوس', 'دانيال', 'ليو', 'ماتيو', 'لوكاس', 'جايدن', 'رايان', 'إيثان', 'ناثان', 'كارلوس', 'دييجو', 'سيرجيو', 'أليكس', 'بابلو', 'ياكوب', 'أندريه', 'فيليب', 'ستيفان', 'توماس', 'جوليان', 'ماكس', 'ريكاردو', 'ماريو', 'إيفان', 'دومينيك'];
  var LAST_EU = ['مارتينيز', 'سميث', 'جونز', 'بيريز', 'روسي', 'مولر', 'فيرنانديز', 'كلارك', 'هاريس', 'ديفيز', 'جارسيا', 'لوبيز', 'بيكر', 'كوستا', 'ريد', 'سانشيز', 'وايت', 'أوليفر', 'براون', 'دياز', 'فيشر', 'هيرنانديز', 'نوفاك', 'بيترسن', 'ستون', 'رودريجيز', 'موريس', 'كارتر', 'ويلسون', 'باتيستا'];
  var FIRST_EG = ['محمد', 'أحمد', 'محمود', 'مصطفى', 'عمر', 'كريم', 'إبراهيم', 'حسام', 'طارق', 'ياسر', 'وليد', 'عمرو', 'رامي', 'هاني', 'شريف', 'ماجد', 'سعيد', 'زياد', 'مروان', 'علي'];
  var LAST_EG = ['السيد', 'حسن', 'عبدالله', 'فتحي', 'جمال', 'سلامة', 'رمضان', 'عثمان', 'منصور', 'عاشور', 'سعد', 'خليل', 'نبيل', 'فاروق', 'صلاح', 'حجازي', 'بدر', 'الشرقاوي', 'عطية', 'مختار'];
  function isEgy(state, clubId) { var c = state.clubs[clubId]; return !!c && (c.league === 'egy1' || c.league === 'egy_pool'); }
  function nameFor(state, clubId, seed) {
    var r = mulberry(hash(clubId + '|' + seed)), eg = isEgy(state, clubId);
    var f = eg ? FIRST_EG : FIRST_EU, l = eg ? LAST_EG : LAST_EU;
    return f[Math.floor(r() * f.length)] + ' ' + l[Math.floor(r() * l.length)];
  }
  var FORMATIONS = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2', '4-1-4-1', '3-4-3', '5-3-2'];
  function formationFor(clubId, key) { return FORMATIONS[hash(clubId + '|' + key) % FORMATIONS.length]; }

  function slotFor(pos, spec, name) {
    var h = hash(name), last = spec.length - 1;
    if (pos === 'DF') return [0, h % spec[0]];
    if (pos === 'MF') { var ri = spec.length >= 4 ? 1 : Math.floor(spec.length / 2); if (ri === 0) ri = 1; return [Math.min(ri, last), h % spec[Math.min(ri, last)]]; }
    if (pos === 'WG') {
      if (spec[last] >= 3) return [last, h % 2 ? 0 : spec[last] - 1];
      var rr = Math.max(1, last - 1); return [rr, h % 2 ? 0 : spec[rr] - 1];
    }
    return [last, Math.floor((spec[last] - 1) / 2)];
  }

  /* تشكيلتين المباراة. entry = عنصر من state.log */
  function matchLineups(state, entry) {
    var yr = entry.yr || state.year, me = state.clubId, p = state.player;
    function side(cid, fmStr) {
      var spec = fmStr.split('-').map(Number);
      var gk = { n: nameFor(state, cid, yr + '|gk'), me: false };
      var rows = spec.map(function (n, i) { var a = []; for (var j = 0; j < n; j++) a.push({ n: nameFor(state, cid, yr + '|' + i + '_' + j), me: false }); return a; });
      var info = { id: cid, fm: fmStr, gk: gk, rows: rows, note: '' };
      if (cid === me) {
        if (entry.role === 'start') {
          if (p.pos === 'GK') { gk.n = p.name; gk.me = true; }
          else { var s = slotFor(p.pos, spec, p.name); rows[s[0]][s[1]] = { n: p.name, me: true }; }
          var red = entry.r || entry.red;
          if (entry.b < 90 && !red) info.note = 'اتبدلت في الدقيقة ' + entry.b;
          else if (red) info.note = 'اتطردت في الدقيقة ' + entry.b;
        } else if (entry.role === 'sub') info.note = p.name + ' نزل بديل في الدقيقة ' + entry.a;
        else if (entry.role === 'bench') info.note = p.name + ' على الدكة';
        else info.note = p.name + ' خارج القايمة';
      }
      return info;
    }
    var fm = entry.fm || [formationFor(entry.home, yr + '|' + entry.round), formationFor(entry.away, yr + '|' + entry.round)];
    return { home: side(entry.home, fm[0]), away: side(entry.away, fm[1]) };
  }

  /* ====== دوري أبطال أوروبا ====== */
  var LP_AFTER = [4, 8, 12, 16, 20, 24, 28, 31];
  var KO_AFTER = { qual: 0, playoff: 33, r16: 34, qf: 35, sf: 36, final: 37 };
  var STAGE_AR = { qual: 'تصفيات دوري الأبطال', league: 'مرحلة الدوري', playoff: 'ملحق الأدوار الإقصائية', r16: 'دور الـ16', qf: 'ربع النهائي', sf: 'نصف النهائي', final: 'النهائي' };
  var NEXT_STAGE = { playoff: 'r16', r16: 'qf', qf: 'sf', sf: 'final' };

  function euroOthers(state, rng) {
    var cand = Object.keys(state.clubs).filter(function (id) {
      var c = state.clubs[id];
      return id !== state.clubId && (c.league === 'euro' || ((c.league === 'eng1' || c.league === 'esp1') && c.str >= 74));
    }).sort(function (a, b) { return state.clubs[b].str - state.clubs[a].str; });
    return cand.slice(0, 35);
  }
  function coin(state, a, b, rng) { return rng() < clamp(0.5 + (state.clubs[a].str - state.clubs[b].str) / 90, 0.2, 0.8); }

  function startEuro(state, kind, rng) {
    var e = { kind: kind, phase: kind === 'qual' ? 'qual' : 'league', status: 'active', history: [], lp: null, rank: null, lpTable: null, alive: null, next: null, result: null };
    state.euro = e;
    if (kind === 'qual') {
      var weak = Object.keys(state.clubs).filter(function (id) { var c = state.clubs[id]; return c.league === 'euro' && c.str >= 66 && c.str <= 76; });
      e.qualOpp = pick(weak, rng); e.qualHome = rng() < 0.5;
    } else initLP(state, rng);
    setNext(state);
    return e;
  }

  function initLP(state, rng) {
    var e = state.euro, others = euroOthers(state, rng);
    e.others = others;
    var pots = [others.slice(0, 9), others.slice(9, 18), others.slice(18, 27), others.slice(27)];
    var opps = [];
    pots.forEach(function (pt) { shuffle(pt, rng).slice(0, 2).forEach(function (id) { opps.push(id); }); });
    opps = shuffle(opps, rng);
    var homes = shuffle([true, true, true, true, false, false, false, false], rng);
    e.lp = { opps: opps.map(function (id, i) { return { id: id, home: homes[i] }; }), played: 0, pts: 0, gf: 0, ga: 0 };
  }

  function setNext(state) {
    var e = state.euro;
    if (!e || e.status !== 'active') { if (e) e.next = null; return; }
    if (e.phase === 'qual') e.next = { after: 0, stage: 'qual', opp: e.qualOpp, home: e.qualHome };
    else if (e.phase === 'league') { var o = e.lp.opps[e.lp.played]; e.next = { after: LP_AFTER[e.lp.played], stage: 'league', opp: o.id, home: o.home, md: e.lp.played + 1 }; }
    else e.next = { after: KO_AFTER[e.phase], stage: e.phase, opp: e.ko.opp, home: e.phase === 'final' ? false : e.ko.home };
  }

  function euroDue(state) { var e = state.euro; return !!(e && e.status === 'active' && e.next && state.round >= e.next.after); }

  function eliminate(state, text) {
    var e = state.euro; e.status = 'out'; e.next = null; e.result = text;
  }

  function finishLP(state, rng) {
    var e = state.euro, lp = e.lp;
    var ents = e.others.map(function (id) {
      var c = state.clubs[id], pts = clamp(Math.round(8 * (1.3 + (c.str - 78) * 0.045) + gauss(rng) * 2.1), 0, 24), gd = Math.round(gauss(rng) * 3 + (c.str - 78) * 0.3);
      return { id: id, pts: pts, gd: gd, k: pts + gd / 100 + rng() / 1000 };
    });
    ents.push({ id: state.clubId, me: true, pts: lp.pts, gd: lp.gf - lp.ga, k: lp.pts + (lp.gf - lp.ga) / 100 + rng() / 1000 });
    ents.sort(function (a, b) { return b.k - a.k; });
    var rank = ents.findIndex(function (x) { return x.me; }) + 1;
    e.rank = rank;
    e.lpTable = ents.map(function (x) { return { id: x.id, pts: x.pts, gd: x.gd, me: !!x.me }; });
    if (rank > 24) { eliminate(state, 'خرجت من مرحلة الدوري (المركز ' + rank + ' من 36)'); return; }
    var top8 = ents.slice(0, 8), winners = [], pairs = [];
    for (var i = 0; i < 8; i++) pairs.push([ents[8 + i], ents[23 - i]]);
    var meIdx = -1;
    pairs.forEach(function (pr, i) {
      if (pr[0].me || pr[1].me) { meIdx = i; return; }
      winners.push(coin(state, pr[0].id, pr[1].id, rng) ? pr[0].id : pr[1].id);
    });
    var pairsAll = pairs;
    if (rank <= 8) {
      var others16 = top8.filter(function (x) { return !x.me; }).map(function (x) { return x.id; }).concat(winners);
      e.phase = 'r16'; e.alive = others16;
      e.ko = { opp: pick(winners, rng), home: false };
    } else {
      e.phase = 'playoff';
      var pr = pairs[meIdx], partner = pr[0].me ? pr[1] : pr[0];
      e.poWinners = winners;              // الفايزين التانيين في الملحق
      e.ko = { opp: partner.id, home: pr[0].me ? false : true };
      e.top8 = top8.map(function (x) { return x.id; });
    }
  }

  function koResolve(state, oppId, rng) {
    var e = state.euro, rest = shuffle(e.alive.filter(function (id) { return id !== oppId; }), rng), surv = [];
    for (var i = 0; i + 1 < rest.length; i += 2) surv.push(coin(state, rest[i], rest[i + 1], rng) ? rest[i] : rest[i + 1]);
    if (rest.length % 2) surv.push(rest[rest.length - 1]);
    return surv;
  }
  function champOf(state, ids, rng) {
    ids = ids.slice();
    while (ids.length > 1) { ids = shuffle(ids, rng); var n = []; for (var i = 0; i + 1 < ids.length; i += 2) n.push(coin(state, ids[i], ids[i + 1], rng) ? ids[i] : ids[i + 1]); if (ids.length % 2) n.push(ids[ids.length - 1]); ids = n; }
    return ids[0];
  }

  function advanceEuro(state, nx, won, rng) {
    var e = state.euro, st = nx.stage;
    if (st === 'qual') {
      if (won) { e.phase = 'league'; initLP(state, rng); }
      else eliminate(state, 'خسرت في التصفيات وراح ناديك للدوري الأوروبي');
    } else if (st === 'league') {
      e.phase = 'league';
      if (e.lp.played >= 8) finishLP(state, rng);
    } else {
      if (st === 'playoff') {
        if (won) {
          e.alive = e.top8.concat(e.poWinners);
          e.phase = 'r16'; e.ko = { opp: pick(e.top8, rng), home: false };
        } else eliminate(state, 'خسرت في ملحق الأدوار الإقصائية');
      } else if (won) {
        if (st === 'final') { e.status = 'champ'; e.next = null; e.result = 'بطل دوري أبطال أوروبا!'; e.phase = 'done'; }
        else {
          var surv = koResolve(state, nx.opp, rng);
          e.alive = surv; e.phase = NEXT_STAGE[st];
          e.ko = { opp: pick(surv, rng), home: rng() < 0.5 };
          if (e.phase === 'final') e.ko.home = false;
        }
      } else {
        var txt = st === 'final' ? 'خسرت نهائي دوري الأبطال' : 'خرجت من ' + STAGE_AR[st];
        if (st !== 'final') { var surv2 = koResolve(state, nx.opp, rng); e.champ = champOf(state, surv2.concat([nx.opp]), rng); }
        else e.champ = nx.opp;
        eliminate(state, txt);
      }
    }
    setNext(state);
  }

  function playEuro(state, rng) {
    var e = state.euro, nx = e.next, me = state.clubId, knock = nx.stage !== 'league';
    var home = nx.home ? me : nx.opp, away = nx.home ? nx.opp : me;
    var pm = playerMatch(state, home, away, rng, { diff: 3 });
    pm.home = home; pm.away = away; pm.round = state.round; pm.comp = 'cl'; pm.stage = nx.stage; pm.md = nx.md || null;
    var ours = nx.home ? pm.hg : pm.ag, theirs = nx.home ? pm.ag : pm.hg, won = ours > theirs;
    if (knock && ours === theirs) {
      won = rng() < clamp(0.5 + (state.clubs[me].str - state.clubs[nx.opp].str) / 200, 0.3, 0.7);
      pm.pens = won ? [5, 4] : [4, 5];
    }
    recordMatch(state, pm);
    e.history.push({ stage: nx.stage, md: nx.md || null, home: home, away: away, hg: pm.hg, ag: pm.ag, pens: pm.pens || null, won: won });
    if (nx.stage === 'league') { e.lp.played++; e.lp.gf += ours; e.lp.ga += theirs; e.lp.pts += ours > theirs ? 3 : ours === theirs ? 1 : 0; }
    advanceEuro(state, nx, knock ? won : null, rng);
    return { round: state.round, my: pm, others: 0, euro: true };
  }

  function euroReach(state) {
    var e = state.euro;
    if (!e) return null;
    return { kind: e.kind, status: e.status, text: e.result || (e.status === 'active' ? 'لسه شغال' : ''), stage: e.phase, rank: e.rank };
  }

  /* ====== الجوايز ====== */
  function computeAwards(state, rng, ctx) {
    var p = state.player, s = state.stats, lk = state.league, lgd = LG[lk], tab = ctx.tab, year = state.year;
    var out = {};
    // الكرة الذهبية
    var stars = Object.keys(state.clubs).filter(function (id) { var c = state.clubs[id]; return c.league === 'eng1' || c.league === 'esp1' || c.league === 'euro'; })
      .map(function (id) { return { id: id, score: state.clubs[id].str + 2.5 + gauss(rng) * 2.8 }; })
      .sort(function (a, b) { return b.score - a.score; })[0];
    var euroB = 0, ee = state.euro;
    if (ee) euroB = ee.status === 'champ' ? 4 : (ee.phase === 'final' || (ee.result || '').indexOf('نهائي') > -1) ? 3 : ee.phase === 'sf' ? 2 : ee.phase === 'qf' ? 1.5 : ee.phase === 'r16' ? 0.8 : 0;
    var myScore = s.apps >= 15 ? ctx.before + (ctx.avg - 3.4) * 5 + Math.min(s.goals + s.assists * 0.7, 45) * 0.1 + (ctx.champion ? 2 : 0) + euroB - (2 - lgd.diff) * 4.5 : -99;
    var sc = state.clubs[stars.id];
    if (myScore > stars.score) out.ballon = { name: p.name, clubId: state.clubId, mine: true, stat: s.goals + ' هدف • ' + s.assists + ' أسيست • تقييم ' + round1(ctx.avg) };
    else out.ballon = { name: nameFor(state, stars.id, year + '|star'), clubId: stars.id, mine: false,
      stat: clamp(Math.round((sc.str - 62) * 0.7 + 6 + rng() * 8), 8, 38) + ' هدف • ' + clamp(Math.round(4 + (sc.str - 70) * 0.3 + rng() * 7), 2, 20) + ' أسيست' };

    // الحذاء الذهبي (في دوري اللاعب)
    var best = null;
    tab.forEach(function (r) {
      var c = state.clubs[r.id];
      if (r.id === state.clubId) return;
      var g = Math.round(r.gf * (0.2 + 0.08 * (c.str - 55) / 35 + rng() * 0.12));
      if (!best || g > best.g) best = { id: r.id, g: g };
    });
    if (best && s.goals > 0 && s.goals >= best.g) out.boot = { name: p.name, clubId: state.clubId, mine: true, stat: s.goals + ' هدف' };
    else out.boot = { name: nameFor(state, best.id, year + '|boot'), clubId: best.id, mine: false, stat: best.g + ' هدف' };

    // القفاز الذهبي (في دوري اللاعب)
    var cs = {}, L = state.world.leagues[lk];
    L.teams.forEach(function (id) { cs[id] = 0; });
    L.results.forEach(function (rd, r) { rd.forEach(function (res, i) { if (!res) return; var m = L.fixtures[r][i]; if (res[1] === 0) cs[m[0]]++; if (res[0] === 0) cs[m[1]]++; }); });
    var bg = null;
    Object.keys(cs).forEach(function (id) { if (id === state.clubId) return; var v = cs[id] + (rng() < 0.3 ? -1 : 0); if (!bg || v > bg.v) bg = { id: id, v: Math.max(0, v) }; });
    var myCs = 0;
    state.log.forEach(function (x) { if (x.comp) return; if ((x.role === 'start' || x.role === 'sub') && x.minutes >= 60) { var conc = x.home === state.clubId ? x.ag : x.hg; if (conc === 0) myCs++; } });
    if (p.pos === 'GK' && s.apps >= rounds(lk) * 0.5 && myCs >= bg.v) out.glove = { name: p.name, clubId: state.clubId, mine: true, stat: myCs + ' مباراة بدون أهداف' };
    else out.glove = { name: nameFor(state, bg.id, year + '|glove'), clubId: bg.id, mine: false, stat: bg.v + ' مباراة بدون أهداف' };
    return out;
  }

  /* ====== نهاية الموسم ====== */
  var AGE_BASE = { 18: 5, 19: 5, 20: 4, 21: 4, 22: 3, 23: 3, 24: 2, 25: 2, 26: 1, 27: 1, 28: 0, 29: 0, 30: -1, 31: -1, 32: -2, 33: -2 };
  function ageBase(age) { return age in AGE_BASE ? AGE_BASE[age] : (age < 18 ? 5 : -3); }

  function feeM(ovr, age) {
    var f = 0.55 * Math.exp((ovr - 50) / 7.6);
    var ageF = age <= 20 ? 1.3 : age <= 24 ? 1.15 : age <= 28 ? 1 : age <= 31 ? 0.7 : 0.4;
    f *= ageF;
    return f >= 20 ? Math.round(f) : Math.round(f * 10) / 10;
  }

  function makeOffers(state, avg, appsRate, rng) {
    var p = state.player, s = state.stats;
    var perfScore = (avg - 3) + (s.apps ? (s.goals + s.assists * 0.7) / s.apps * 0.8 : 0) + appsRate * 0.5;
    if (s.apps < 8 || avg < 2.9 || perfScore < 0.15) return { offers: [], reason: s.apps < 8 ? 'ماشتركتش كفاية في الموسم ده، فمفيش أندية انتبهتلك.' : 'أداءك الموسم ده مخلّاش أي نادي يعرض عليك.' };
    var n = clamp(Math.round(perfScore * 2.6 + gauss(rng) * 0.7), 0, 5);
    if (n === 0) return { offers: [], reason: 'مفيش عروض الموسم ده، اشتغل على مستواك وجرب تاني.' };
    var curStr = state.clubs[state.clubId].str;
    var elig = Object.keys(state.clubs).filter(function (id) {
      var c = state.clubs[id];
      if (id === state.clubId) return false;
      if (['eng1', 'eng2', 'esp1', 'esp2', 'egy1'].indexOf(c.league) < 0) return false;
      return c.str <= p.ovr + 3 && c.str >= p.ovr - 14 && c.str >= curStr - 6;
    });
    // فرص أكبر للأندية الأقوى شوية من مستواه
    var picked = [], pool = elig.slice();
    while (picked.length < n && pool.length) {
      var weights = pool.map(function (id) { return 1 + Math.max(0, state.clubs[id].str - (p.ovr - 14)) / 6; });
      var tot = 0; weights.forEach(function (w) { tot += w; });
      var x = rng() * tot, k = 0;
      while (k < weights.length - 1 && x > weights[k]) { x -= weights[k]; k++; }
      picked.push(pool[k]); pool.splice(k, 1);
    }
    var base = feeM(p.ovr, p.age);
    var offers = picked.map(function (id) {
      var c = state.clubs[id], country = LG[c.league].country;
      var mult = 0.85 + rng() * 0.35;
      var fee = base * mult * (country === 'esp' ? 1.15 : country === 'egy' ? 0.5 : 1);
      fee = fee >= 20 ? Math.round(fee) : Math.round(fee * 10) / 10;
      return { clubId: id, league: c.league, fee: fee, cur: D.COUNTRIES[country].cur };
    }).sort(function (x, y) { return state.clubs[y.clubId].str - state.clubs[x.clubId].str; });
    return { offers: offers, reason: offers.length ? '' : 'مفيش عروض الموسم ده.' };
  }

  function applyPromotions(state, rng) {
    var world = state.world, keys = D.COUNTRIES[world.country].leagues, moves = {};
    var tabs = {};
    keys.forEach(function (lk) { tabs[lk] = table(state, lk).map(function (r) { return r.id; }); });
    for (var i = 0; i < keys.length - 1; i++) {
      var up = keys[i], low = keys[i + 1];
      var down = tabs[up].slice(-3), promo = tabs[low].slice(0, 3);
      down.forEach(function (id) { state.clubs[id].league = low; state.clubs[id].str = clamp(state.clubs[id].str - 1, 40, 95); moves[id] = 'down'; });
      promo.forEach(function (id) { state.clubs[id].league = up; state.clubs[id].str = clamp(state.clubs[id].str + 1.5, 40, 95); moves[id] = 'up'; });
    }
    // أسفل الهرم: 3 يهبطوا لبرة والمكان ياخده من البول
    var bottom = keys[keys.length - 1];
    var out = tabs[bottom].slice(-3);
    var pool = Object.keys(state.clubs).filter(function (id) { return state.clubs[id].league === world.country + '_pool'; });
    out.forEach(function (id) {
      state.clubs[id].league = world.country + '_pool'; moves[id] = 'down';
      var inc = pool.length ? pool.splice(Math.floor(rng() * pool.length), 1)[0] : null;
      if (inc) { state.clubs[inc].league = bottom; moves[inc] = 'up'; }
    });
    return { moves: moves, tabs: tabs };
  }

  function driftStrengths(state, rng) {
    Object.keys(state.clubs).forEach(function (id) {
      var c = state.clubs[id], tierMean = D.MEANS[c.league] || (c.league === 'euro' ? 76 : 60);
      c.str = clamp(c.str + gauss(rng) * 1.3 + (tierMean - c.str) * 0.04, 40, 95);
      c.str = Math.round(c.str * 10) / 10;
    });
  }

  function finishSeason(state, rng) {
    if (!state.seasonOver) finishOthers(state, rng);
    var p = state.player, s = state.stats, lk = state.league;
    var tab = table(state, lk);
    var pos = tab.findIndex(function (r) { return r.id === state.clubId; }) + 1;
    var avg = s.rated ? s.ratingSum / s.rated : 0;
    var myRounds = rounds(lk);
    var appsRate = clamp(s.minutes / (myRounds * 90) * 1.6, 0, 1);
    var before = p.ovr;
    var perf = (avg - 3) * 1.6;
    var g = ageBase(p.age) * (0.5 + 0.5 * appsRate) + (s.rated ? perf * appsRate * (p.age < 29 ? 1 : 0.4) : 0);
    p.ovr = Math.round(clamp(p.ovr + g, 40, 99) * 10) / 10;
    p.age++;

    var champion = tab[0].id === state.clubId;
    if (state.euro && state.euro.status === 'active') eliminate(state, 'الموسم خلص قبل ما تكمل');
    var awards = computeAwards(state, rng, { tab: tab, before: before, avg: avg, champion: champion });
    var qmap = {};
    if (LG[lk].tier === 1 && (LG[lk].country === 'eng' || LG[lk].country === 'esp')) tab.slice(0, 4).forEach(function (r, i) { qmap[r.id] = i < 3 ? 'cl' : 'qual'; });
    state.euroQual = qmap;
    var pts = Math.round(s.goals * 2 + s.assists + Math.max(0, avg - 3) * 10) + (awards.ballon.mine ? 60 : 0) + (awards.boot.mine ? 30 : 0) + (awards.glove.mine ? 30 : 0);
    var summary = {
      year: state.year, league: lk, clubId: state.clubId, pos: pos, teams: tab.length,
      apps: s.apps, starts: s.starts, goals: s.goals, assists: s.assists, yellow: s.yellow, red: s.red,
      euro: euroReach(state), champion0: champion, avg: round1(avg), ovrBefore: Math.round(before * 10) / 10, ovrAfter: p.ovr, age: p.age, points: pts, champion: champion
    };
    var offerInfo = makeOffers(state, avg, appsRate, rng);
    var promo = applyPromotions(state, rng);
    var mv = promo.moves[state.clubId];
    summary.moved = mv || null;
    summary.clubLeagueNext = state.clubs[state.clubId].league;
    state.history = (state.history || []).concat([summary]);
    state.totals = state.totals || { apps: 0, goals: 0, assists: 0 };
    state.totals.apps += s.apps; state.totals.goals += s.goals; state.totals.assists += s.assists;
    driftStrengths(state, rng);

    state.honors = state.honors || [];
    if (champion) state.honors.push({ year: state.year, type: 'league', text: 'بطل ' + LG[lk].ar });
    if (state.euro && state.euro.status === 'champ') state.honors.push({ year: state.year, type: 'cl', text: 'بطل دوري أبطال أوروبا' });
    if (awards.ballon.mine) state.honors.push({ year: state.year, type: 'ballon', text: 'الكرة الذهبية' });
    if (awards.boot.mine) state.honors.push({ year: state.year, type: 'boot', text: 'الحذاء الذهبي (' + LG[lk].ar + ')' });
    if (awards.glove.mine) state.honors.push({ year: state.year, type: 'glove', text: 'القفاز الذهبي (' + LG[lk].ar + ')' });
    state.awards = awards;
    state.summary = summary;
    state.offers = offerInfo.offers;
    state.offersReason = offerInfo.reason;
    state.tabs = promo.tabs;
    state.afterAwards = p.age >= 38 ? 'retired' : 'offers';
    state.phase = 'awards';
    return summary;
  }

  function startNextSeason(state, rng) {
    state.year++;
    state.form = [];
    var lg = state.clubs[state.clubId].league;
    state.league = lg.indexOf('_pool') > -1 ? D.COUNTRIES[state.world.country].leagues.slice(-1)[0] : lg;
    var country = LG[state.league].country;
    buildWorld(state, country, rng);
    state.phase = 'play'; state.offers = null; state.summary = null; state.awards = null; state.euro = null;
    initClubs(state);
    var q = state.euroQual && state.euroQual[state.clubId];
    if (q && LG[state.league].tier === 1) startEuro(state, q, rng);
    state.euroQual = null;
  }

  function continueAfterAwards(state) { state.phase = state.afterAwards || 'offers'; }

  /* قبول عرض أو البقاء (offerIndex = -1) */
  function chooseOffer(state, idx, rng) {
    if (idx >= 0 && state.offers && state.offers[idx]) {
      var o = state.offers[idx];
      state.clubId = o.clubId;
      state.transfer = { fee: o.fee, cur: o.cur, to: o.clubId, year: state.year };
      state.transfers = (state.transfers || []).concat([state.transfer]);
    } else state.transfer = null;
    // لو ناديه هبط خارج الهرم (نادرًا) هنقله لأقرب نادي في الدرجة الأخيرة
    var cl = state.clubs[state.clubId];
    if (cl.league.indexOf('_pool') > -1) {
      var last = D.COUNTRIES[LG[state.league].country].leagues.slice(-1)[0];
      var cand = Object.keys(state.clubs).filter(function (id) { return state.clubs[id].league === last; });
      state.clubId = pick(cand, rng);
    }
    startNextSeason(state, rng);
  }

  function newCareer(opts, rng) {
    var st = { v: 1, year: 2026, phase: 'play', history: [], totals: { apps: 0, goals: 0, assists: 0 }, form: [] };
    st.player = { name: opts.name, nat: opts.nat, natCode: opts.natCode, pos: opts.pos, color: opts.color, age: 18, ovr: 60 };
    initClubs(st);
    st.league = opts.start;
    var country = LG[st.league].country;
    var cand = Object.keys(st.clubs).filter(function (id) { return st.clubs[id].league === st.league; })
      .sort(function (a, b) { return st.clubs[a].str - st.clubs[b].str; });
    st.clubId = pick(cand.slice(0, Math.ceil(cand.length * 0.7)), rng);
    buildWorld(st, country, rng);
    return st;
  }

  /* مركز الدوري في اللحظة دي */
  function myPosition(state) {
    var t = table(state, state.league);
    return t.findIndex(function (r) { return r.id === state.clubId; }) + 1;
  }

  /* مباريات ناديي (اللي اتلعبت واللي جاية) */
  function myFixtures(state) {
    var L = state.world.leagues[state.league], out = [];
    L.fixtures.forEach(function (rd, r) {
      rd.forEach(function (m, i) {
        if (m[0] === state.clubId || m[1] === state.clubId) {
          var res = L.results[r] ? L.results[r][i] : null;
          var lg = state.log.find(function (x) { return !x.comp && x.round === r + 1; });
          out.push({ round: r + 1, home: m[0], away: m[1], res: res || null, log: lg || null });
        }
      });
    });
    return out;
  }

  var API = { mulberry: mulberry, newCareer: newCareer, playRound: playRound, finishSeason: finishSeason, chooseOffer: chooseOffer,
    table: table, rounds: rounds, myPosition: myPosition, myFixtures: myFixtures, continueAfterAwards: continueAfterAwards, matchLineups: matchLineups, euroDue: euroDue, startEuro: startEuro, STAGE_AR: STAGE_AR, feeM: feeM, ageBase: ageBase, finishOthers: finishOthers };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.KoraCMEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
