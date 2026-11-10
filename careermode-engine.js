/* Kora Challenge — محرك محاكاة كارير مود (منطق بس، من غير واجهة) */
(function (root) {
  'use strict';

  var D = root.KoraCMData || ((typeof require !== 'undefined' && typeof module !== 'undefined') ? require('./careermode-data.js') : null);
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
    if (state.injury && state.injury.games > 0) return { role: 'out', a: 0, b: 0, pStart: 0, why: 'inj' };
    if (state.susp > 0) return { role: 'out', a: 0, b: 0, pStart: 0, why: 'susp' };
    var pStart = clamp(0.70 - (p.age <= 19 ? 0.1 : 0) + diff * 0.045 + avgForm(state) * 0.06 + (state.coach ? state.coach.favor * 0.1 : 0), 0.03, 0.97);
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

  /* ====== الديربي والمدرب والصحافة ====== */
  var DERBIES = [['liv','eve','ديربي ميرسيسايد'],['liv','mun','القمة الإنجليزية'],['mun','mci','ديربي مانشستر'],['ars','tot','ديربي شمال لندن'],['che','tot','ديربي لندن'],['che','ars','ديربي لندن'],
    ['rma','atm','ديربي مدريد'],['rma','fcb','الكلاسيكو'],['fcb','esp','ديربي كتالونيا'],['acm','int','ديربي ميلانو'],['rom','laz','ديربي العاصمة'],['juv','tor','ديربي تورينو'],['juv','int','ديربي إيطاليا'],
    ['ahl','zam','قمة الكرة المصرية'],['hil','nas','ديربي الرياض'],['e_dor','e_bay','دير كلاسيكر'],['e_ajx','e_fey','دي كلاسيكر'],['e_ben','e_por','كلاسيكو البرتغال'],['e_mar','e_psg','لو كلاسيك'],
    ['sev','bet','ديربي إشبيلية'],['new','sun','ديربي التاين وير'],['avl','bir','ديربي ميدلاندز']];
  function derbyOf(a, b) {
    for (var i = 0; i < DERBIES.length; i++) { var d = DERBIES[i]; if ((d[0] === a && d[1] === b) || (d[0] === b && d[1] === a)) return d[2]; }
    return null;
  }

  function newCoach(state, rng, why) {
    var favor = Math.round(clamp(gauss(rng) * 0.45, -1, 1) * 100) / 100;
    state.coach = { name: nameFor(state, state.clubId, 'coach' + state.year + (why || '') + Math.floor(rng() * 999)), favor: favor, year: state.year };
    return state.coach;
  }
  function coachNote(state) {
    var c = state.coach; if (!c) return '';
    return c.favor >= 0.35 ? 'بيثق فيك جدًا' : c.favor >= -0.2 ? 'رأيه فيك عادي' : 'مش مقتنع بيك';
  }
  function adjustFavor(state, d) { if (state.coach) state.coach.favor = Math.round(clamp(state.coach.favor + d, -1, 1) * 100) / 100; }

  // تغيير مدرب في نص الموسم (النادي بيتعثر)
  function maybeMidCoachChange(state, rng, pm) {
    if (state.round < 8 || state.round > rounds(state.league) - 6 || state.coachChangedYear === state.year) return;
    var pos = myPosition(state), n = table(state, state.league).length;
    if (pos < n - 3 || rng() > 0.05) return;
    var old = state.coach ? state.coach.name : 'المدرب';
    newCoach(state, rng, 'mid'); state.coachChangedYear = state.year;
    pm.news.push({ k: state.coach.favor >= 0 ? 'up' : 'down', x: 'النادي أقال ' + old + ' وجاب ' + state.coach.name + ' (' + coachNote(state) + ')' });
  }

  function makePress(state, pm, derby, rng) {
    if (pm.role !== 'start' && pm.role !== 'sub') return null;
    var r = pm.rating, q, o, ctx;
    if (pm.red) { ctx = 'red'; q = 'اتطردت وفريقك اتأثر، الصحافة منتظراك. هتقول إيه؟'; o = [['أعتذر للنادي والجماهير', 1, 0.12], ['الحكم ظلمني', 0, -0.15], ['مفيش تصريحات', 0, 0]]; }
    else if (derby && r >= 4) { ctx = 'derbyUp'; q = 'نجم ' + derby + '! الجماهير بتغنيلك. تعليقك؟'; o = [['كان ممتع ودي لحظة للجماهير', 3, 0.05], ['الكل اشتغل صح وأنا بس خلصت', 1, 0.12], ['ده جزء من شغلي', 0, 0]]; }
    else if (derby && r < 2.6) { ctx = 'derbyDown'; q = 'ديربي مخيب للأمال، الجماهير غاضبة منك. هترد إزاي؟'; o = [['أعتذر وهعوّضهم', 1, 0.1], ['الضغط كان كبير', 0, -0.05], ['أتجاهل الهجوم', -1, 0]]; }
    else if (r >= 4.2 || pm.goals >= 2) { ctx = 'good'; q = 'أداء رائع! الصحافة بتسألك عن سر مستواك.'; o = [['ده شغل الفريق كله', 1, 0.12], ['أنا جاهز أكون نجم الفريق', 3, -0.08], ['مفيش تعليق', 0, 0]]; }
    else if (r <= 2.3) { ctx = 'bad'; q = 'مستواك نازل والنقد زاد. بترد إزاي؟'; o = [['أعترف بغلطي وهشتغل', 0, 0.12], ['ألوم المدرب والتشكيل', 1, -0.25], ['أتجاهل', -1, 0]]; }
    else if (rng() < 0.1) { ctx = 'mate'; q = 'زميلك قال إنك محتاج تلعب جماعي أكتر. تعليقك؟'; o = [['كلامه صح وهتحسن', 0, 0.08], ['اللعب بيتحدد في الملعب بس', 1, -0.05], ['أحترم رأيه', 0, 0.03]]; }
    else return null;
    return { ctx: ctx, q: q, done: null, opts: o.map(function (x) { return { t: x[0], fame: x[1], favor: x[2] }; }) };
  }
  function answerPress(state, press, idx) {
    if (!press || press.done != null || !press.opts[idx]) return null;
    var o = press.opts[idx]; press.done = idx;
    state.pressFame = (state.pressFame || 0) + o.fame; adjustFavor(state, o.favor);
    return (o.fame > 0 ? 'الجماهير اتحمّست لتصريحك' : o.fame < 0 ? 'تصريحك أغضب الجماهير' : 'تصريحك عدّى هادي') + (o.favor > 0.05 ? ' والمدرب ارتاح لكلامك' : o.favor < -0.05 ? ' والمدرب مش مبسوط منك' : '');
  }

  /* إجابة حرة في المؤتمر الصحفي: بنحلل الكلام ونطبّق التأثير (شهرة، رأي المدرب، غرامة، إيقاف) */
  function answerFree(state, press, text, rng) {
    if (!press || press.done != null) return null;
    text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    if (!text) return null;
    var ai = root.KoraPressAI, c = state.contract, club = state.clubs[state.clubId];
    var res = ai ? ai.analyze(text, { ctx: press.ctx, coach: state.coach && state.coach.name, club: club && club.ar, salary: c ? c.salary : 0, rng: rng })
      : { fame: 0, favor: 0, fine: 0, susp: 0, tone: 'neutral', lines: [{ who: 'الصحافة', x: 'تصريحك عدّى هادي.', k: 'neutral' }] };
    state.pressFame = (state.pressFame || 0) + res.fame;
    adjustFavor(state, res.favor);
    var fine = Math.min(Math.round(res.fine || 0), Math.floor(state.money));
    if (fine > 0) state.money -= fine;
    if (res.susp) state.susp = (state.susp || 0) + res.susp;
    press.done = -1;
    press.free = { text: text, lines: res.lines, fame: res.fame, favor: res.favor, fine: fine, susp: res.susp || 0, tone: res.tone };
    return press.free;
  }

  function playerMatch(state, home, away, rng, opt) {
    var p = state.player, me = (opt && opt.me) || state.clubId, isHome = home === me;
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

    var res = { role: dec.role, why: dec.why || null, a: a, b: b, goals: 0, assists: 0, yellow: 0, red: 0, pw: 0, pc: 0, pm: 0, ourEvents: [], events: events };
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
    var ex = nextExtra(state);
    if (ex) return ex.kind === 'cup' ? playCup(state, ex.cup, rng) : playEuro(state, rng);
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
          recordMatch(state, pm, rng);
        } else out[i] = quickMatch(state, m[0], m[1], rng);
      });
      L.results[r] = out;
    });
    state.round = r + 1;
    if (state.contract) { var wk = state.contract.salary / myRounds; state.money += wk; state.earn.salary += wk; }
    if (state.round === Math.floor(myRounds / 2) && !state.callupChecked) { state.callupChecked = true; checkCallup(state, rng); }
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

  var INJ = [
    { max: 0.55, names: ['شد عضلي بسيط', 'إجهاد في الفخذ', 'ارتجاج خفيف'], g: [1, 2], loss: 0 },
    { max: 0.85, names: ['التواء في الكاحل', 'تمزق عضلي في السمانة', 'إصابة في الفخذ'], g: [3, 6], loss: 0 },
    { max: 0.97, names: ['إصابة في الركبة', 'تمزق في الرباط الجانبي', 'كسر في مشط القدم'], g: [8, 14], loss: 0.6 },
    { max: 1.01, names: ['قطع في الرباط الصليبي'], g: [20, 30], loss: 1.5 }
  ];
  function recordMatch(state, pm, rng) {
    rng = rng || Math.random;
    var s = state.stats, pl = state.player, played = pm.role === 'start' || pm.role === 'sub';
    s.injuries = s.injuries || 0; s.missed = s.missed || 0;
    var fat = state.fatigue || 0; pm.news = [];
    if (played && pm.rating != null && fat > 75) pm.rating = round1(clamp(pm.rating - (fat - 75) / 25 * 0.4, 1.5, 5));
    if (pm.role === 'out' && pm.why === 'inj' && state.injury) {
      s.missed++; state.injury.games--; fat -= 20;
      if (state.injury.games <= 0) { pl.ovr = Math.max(40, Math.round((pl.ovr - state.injury.loss) * 10) / 10); state.injury = null; state.injCool = 6; pm.news.push({ k: 'up', x: 'رجعت من الإصابة وجاهز للعب' }); }
    } else if (pm.role === 'out' && pm.why === 'susp') { s.missed++; state.susp--; fat -= 10; }
    else if (!played) fat -= 14;
    if (played) {
      fat += (pm.role === 'start' && pm.minutes >= 60) ? 9 : 3;
      var yPrev = s.yellow || 0;
      if (pm.red) { var sg = 1 + (pm.round % 3); state.susp = (state.susp || 0) + sg; pm.news.push({ k: 'down', x: 'كرت أحمر: إيقاف ' + sg + (sg === 1 ? ' مباراة' : ' مباريات') }); }
      else if (pm.yellow && Math.floor((yPrev + pm.yellow) / 5) > Math.floor(yPrev / 5)) { state.susp = (state.susp || 0) + 1; pm.news.push({ k: 'down', x: 'إيقاف مباراة بسبب تراكم الكروت الصفراء' }); }
      if (!state.injury && !(state.injCool > 0)) {
        var pI = 0.012 * (1 + Math.max(0, pl.age - 29) * 0.06) * (1 + Math.max(0, fat - 60) / 60) * (pm.minutes / 90);
        if (rng() < pI) {
          var r = rng(), t = INJ.filter(function (z) { return r < z.max; })[0], g = t.g[0] + Math.floor(rng() * (t.g[1] - t.g[0] + 1));
          state.injury = { n: pick(t.names, rng), games: g, total: g, loss: t.loss };
          s.injuries++; fat += 10; pm.injury = state.injury;
          pm.news.push({ k: 'down', x: 'اتصبت: ' + state.injury.n + ' • هتغيب ' + g + (g === 1 ? ' مباراة' : ' مباريات') });
        }
      }
    }
    if (state.injCool > 0 && !pm.injury) state.injCool--;
    state.fatigue = clamp(Math.round(fat), 0, 100);
    var derby = !pm.comp ? derbyOf(pm.home, pm.away) : null;
    if (played && derby) {
      pm.derby = derby;
      if (pm.rating != null) pm.rating = round1(clamp(3 + (pm.rating - 3) * 1.25, 1, 5));
      pm.news.push({ k: 'up', x: derby + ': مباراة بحماس خاص ومكافآتها مضاعفة 50%' });
    }
    if (played && pm.rating != null) {
      adjustFavor(state, pm.rating >= 4 ? 0.04 : pm.rating <= 2.5 ? -0.05 : 0);
      pm.press = makePress(state, pm, derby, rng);
    }
    if (!pm.comp) maybeMidCoachChange(state, rng, pm);
    payBonus(state, pm);
    if (pm.derby && pm.bonus) { var extra = pm.bonus * 0.5; pm.bonus += extra; state.money += extra; state.earn.bonus += extra; }
    pm.yr = state.year;
    pm.fm = [formationFor(pm.home, state.year + '|' + pm.round + (pm.comp || '')), formationFor(pm.away, state.year + '|' + pm.round + (pm.comp || ''))];
    state.log.push({ derby: pm.derby || null, press: pm.press || null, why: pm.why || null, news: pm.news, comp: pm.comp || null, stage: pm.stage || null, st: pm.stageText || null, cn: pm.cupName || null, bonus: pm.bonus || 0, motm: !!pm.motm, pens: pm.pens || null, yr: pm.yr, fm: pm.fm, round: pm.round, home: pm.home, away: pm.away, hg: pm.hg, ag: pm.ag, role: pm.role, minutes: pm.minutes,
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
  var FIRST_IT = ['ماركو', 'لورينزو', 'ألساندرو', 'فيديريكو', 'ماتيا', 'نيكولو', 'جيوفاني', 'فرانشيسكو', 'ستيفانو', 'دافيدي', 'سيمون', 'أندريا', 'روبرتو', 'جاكومو'];
  var LAST_IT = ['روسي', 'روميرو', 'بيانكي', 'كونتي', 'فيراري', 'ماريني', 'كوستا', 'جالو', 'ريتشي', 'بروني', 'موريلي', 'ديلوكا', 'فونتانا', 'سانتوروا', 'ليوني'];
  var FIRST_SA = ['عبدالله', 'سالم', 'فهد', 'ناصر', 'تركي', 'خالد', 'سلطان', 'محمد', 'عبدالعزيز', 'ياسر', 'سعود', 'ماجد', 'بدر', 'فيصل'];
  var LAST_SA = ['الدوسري', 'الشهراني', 'القحطاني', 'العتيبي', 'الغامدي', 'الزهراني', 'المالكي', 'الحربي', 'الشمراني', 'العنزي', 'السبيعي', 'البكري', 'الجهني', 'العمري'];
  function styleOf(state, clubId) {
    var c = state.clubs[clubId], lg = c ? String(c.league) : '';
    if (lg.indexOf('egy') === 0) return 'eg';
    if (lg.indexOf('ita') === 0) return 'it';
    if (lg.indexOf('sau') === 0) return 'sa';
    return 'eu';
  }
  function nameFor(state, clubId, seed) {
    var r = mulberry(hash(clubId + '|' + seed)), st = styleOf(state, clubId);
    var f = st === 'eg' ? FIRST_EG : st === 'it' ? FIRST_IT : st === 'sa' ? FIRST_SA : FIRST_EU;
    var l = st === 'eg' ? LAST_EG : st === 'it' ? LAST_IT : st === 'sa' ? LAST_SA : LAST_EU;
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

  /* تشكيلتين المباراة. entry = عنصر من state.log (أسماء حقيقية لو متاحة) */
  function matchLineups(state, entry) {
    var yr = entry.yr || state.year, me = state.clubId, p = state.player, ntId = 'nt_' + p.natCode;
    function side(cid, fmStr) {
      var spec = fmStr.split('-').map(Number), sq = squadOf(state, cid), idx = { D: 0, M: 0, F: 0 }, last = spec.length - 1;
      var gk = { n: sq.G[0] ? sq.G[0].n : 'حارس مرمى', me: false };
      var rows = spec.map(function (n, i) {
        var key = i === 0 ? 'D' : i === last ? 'F' : 'M', a = [];
        for (var j = 0; j < n; j++) { var x = sq[key][idx[key]++]; a.push({ n: x ? x.n : POS_LBL[key], me: false }); }
        return a;
      });
      var info = { id: cid, fm: fmStr, gk: gk, rows: rows, note: '' };
      if (cid === me || cid === ntId) {
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
      return id !== state.clubId && D.UEFA.indexOf(c.league) > -1 && c.str >= 70;
    }).sort(function (a, b) { return state.clubs[b].str - state.clubs[a].str; });
    return cand.slice(0, 35);
  }
  function coin(state, a, b, rng) { return rng() < clamp(0.5 + (state.clubs[a].str - state.clubs[b].str) / 90, 0.2, 0.8); }

  function startEuro(state, kind, rng) {
    var e = { kind: kind, phase: kind === 'qual' ? 'qual' : 'league', status: 'active', history: [], lp: null, rank: null, lpTable: null, alive: null, next: null, result: null };
    state.euro = e;
    if (kind === 'qual') {
      var weak = Object.keys(state.clubs).filter(function (id) { var c = state.clubs[id]; return D.UEFA.indexOf(c.league) > -1 && c.league !== state.league && c.str >= 64 && c.str <= 74; });
      if (!weak.length) weak = Object.keys(state.clubs).filter(function (id) { return D.UEFA.indexOf(state.clubs[id].league) > -1 && id !== state.clubId; });
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

  function scl(state, x) { var R = rounds(state.league); return Math.min(Math.max(0, R - 1), Math.round(x * R / 38)); }
  function setNext(state) {
    var e = state.euro;
    if (!e || e.status !== 'active') { if (e) e.next = null; return; }
    if (e.phase === 'qual') e.next = { after: 0, stage: 'qual', opp: e.qualOpp, home: e.qualHome };
    else if (e.phase === 'league') { var o = e.lp.opps[e.lp.played]; e.next = { after: scl(state, LP_AFTER[e.lp.played]), stage: 'league', opp: o.id, home: o.home, md: e.lp.played + 1 }; }
    else e.next = { after: scl(state, KO_AFTER[e.phase]), stage: e.phase, opp: e.ko.opp, home: e.phase === 'final' ? false : e.ko.home };
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
    recordMatch(state, pm, rng);
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
  /* =====================================================================
     توسيع كارير مود: لاعيبة حقيقيين، محاكاة عالمية، كؤوس، فلوس وعقود، منتخبات وبطولات
     ===================================================================== */
  var POSMAP = { G: 'GK', D: 'DF', M: 'MF', F: 'ST' };
  var GW = { ST: 1.0, MF: 0.28, DF: 0.07, GK: 0 }, AW = { ST: 0.55, MF: 0.6, DF: 0.22, GK: 0.01 };
  var CUP_STAGE = { 64: 'دور الـ64', 32: 'دور الـ32', 16: 'دور الـ16', 8: 'ربع النهائي', 4: 'نصف النهائي', 2: 'النهائي' };
  var AFR = [['afr_sun', 'ماميلودي صنداونز', 66], ['afr_est', 'الترجي التونسي', 63], ['afr_orl', 'أورلاندو بايريتس', 62], ['afr_maz', 'تي بي مازيمبي', 58],
    ['afr_sim', 'سيمبا', 56], ['afr_yan', 'يانج أفريكانز', 56], ['afr_bel', 'شباب بلوزداد', 56], ['afr_css', 'النجم الساحلي', 54],
    ['afr_jsk', 'شبيبة القبائل', 52], ['afr_hil', 'الهلال السوداني', 52], ['afr_pet', 'بترو أتلتيكو', 52], ['afr_hor', 'هوروريا', 50]];
  var NAT_FIX = { en: 'gb-eng', sc: 'gb-sct', wa: 'gb-wls', ie: 'ie' };

  function sum(a) { var s = 0; a.forEach(function (x) { s += x; }); return s; }
  function pw(o, p, W) { return W[p] * Math.exp((o - 72) / 13); }
  function wpick(ws, tot, rng) { var x = rng() * tot, i = 0; for (; i < ws.length; i++) { x -= ws[i]; if (x <= 0) return i; } return ws.length - 1; }
  function roundMoney(v) { return v >= 1e6 ? Math.round(v / 1e4) * 1e4 : v >= 1e4 ? Math.round(v / 1e3) * 1e3 : Math.round(v / 10) * 10; }

  /* ---- اللاعيبة الحقيقيين ---- */
  function parseRoster(str, clubId) {
    return str.split(';').map(function (s) { var a = s.split('|'); return { n: a[0], p: POSMAP[a[1]] || 'MF', a: +a[2] || 25, o: +a[3] || 70, nat: a[4] || '', c: clubId }; });
  }
  function initPlayers(state) {
    var pl = [];
    Object.keys(D.ROSTERS || {}).forEach(function (cid) {
      if (!state.clubs[cid]) return;
      parseRoster(D.ROSTERS[cid], cid).forEach(function (x) { x.id = pl.length; pl.push(x); });
    });
    state.pl = pl; state.ps = {};
  }
  function initExtras(state) {
    D.NATIONAL.forEach(function (n) { var id = 'nt_' + n[1]; if (!state.clubs[id]) state.clubs[id] = { id: id, ar: n[0], str: n[2], crest: null, flag: n[1], league: 'nt', conf: n[3] }; });
    AFR.forEach(function (c) { if (!state.clubs[c[0]]) state.clubs[c[0]] = { id: c[0], ar: c[1], str: c[2], crest: null, league: 'afr' }; });
    if (!state.pl) initPlayers(state);
    state.intl = state.intl || { caps: 0, goals: 0, assists: 0, log: [] };
    if (state.money == null) state.money = 20000;
    state.owned = state.owned || [];
    state.sponsors = state.sponsors || [];
    state.contracts = state.contracts || [];
    state.earn = state.earn || { salary: 0, bonus: 0, prizes: 0, sponsor: 0 };
    state.fame = state.fame || 0;
    state.fatigue = state.fatigue || 0; state.susp = state.susp || 0; state.injCool = state.injCool || 0;
  }
  function squadRole(state) { var d = state.player.ovr - state.clubs[state.clubId].str; return d >= 4 ? 'نجم الفريق' : d >= -2 ? 'لاعب أساسي' : d >= -8 ? 'بديل مهم' : 'لاعب بالتناوب'; }
  function marketValue(state) { return feeM(state.player.ovr, state.player.age); }
  function ntOf(state) { return state.clubs['nt_' + state.player.natCode]; }

  function markStarters(list) {
    var need = { GK: 1, DF: 4, MF: 3, ST: 3 };
    ['GK', 'DF', 'MF', 'ST'].forEach(function (pp) {
      list.filter(function (x) { return x.p === pp; }).sort(function (a, b) { return b.o - a.o; }).forEach(function (x, i) { x.s = i < need[pp] ? 1 : 0; });
    });
  }
  /* توزيع أهداف وتمريرات وتقييم مباراة على لاعيبة الفريق المعروفين */
  function attribute(list, gf, ga, res, rng, ps) {
    var av = [], rec = {}, i, k;
    for (i = 0; i < list.length; i++) { var x = list[i]; if (rng() < (x.p === 'GK' ? (x.s ? 0.95 : 0.03) : (x.s ? 0.9 : 0.1))) av.push(x); }
    if (!av.length) return;
    av.forEach(function (y) { rec[y.id] = [0, 0]; });
    var of = av.filter(function (y) { return y.p !== 'GK'; });
    if (gf > 0 && of.length) {
      var gw = of.map(function (y) { return pw(y.o, y.p, GW); }), aw = of.map(function (y) { return pw(y.o, y.p, AW); });
      var miss = Math.max(0, 10 - of.length), fg = miss * (sum(gw) / of.length) * 0.6, fa = miss * (sum(aw) / of.length) * 0.6;
      for (k = 0; k < gf; k++) {
        var gi = wpick(gw.concat([fg]), sum(gw) + fg, rng);
        if (gi < of.length) rec[of[gi].id][0]++;
        if (rng() < 0.72) {
          var aw2 = aw.slice(); if (gi < of.length) aw2[gi] = 0;
          var ai = wpick(aw2.concat([fa]), sum(aw2) + fa, rng);
          if (ai < of.length) rec[of[ai].id][1]++;
        }
      }
    }
    av.forEach(function (y) {
      var r = rec[y.id], q = 3 + (y.o - 74) / 35 + (res > 0 ? 0.25 : res < 0 ? -0.25 : 0) + r[0] * 0.55 + r[1] * 0.35 + (ga === 0 && (y.p === 'GK' || y.p === 'DF') ? 0.35 : 0) + gauss(rng) * 0.25;
      var e = ps[y.id] || (ps[y.id] = [0, 0, 0, 0, 0]);
      e[0]++; e[1] += r[0]; e[2] += r[1]; e[3] += clamp(q, 1.5, 5);
      if (ga === 0 && (y.p === 'GK' || y.p === 'DF')) e[4]++;
    });
  }
  function runLeague(state, lk, rng, ps, byClub, own, logRound) {
    var L = own ? state.world.leagues[lk] : null, rows = {};
    var teams = own ? L.teams : Object.keys(state.clubs).filter(function (id) { return state.clubs[id].league === lk; });
    var fx = own ? L.fixtures : genFixtures(teams, rng);
    teams.forEach(function (id) { rows[id] = { id: id, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }; });
    fx.forEach(function (rd, r) {
      rd.forEach(function (m, i) {
        var rs = own ? (L.results[r] && L.results[r][i]) : quickMatch(state, m[0], m[1], rng);
        if (!rs) return;
        var h = rows[m[0]], a = rows[m[1]];
        h.p++; a.p++; h.gf += rs[0]; h.ga += rs[1]; a.gf += rs[1]; a.ga += rs[0];
        if (rs[0] > rs[1]) { h.w++; h.pts += 3; a.l++; } else if (rs[0] < rs[1]) { a.w++; a.pts += 3; h.l++; } else { h.d++; a.d++; h.pts++; a.pts++; }
        [0, 1].forEach(function (k) {
          var cid = m[k], list = byClub[cid]; if (!list) return;
          var gf = rs[k], ga = rs[1 - k];
          if (cid === state.clubId && lk === state.league) { var lg = logRound[r + 1]; if (lg) gf = Math.max(0, gf - (lg.goals || 0)); }
          attribute(list, gf, ga, gf > ga ? 1 : gf < ga ? -1 : 0, rng, ps);
        });
      });
    });
    return Object.keys(rows).map(function (k) { var x = rows[k]; x.gd = x.gf - x.ga; return x; })
      .sort(function (x, y) { return y.pts - x.pts || y.gd - x.gd || y.gf - x.gf || (state.clubs[y.id].str - state.clubs[x.id].str); });
  }

  /* مراحل دوري أبطال أوروبا لكل الأندية (0 مرحلة الدوري .. 6 بطل) */
  function myClStage(state) {
    var e = state.euro; if (!e || (e.status === 'out' && e.phase === 'qual')) return -1;
    return e.status === 'champ' ? 6 : e.phase === 'final' ? 5 : e.phase === 'sf' ? 4 : e.phase === 'qf' ? 3 : e.phase === 'r16' ? 2 : e.phase === 'playoff' ? 1 : 0;
  }
  function clStages(state, tabs, rng) {
    var field = [], seen = {};
    D.UEFA.forEach(function (lk) { (tabs[lk] || []).slice(0, D.EUROQ[lk]).forEach(function (r) { if (!seen[r.id]) { seen[r.id] = 1; field.push(r.id); } }); });
    var rest = [];
    ['eng1', 'esp1', 'ita1', 'ger1', 'fra1'].forEach(function (lk) { (tabs[lk] || []).slice(D.EUROQ[lk], D.EUROQ[lk] + 3).forEach(function (r) { if (!seen[r.id]) rest.push(r.id); }); });
    rest.sort(function (a, b) { return state.clubs[b].str - state.clubs[a].str; });
    while (field.length < 36 && rest.length) { var x = rest.shift(); seen[x] = 1; field.push(x); }
    var meIn = !!(state.euro && !(state.euro.status === 'out' && state.euro.phase === 'qual'));
    field = field.filter(function (id) { return id !== state.clubId; });
    var scored = field.map(function (id) { return { id: id, s: state.clubs[id].str + gauss(rng) * 4.2 }; }).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return x.id; });
    if (meIn) {
      var myStage = myClStage(state);
      scored.splice(Math.min([24, 16, 8, 4, 2, 1, 0][myStage], scored.length), 0, state.clubId);
    }
    var stage = {};
    scored.forEach(function (id, i) { stage[id] = i === 0 ? 6 : i === 1 ? 5 : i < 4 ? 4 : i < 8 ? 3 : i < 16 ? 2 : i < 24 ? 1 : 0; });
    return { stage: stage, champ: scored[0] };
  }
  function clBulk(state, stage, byClub, ps, rng) {
    var M = [8, 10, 12, 14, 15, 16, 17];
    Object.keys(stage).forEach(function (cid) {
      var list = byClub[cid]; if (!list || cid === state.clubId) return;
      var s = stage[cid], m = M[s], str = state.clubs[cid].str;
      var cg = Math.round(m * clamp(0.9 + (str - 60) * 0.03, 0.8, 2.1) * (0.85 + rng() * 0.3));
      var of = list.filter(function (y) { return y.p !== 'GK'; });
      var ws = of.map(function (y) { return pw(y.o, y.p, GW) * (y.s ? 1 : 0.25); }), tot = sum(ws), miss = Math.max(0, 10 - of.length);
      var fill = of.length ? miss * (tot / of.length) * 0.6 : 0, gs = {}, as = {};
      for (var k = 0; k < cg && of.length; k++) {
        var gi = wpick(ws.concat([fill]), tot + fill, rng);
        if (gi < of.length) { gs[of[gi].id] = (gs[of[gi].id] || 0) + 1; }
        if (rng() < 0.7) { var ai = Math.floor(rng() * of.length); if (ai !== gi) as[of[ai].id] = (as[of[ai].id] || 0) + 1; }
      }
      list.forEach(function (y) {
        var ap = Math.round(m * (y.s ? 0.8 : 0.1)); if (!ap) return;
        var e = ps[y.id] || (ps[y.id] = [0, 0, 0, 0, 0]);
        e[0] += ap; e[1] += gs[y.id] || 0; e[2] += as[y.id] || 0; e[3] += ap * (3.15 + (y.o - 74) / 35 + (s >= 4 ? 0.1 : 0));
        if (y.p === 'GK' || y.p === 'DF') e[4] += Math.round(ap * 0.28);
      });
    });
  }

  function simCupChamp(state, cd, rng) {
    var ids = [];
    cd.from.forEach(function (lk) { Object.keys(state.clubs).forEach(function (id) { if (state.clubs[id].league === lk) ids.push(id); }); });
    ids = ids.map(function (id) { return { id: id, s: state.clubs[id].str + gauss(rng) * 3 }; }).sort(function (a, b) { return b.s - a.s; }).slice(0, cd.n).map(function (x) { return x.id; });
    return ids.length > 1 ? champOf(state, ids, rng) : ids[0];
  }

  function simGlobal(state, rng) {
    var byClub = {}, ps = {};
    state.pl.forEach(function (x) { (byClub[x.c] = byClub[x.c] || []).push(x); });
    Object.keys(byClub).forEach(function (cid) { markStarters(byClub[cid]); });
    var logRound = {}; state.log.forEach(function (x) { if (!x.comp) logRound[x.round] = x; });
    var tabs = {}, champs = {};
    D.TOP15.forEach(function (lk) {
      tabs[lk] = runLeague(state, lk, rng, ps, byClub, !!(state.world.leagues[lk]), logRound);
      champs[lk] = tabs[lk][0].id;
    });
    var cl = clStages(state, tabs, rng);
    clBulk(state, cl.stage, byClub, ps, rng);
    state.ps = ps;
    var worldChamps = D.TOP15.map(function (lk) {
      var ck = LG[lk].country, cups = (D.COUNTRIES[ck].cups || []).map(function (cd) {
        var mine = ck === LG[state.league].country && (state.cups || []).filter(function (c) { return c.id === cd.id; })[0];
        return { ar: cd.ar, id: mine ? mine.champ : simCupChamp(state, cd, rng) };
      });
      return { lk: lk, champ: champs[lk], cups: cups };
    });
    return { tabs: tabs, champs: champs, cl: cl, byClub: byClub, worldChamps: worldChamps };
  }

  /* ---- الجوايز (محاكاة لكل اللاعيبة ثم مقارنة) ---- */
  function computeAwards(state, rng, ctx) {
    var p = state.player, s = state.stats, lk = state.league, G = ctx.glob, year = state.year, ps = state.ps;
    var avg = ctx.avg, out = {};
    var clMe = myClStage(state);
    var CLB = [0, 0.5, 1.5, 3, 5, 8, 13];
    function team(cid, mine) {
      var t = 0, c = state.clubs[cid], L = c && c.league;
      if (G.champs[L] === cid) t += 5;
      var st = mine ? clMe : G.cl.stage[cid];
      if (st != null && st >= 0) t += CLB[st];
      return t;
    }
    function cand(x) { var e = ps[x.id] || [0, 0, 0, 0, 0]; return { n: x.n, clubId: x.c, a: e[0], g: e[1], as: e[2], avg: e[0] ? e[3] / e[0] : 0, cs: e[4], p: x.p, age: x.a, mine: false, o: x.o, g0: !!x.g }; }
    function score(c, mine) {
      var s0 = c.g + c.as * 0.6 + (c.avg - 3) * 14 + (c.p === 'GK' ? c.cs * 0.8 : c.p === 'DF' ? c.cs * 0.3 : 0) + team(c.clubId, mine);
      return s0;
    }
    function line(c) { return c.p === 'GK' ? c.cs + ' مباراة بدون أهداف • تقييم ' + round1(c.avg) : c.g + ' هدف • ' + c.as + ' أسيست • تقييم ' + round1(c.avg); }
    var meC = { n: p.name, clubId: state.clubId, a: s.apps, g: s.goals, as: s.assists, avg: avg, cs: 0, p: p.pos, age: p.age - 1, mine: true, o: p.ovr };
    state.log.forEach(function (x) { if ((x.role === 'start' || x.role === 'sub') && x.minutes >= 60 && (x.home === state.clubId ? x.ag : x.hg) === 0) meC.cs++; });
    function pickWinner(list, sc, minApps) {
      var all = list.filter(function (c) { return c.a >= minApps; });
      all.forEach(function (c) { c.score = sc(c); });
      all.sort(function (a, b) { return b.score - a.score; });
      return all;
    }
    function pack(all, key) {
      var w = all[0];
      out[key] = { name: w.n, clubId: w.clubId, mine: !!w.mine, stat: line(w), cands: all.slice(0, 5).map(function (c) { return { name: c.n, clubId: c.clubId, mine: !!c.mine, stat: line(c), score: Math.round(c.score * 10) / 10 }; }), myRank: all.findIndex(function (c) { return c.mine; }) + 1 };
    }
    // الكرة الذهبية: اللي بيلعبوا في أوروبا بس
    var euroLg = function (cid) { var c = state.clubs[cid]; return c && D.UEFA.indexOf(c.league) > -1; };
    var bl = state.pl.filter(function (x) { return euroLg(x.c); }).map(cand);
    if (euroLg(state.clubId) && s.apps >= 15) bl.push(meC);
    var bw = pickWinner(bl, function (c) { return score(c, c.mine); }, 18);
    if (bw.length) pack(bw, 'ballon'); else out.ballon = null;
    var meEuro = euroLg(state.clubId);
    out.ballonEligible = meEuro;
    // الحذاء الذهبي والقفاز (الدوري اللي بتلعب فيه، الدرجة الأولى بس)
    var lgd = LG[lk], myLeagueTop = lgd.tier === 1;
    var cl = state.pl.filter(function (x) { var c = state.clubs[x.c]; return c && c.league === lk; });
    var cov = state.world.leagues[lk] ? cl.reduce(function (m, x) { m[x.c] = 1; return m; }, {}) : {};
    var coverage = Object.keys(cov).length / Math.max(1, state.world.leagues[lk].teams.length);
    if (myLeagueTop) {
      var boot = cl.map(cand); boot.push(meC);
      boot = pickWinner(boot, function (c) { return c.g + c.as * 0.01; }, 10);
      var need = coverage < 0.7 ? Math.round(rounds(lk) * 0.45) : 0;
      if (boot[0] && boot[0].mine && s.goals < need && boot.length > 1) boot = boot.filter(function (c) { return !c.mine; }).concat(boot.filter(function (c) { return c.mine; }));
      if (boot.length) pack(boot, 'boot'); else out.boot = null;
      var gl = cl.filter(function (x) { return x.p === 'GK'; }).map(cand);
      if (p.pos === 'GK') gl.push(meC);
      gl = pickWinner(gl, function (c) { return c.cs + c.avg * 0.1; }, 10);
      if (gl.length) pack(gl, 'glove'); else out.glove
