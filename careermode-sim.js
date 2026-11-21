/* Kora Challenge — محاكاة الماتش التفاعلية (منظور علوي بإحساس 3D خفيف على Canvas)
   ─────────────────────────────────────────────────────────────────────────────
   الفكرة: 200 ثانية فعلية = 90 دقيقة على الساعة. اللاعب بيتحكم بلاعبه (أو بالحارس) بجويستيك
   وأزرار، والباقي ذكاء اصطناعي للفريقين. الفريق المنافس بيجي من جدول المباريات.
   النتيجة بترجع للإنجن (applySim) وتتسجل في ملف اللاعب (أهداف/أسيست/تصديات/تقييم).

   الملف مقسوم لـ 3 أجزاء:
     1) المحرّك (createMatch): منطق اللعبة من غير أي DOM (ينفع يتجرّب في Node)
     2) الرسم (draw): ملعب مرسوم مسبقًا + لاعيبة + ظلال + احتفال
     3) الواجهة (open): شاشة كاملة + جويستيك + أزرار + نتيجة المباراة
   الاستخدام:  KoraMatchSim.open({...}, function (result) { ... });                          */
(function (root) {
  'use strict';

  /* ====== ثوابت الملعب (وحدات منطقية: 10 وحدة = متر تقريبًا) ====== */
  const W = 680, H = 1050, M = 70;                 // العرض والطول والهامش (المدرجات)
  const GW = 116, GX0 = (W - GW) / 2, GX1 = GX0 + GW; // المرمى
  const PA_W = 400, PA_D = 170, SA_W = 200, SA_D = 58; // منطقة الجزاء والستة ياردة
  const R = 14, BR = 6;                            // نصف قطر اللاعب والكرة
  const MATCH_SECONDS = 200;                       // الوقت الفعلي للماتش
  const DT = 1 / 60;

  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const rnd = () => Math.random();
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /* ====== التشكيلات: [الدور, x (0..1), عمق من مرمى الفريق (0..1)] ====== */
  const FORMS = {
    '433': [['GK', .5, .04], ['DF', .14, .22], ['DF', .38, .19], ['DF', .62, .19], ['DF', .86, .22], ['MF', .28, .42], ['MF', .5, .38], ['MF', .72, .42], ['FW', .17, .70], ['FW', .5, .76], ['FW', .83, .70]],
    '442': [['GK', .5, .04], ['DF', .14, .22], ['DF', .38, .19], ['DF', .62, .19], ['DF', .86, .22], ['MF', .14, .46], ['MF', .38, .42], ['MF', .62, .42], ['MF', .86, .46], ['FW', .38, .72], ['FW', .62, .72]],
    '532': [['GK', .5, .04], ['DF', .1, .27], ['DF', .3, .2], ['DF', .5, .18], ['DF', .7, .2], ['DF', .9, .27], ['MF', .28, .42], ['MF', .5, .38], ['MF', .72, .42], ['FW', .38, .70], ['FW', .62, .70]]
  };
  /* أساليب لعب الفريق (المنافس بيتحدد من قوته + عشوائي، وبيتغير مع النتيجة) */
  const STYLES = {
    possession: { ar: 'استحواذ وتمرير', form: '433', shoot: 235, pass: .78, line: .06, press: 1.0, dribble: .22, through: false },
    counter: { ar: 'هجوم مرتد', form: '532', shoot: 260, pass: .5, line: -.08, press: .75, dribble: .45, through: true },
    longshot: { ar: 'تسديد من بعيد', form: '442', shoot: 440, pass: .52, line: 0, press: .9, dribble: .3, through: false },
    smart: { ar: 'تمريرات ذكية', form: '433', shoot: 270, pass: .72, line: .02, press: .9, dribble: .2, through: true }
  };
  const STYLE_KEYS = Object.keys(STYLES);

  /* ═════════════════════════════════════════════════════════════════════════
     1) المحرّك
     ═════════════════════════════════════════════════════════════════════════ */
  function createMatch(o) {
    /* o: { pos:'ST'|'MF'|'DF'|'GK', ovr, myStr, oppStr, myName, oppName, playerName, skills:{}, home, auto, style } */
    const m = {
      t: 0, phase: 'kickoff', phaseT: 1.4, half: 1, score: [0, 0], speedMul: 1, over: false, userRole: o.pos,
      ball: { x: W / 2, y: H / 2, z: 0, vx: 0, vy: 0, vz: 0, shot: null, pass: null, lastTeam: 0, lastP: null, hidden: false },
      carrier: null, poss: -1, kickTeam: 0, events: [], timeline: [], log: [], fx: [], flash: 0, banner: null, shake: 0, restartHold: 0,
      lastPass: null, o: o, input: null, charge: { shoot: 0, pass: 0 }, stamina: 1, lastEventT: 0, sfx: null,
      u: { goals: 0, assists: 0, saves: 0, shots: 0, onTarget: 0, passes: 0, passOk: 0, tackles: 0, tackleTry: 0, fouls: 0, yellow: 0, red: 0, intercepts: 0, concededOnWatch: 0 },
      /* الحكم + التسلل/الفار + الكروت + الجزاء */
      ref: { x: W / 2 + 90, y: H / 2 + 70, vx: 0, vy: 0, face: 0, ref: true, role: 'REF', team: -1, card: null, focus: null, dive: 0, stun: 0, hold: 0, slide: 0 },
      freeze: 0, pen: null, hist: [], histN: 0, hc: 0, var: null, varId: 0, offs: [0, 0], userOff: false, cnt: { off: 0, foul: 0, y: 0, r: 0, pen: 0 }
    };
    const myStyle = 'possession';
    const oppStyleKey = o.style || (o.oppStr >= 78 ? (rnd() < .5 ? 'possession' : 'smart') : STYLE_KEYS[Math.floor(rnd() * 4)]);
    m.teams = [mkTeam(0, o.myStr, myStyle, o.myName, o.myColor), mkTeam(1, o.oppStr, oppStyleKey, o.oppName, o.oppColor)];
    /* اللاعب بيلعب في مركزه */
    const me = m.teams[0];
    const pick = { GK: p => p.role === 'GK', DF: p => p.role === 'DF' && Math.abs(p.ax - .38) < .02, MF: p => p.role === 'MF' && Math.abs(p.ax - .5) < .02, ST: p => p.role === 'FW' && Math.abs(p.ax - .5) < .02 };
    let u = me.players.find((pick[o.pos] || pick.ST));
    if (!u) u = me.players.find(p => p.role === (o.pos === 'GK' ? 'GK' : o.pos === 'DF' ? 'DF' : o.pos === 'MF' ? 'MF' : 'FW') && p.id !== 0) || me.players[10];
    u.user = true; m.user = u; m.isGK = o.pos === 'GK';
    /* قوة اللاعب (بتأثر على السرعة والدقة) */
    const q = clamp((o.ovr - 50) / 49, .1, 1), sk = o.skills || {};
    u.spd = 108 + q * 30 + (sk.spd || 0) * 2.2; u.shootQ = clamp(.35 + q * .5 + (sk.pow || 0) * .02, .2, 1); u.passQ = clamp(.4 + q * .45 + (sk.skl || 0) * .02 + (sk.crs || 0) * .01, .2, 1); u.tackQ = clamp(.45 + q * .3 + (sk.phy || 0) * .02, .2, 1);
    /* لو الفريق مصنف أقوى من الخصم بنساعد شوية (وعكسه) */
    m.biasMe = clamp((o.myStr - o.oppStr) / 90, -.18, .18); m.biasMeShoot = 1;
    m.userBias = { ST: 1.0, MF: 1.0, DF: 1.15, GK: 1.3 }[o.pos] || 1;   /* المهاجم بيجيله فرص أكتر من تمريرات الزمايل، والمدافع/الحارس خصمه بيهاجم أكتر */
    /* نجوم الخصم الحقيقيين: أسرع وأدق، واسمهم فوق راسهم */
    (o.stars || []).slice(0, 3).forEach(st => {
      const role = st.pos === 'GK' ? 'GK' : st.pos === 'DF' ? 'DF' : st.pos === 'MF' ? 'MF' : 'FW';
      const c = m.teams[1].players.filter(p => p.role === role && !p.star).sort((a, b) => Math.abs(a.ax - .5) - Math.abs(b.ax - .5))[0];
      if (!c) return;
      const bonus = clamp((st.o - 74) / 20, 0, 1);
      c.star = { name: String(st.n || '').split(' ').slice(-1)[0], ovr: st.o, b: bonus };
      c.spd += 4 + bonus * 9;
    });
    m.all = m.teams[0].players.concat(m.teams[1].players);
    placeAll(m, 0);
    return m;
  }

  function mkTeam(idx, str, styleKey, name, color) {
    const sty = STYLES[styleKey], form = FORMS[sty.form];
    const q = clamp((str - 48) / 46, .15, 1);
    const t = { idx: idx, dir: idx === 0 ? -1 : 1, str: str, q: q, styleKey: styleKey, sty: Object.assign({}, sty), base: Object.assign({}, sty), name: name || '', color: color || '#888', players: [], lineAdj: 0, shootFreq: 1, saves: 0 };
    form.forEach((f, i) => t.players.push({
      id: idx * 11 + i, team: idx, role: f[0], ax: f[1], ay: f[2], x: 0, y: 0, vx: 0, vy: 0, face: idx === 0 ? -1.57 : 1.57,
      spd: 86 + q * 24 + (f[0] === 'FW' ? 4 : f[0] === 'DF' ? -3 : 0), cd: 0, tcd: 0, dec: rnd() * .3, tx: 0, ty: 0, user: false,
      dive: 0, diveVx: 0, stun: 0, hold: 0, call: 0, num: i + 1
    }));
    return t;
  }
  const toX = (t, nx) => nx * W;
  const toY = (t, ny) => t.idx === 0 ? H - ny * H : ny * H;

  function placeAll(m, kickTeam) {
    m.teams.forEach(t => t.players.forEach(p => {
      p.x = toX(t, p.ax); p.y = toY(t, p.ay); p.vx = p.vy = 0; p.stun = 0; p.dive = 0; p.hold = 0; p.cd = 0; p.tcd = .5;
      /* كل فريق في نصف ملعبه عند البداية */
      if (t.idx === 0) p.y = Math.max(p.y, H / 2 + 24); else p.y = Math.min(p.y, H / 2 - 24);
      p.face = t.idx === 0 ? -1.57 : 1.57; p.tx = p.x; p.ty = p.y;
    }));
    const b = m.ball; b.x = W / 2; b.y = H / 2; b.z = 0; b.vx = b.vy = b.vz = 0; b.shot = null; b.pass = null;
    m.kickTeam = kickTeam;
    const taker = nearestTo(m.teams[kickTeam].players.filter(p => p.role !== 'GK' && !(p.user && m.isGK)), W / 2, H / 2 + (kickTeam === 0 ? 30 : -30));
    taker.x = W / 2 + (kickTeam === 0 ? 0 : 0); taker.y = H / 2 + (kickTeam === 0 ? 16 : -16);
    give(m, taker);
  }
  function nearestTo(list, x, y) { let b = list[0], bd = 1e9; for (let i = 0; i < list.length; i++) { const d = (list[i].x - x) * (list[i].x - x) + (list[i].y - y) * (list[i].y - y); if (d < bd) { bd = d; b = list[i]; } } return b; }
  function give(m, p) { m.carrier = p; m.poss = p.team; m.ball.lastTeam = p.team; m.ball.lastP = p; m.ball.shot = null; m.ball.vx = m.ball.vy = m.ball.vz = 0; m.ball.z = 0; p.hold = 0; }
  const oppIdx = i => 1 - i;

  /* ====== الأحداث (للتايم لاين وللرسالة على الشاشة) ====== */
  function minute(m) { return clamp(Math.round(m.t / MATCH_SECONDS * 90), 1, 90); }
  function say(m, text, kind) { m.banner = { text: text, kind: kind || '', t: 1.6 }; }
  function sfx(m, name) { if (m.sfx && m.sfx[name]) m.sfx[name](); }

  /* ====== حركة اللاعيبة ====== */
  function moveToward(p, tx, ty, speed, dt, accel) {
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
    let vx = 0, vy = 0;
    if (d > 3) { const k = Math.min(1, d / 26); vx = dx / d * speed * k; vy = dy / d * speed * k; }
    const a = accel || .2;
    p.vx += (vx - p.vx) * a; p.vy += (vy - p.vy) * a;
  }
  function advance(p, dt) {
    p.x = clamp(p.x + p.vx * dt, -6, W + 6); p.y = clamp(p.y + p.vy * dt, -6, H + 6);
    if (Math.abs(p.vx) + Math.abs(p.vy) > 12) p.face = Math.atan2(p.vy, p.vx);
  }

  /* مكان اللاعب الطبيعي بحسب التشكيل ومكان الكرة (شكل الفريق) */
  function shapeTarget(m, t, p) {
    const inPoss = m.poss === t.idx, bn = t.idx === 0 ? 1 - m.ball.y / H : m.ball.y / H;
    const k = p.role === 'GK' ? 0 : p.role === 'DF' ? .34 : p.role === 'MF' ? .55 : .7;
    let depth = p.ay + (bn - .5) * k * .9 + (inPoss ? .07 : -.04) + t.lineAdj * (p.role === 'GK' ? 0 : 1);
    if (p.role === 'FW' && !inPoss) depth = Math.min(depth, .64);
    if (p.role === 'DF') depth = Math.min(depth, .6);
    depth = clamp(depth, p.role === 'GK' ? .03 : .08, .95);
    const nx = p.ax + (m.ball.x / W - .5) * (p.role === 'GK' ? .12 : .24) * (p.role === 'FW' ? .6 : 1);
    return [clamp(nx, .05, .95) * W, toY(t, depth)];
  }

  /* ====== التمرير والتسديد ====== */
  function kick(m, p, tx, ty, speed, opts) {
    opts = opts || {};
    const b = m.ball; let ang = Math.atan2(ty - b.y, tx - b.x);
    ang += gauss() * (opts.err || .04);
    b.x = p.x + Math.cos(ang) * (R + 2); b.y = p.y + Math.sin(ang) * (R + 2);
    b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed; b.vz = opts.lift || 0; b.z = 0;
    b.lastTeam = p.team; b.lastP = p; m.carrier = null; m.poss = -1; p.cd = .38;
    b.shot = opts.shot ? { team: p.team, by: p } : null;
    b.pass = opts.to ? { from: p, to: opts.to, t: m.t } : null;
    if (b.pass && p.role !== 'GK') { const off = isOffside(m, p, opts.to); if (off) { recHist(m); off.hi = m.histN; b.pass.off = off; } }
    if (opts.to && p.user) { m.u.passes++; m.lastPass = { p: p, to: opts.to, t: m.t }; }
    if (opts.to && !p.user) m.lastPass = { p: p, to: opts.to, t: m.t };
    sfx(m, opts.shot ? 'shot' : 'kick');
  }
  function goalPoint(t) { return { x: W / 2, y: t.idx === 0 ? 0 : H }; }

  function doShoot(m, p, aimX, power, userShot) {
    const t = m.teams[p.team], gy = t.idx === 0 ? 0 : H;
    const q = userShot ? p.shootQ : clamp(.3 + t.q * .55 + (p.star ? .06 + p.star.b * .08 : 0), .2, .97);
    const dg = Math.abs(gy - p.y);
    const err = (.03 + (1 - q) * .13 + power * .045 + Math.min(dg, 600) / 600 * .03) * (Math.hypot(p.vx, p.vy) > 60 ? 1.15 : 1);
    const speed = 520 + 600 * power;
    kick(m, p, aimX, gy, speed, { shot: true, err: err, lift: power > .8 ? 40 : 0 });
    if (p.team === 0) { m.teams[0].shots = (m.teams[0].shots || 0) + 1; } else { m.teams[1].shots = (m.teams[1].shots || 0) + 1; }
    if (p.user) { m.u.shots++; }
    /* هل هتبقى على المرمى؟ (للإحصائيات فقط) */
    const tc = Math.abs((gy - m.ball.y) / (m.ball.vy || 1e-6)), ix = m.ball.x + m.ball.vx * tc;
    m.ball.shot.onTarget = ix > GX0 - 4 && ix < GX1 + 4;
    if (p.user && m.ball.shot.onTarget) m.u.onTarget++;
    say(m, p.user ? 'شووووت!' : '', 'shot');
  }

  /* أحسن زميل للتمرير. dirX/dirY = اتجاه الجويستيك (لو اللاعب هو اللي بيمرر) */
  function bestPass(m, p, dirX, dirY, forUser) {
    const t = m.teams[p.team], opp = m.teams[oppIdx(p.team)], dirAdv = t.dir;
    let best = null, bs = -1e9;
    const hasDir = forUser && (Math.abs(dirX) + Math.abs(dirY) > .25);
    t.players.forEach(r => {
      if (r === p || (r.role === 'GK' && !forUser && (p.team === 0 ? p.y < H * .6 : p.y > H * .4))) return;
      if (r.role === 'GK' && forUser && !m.isGK && hasDir === false) return;
      const dx = r.x - p.x, dy = r.y - p.y, d = Math.hypot(dx, dy);
      if (d < 36 || d > 520) return;
      let s = 0;
      const prog = dy * dirAdv;                 // تقدم لقدّام
      if (forUser) {
        if (hasDir) { const cos = (dx * dirX + dy * dirY) / (d * Math.hypot(dirX, dirY)); if (cos < .55) return; s += cos * 220; }
        else s += prog * .25 + (r.role === 'FW' ? 20 : 0);
      } else {
        s += prog * (t.sty.pass > .6 ? .35 : .55) + (r.user ? 28 * m.userBias : 0) + (r.call > 0 ? 70 : 0) + (r.role === 'FW' ? 15 : 0);
      }
      /* فتح المساحة: أقرب مدافع للمستلم + حجب الخط */
      let near = 1e9, blocked = false;
      opp.players.forEach(e => {
        const de = Math.hypot(e.x - r.x, e.y - r.y); if (de < near) near = de;
        const t0 = ((e.x - p.x) * dx + (e.y - p.y) * dy) / (d * d);
        if (t0 > .08 && t0 < .92) { const cx = p.x + dx * t0, cy = p.y + dy * t0; if (Math.hypot(e.x - cx, e.y - cy) < 24) blocked = true; }
      });
      s += Math.min(near, 160) * .5 - (blocked ? 120 : 0) - Math.max(0, d - 300) * .25;
      if (s > bs) { bs = s; best = r; }
    });
    return best;
  }
  function doPass(m, p, r, power, userPass, through) {
    const t = m.teams[p.team];
    const d = Math.hypot(r.x - p.x, r.y - p.y);
    const q = userPass ? p.passQ : clamp(.35 + t.q * .55 + (p.star ? .05 : 0), .2, .97);
    const lead = through ? .75 : .38;
    const tx = clamp(r.x + r.vx * lead + (through ? 0 : 0), 20, W - 20), ty = clamp(r.y + r.vy * lead + (through ? t.dir * 46 : 0), 8, H - 8);
    const dd = Math.hypot(tx - p.x, ty - p.y);
    const speed = clamp(((userPass ? (.45 + power * .75) : 1) * (dd * 1.55 + 190)), 250, 760);
    kick(m, p, tx, ty, speed, { to: r, err: .018 + (1 - q) * .08 + dd / 6000, lift: dd > 330 && rnd() < .35 ? 70 : 0 });
    if (userPass) say(m, '', 'pass');
  }

  /* ====== قرار الحامل للكرة (ذكاء اصطناعي) ====== */
  function aiCarrier(m, p, dt) {
    const t = m.teams[p.team], opp = m.teams[oppIdx(p.team)], sty = t.sty;
    const gy = t.idx === 0 ? 0 : H, dg = Math.hypot(W / 2 - p.x, gy - p.y);
    p.dec -= dt;
    /* الحارس: يوزّع الكرة */
    if (p.role === 'GK') { p.hold += dt; if (p.hold > .9 + rnd() * .7) { const r = bestPass(m, p, 0, 0, false) || t.players[1]; doPass(m, p, r, 1, false, false); } return; }
    /* الدريبل: نحو المرمى مع تفادي أقرب مدافع */
    let near = null, nd = 1e9;
    opp.players.forEach(e => { const d = dist(e, p); if (d < nd) { nd = d; near = e; } });
    let tx = W / 2 + (p.x < W / 2 ? 40 : -40) * (dg < 300 ? .5 : 1), ty = gy;
    if (near && nd < 70) { const side = near.x < p.x ? 1 : -1; tx = p.x + side * 120; ty = p.y + t.dir * 70; }
    p.tx = clamp(tx, 30, W - 30); p.ty = ty;
    if (p.dec > 0) return;
    p.dec = .26 + rnd() * .22;
    const urg = urgency(m, t);
    const range = sty.shoot * urg.range, inAngle = Math.abs(p.x - W / 2) < (dg < 230 ? 250 : 170);
    if (dg < range && inAngle && nd > 26) {
      const prob = (.22 + (dg < 190 ? .3 : 0) + (dg < 120 ? .25 : 0)) * t.shootFreq * (p.team === 0 ? m.biasMeShoot : 1);
      if (rnd() < prob) {
        /* التسديدة بتتحط في ركن بعيد عن الحارس */
        const gk = t.idx === 0 ? m.teams[1].players[0] : m.teams[0].players[0];
        const aim = clamp(gk.x < W / 2 ? GX1 - 14 - rnd() * 26 : GX0 + 14 + rnd() * 26, GX0 + 6, GX1 - 6);
        doShoot(m, p, aim + gauss() * 8, .55 + rnd() * .4, false); return;
      }
    }
    const pressed = nd < 46;
    if ((pressed && rnd() < .8) || rnd() < (1 - sty.dribble) * (sty.pass > .6 ? .5 : .32)) {
      const r = bestPass(m, p, 0, 0, false);
      if (r) { doPass(m, p, r, 1, false, sty.through && rnd() < .45); return; }
    }
  }
  function urgency(m, t) {
    const mn = m.t / MATCH_SECONDS * 90, diff = m.score[t.idx] - m.score[oppIdx(t.idx)];
    let range = 1;
    if (mn > 55) { if (diff < 0) range = 1.2; else if (diff > 0 && mn > 70) range = .85; }
    return { range: range };
  }
  /* الفريق بيغيّر أسلوبه مع النتيجة والوقت */
  function adaptTeams(m) {
    const mn = m.t / MATCH_SECONDS * 90;
    m.teams.forEach(t => {
      const diff = m.score[t.idx] - m.score[oppIdx(t.idx)];
      t.lineAdj = t.base.line; t.sty.press = t.base.press; t.sty.pass = t.base.pass; t.sty.dribble = t.base.dribble;
      if (mn > 55 && diff < 0) { t.lineAdj += .12; t.sty.press += .25; t.sty.pass -= .12; t.shootFreq = 1.25; }
      else if (mn > 68 && diff > 0) { t.lineAdj -= .1; t.sty.press -= .2; t.sty.dribble -= .1; t.shootFreq = .85; }
      else t.shootFreq = 1;
      if (t.idx === 1) {
        if (m.isGK) t.shootFreq *= 1.15; else if (m.userRole === 'DF') t.shootFreq *= 1.1;
      }
      if (t.idx === 0 && !m.isGK) t.shootFreq *= (m.userRole === 'ST' ? 1.05 : 1);
    });
    m.biasMeShoot = 1 + m.biasMe;
  }

  /* ====== الحارس (ذكاء اصطناعي) ====== */
  function aiKeeper(m, t, p, dt) {
    const b = m.ball, gy = t.idx === 0 ? H : 0, dirIn = t.idx === 0 ? 1 : -1;   // اتجاه الكرة لما بتدخل مرمى الفريق ده
    const q = t.q;
    if (m.carrier === p) { aiCarrier(m, p, dt); p.vx *= .8; p.vy *= .8; return; }
    let tx = W / 2, ty = gy + (t.idx === 0 ? -24 : 24);
    const comingIn = b.shot && b.shot.team !== t.idx && b.vy * dirIn > 80;
    if (comingIn) {
      const tc = (gy - b.y) / b.vy, ix = b.x + b.vx * tc;
      p.react = (p.react == null ? .1 + (1 - q) * .22 : p.react) - dt;
      if (p.react <= 0) {
        tx = clamp(ix, GX0 - 40, GX1 + 40); ty = gy + (t.idx === 0 ? -14 : 14);
        const need = Math.abs(tx - p.x);
        if (p.dive <= 0 && need > 34 && tc < .55 && tc > .05) { p.dive = .42; p.diveVx = clamp((tx - p.x) / Math.max(tc, .12), -430, 430); }
      }
    } else {
      p.react = null;
      /* بيتمركز على الزاوية بين الكرة والمرمى */
      const k = clamp((Math.abs(b.y - gy)) / H, .05, .6), ang = (b.x - W / 2) * (1 - k) * .17;
      tx = clamp(W / 2 + ang, GX0 + 10, GX1 - 10); ty = gy + dirIn * -(26 + (Math.abs(b.y - gy) < 340 ? 20 : 0));
      /* لو الكرة حرة في منطقته يخرج لها */
      if (!m.carrier && Math.abs(b.y - gy) < PA_D - 20 && Math.abs(b.x - W / 2) < PA_W / 2 - 40 && Math.hypot(b.vx, b.vy) < 150) { tx = b.x; ty = b.y; }
    }
    if (p.dive > 0) { p.dive -= dt; p.vx = p.diveVx; p.vy *= .5; if (p.dive <= 0) p.stun = .45; }
    else if (p.stun > 0) { p.stun -= dt; p.vx *= .8; p.vy *= .8; }
    else moveToward(p, tx, ty, 120 + q * 100, dt, .25);
  }

  /* ====== اللاعب المتحكم فيه (جويستيك + أزرار) ====== */
  function userStep(m, p, inp, dt) {
    const u = m.u, b = m.ball;
    const mx = inp ? inp.mx : 0, my = inp ? inp.my : 0, mag = Math.min(1, Math.hypot(mx, my));
    if (m.isGK) {
      const gy = H;
      let tx = p.x + mx * 200, ty = p.y + my * 200;
      tx = clamp(tx, GX0 - 120, GX1 + 120); ty = clamp(ty, H - PA_D + 14, H - 14);
      if (p.dive > 0) { p.dive -= dt; p.vx = p.diveVx; p.vy = p.diveVy; if (p.dive <= 0) p.stun = .5; }
      else if (p.stun > 0) { p.stun -= dt; p.vx *= .8; p.vy *= .8; }
      else {
        p.vx += (mx * 150 - p.vx) * .25; p.vy += (my * 120 - p.vy) * .25;
        p.x = clamp(p.x, GX0 - 130, GX1 + 130); if (p.y < H - PA_D + 14) p.vy = Math.max(p.vy, 40); if (p.y > H - 14) p.vy = Math.min(p.vy, -40);
        if (inp && inp.actPress && p.cd <= 0 && m.carrier !== p) {
          /* ارتماء: ناحية الجويستيك، ولو مفيش جويستيك ناحية توقع الكرة */
          let dx = mx, dy = my;
          if (mag < .25 && b.shot) { const tc = (gy - b.y) / (b.vy || 1e-6); dx = clamp((b.x + b.vx * Math.max(tc, 0) - p.x) / 90, -1, 1); dy = 0; }
          else if (mag < .25) { dx = clamp((b.x - p.x) / 90, -1, 1); dy = 0; }
          const n = Math.hypot(dx, dy) || 1;
          p.dive = .4; p.diveVx = dx / n * 430; p.diveVy = dy / n * 300; p.cd = 1.1; sfx(m, 'dive');
        }
      }
      if (m.carrier === p) {
        p.hold += dt; p.vx *= .7; p.vy *= .7;
        const ch = m.charge;
        if (inp && inp.pass) ch.pass = Math.min(1, ch.pass + dt / .85);
        else if (ch.pass > 0) { const pw = Math.max(.35, ch.pass); ch.pass = 0; gkThrow(m, p, mx, my, pw); }
        if (p.hold > 5.5) gkThrow(m, p, 0, -1, .6);
      } else m.charge.pass = 0;
      return;
    }
    /* لاعب ميدان */
    const hasBall = m.carrier === p;
    const sprint = inp && inp.sprint && m.stamina > .03;
    const sp = p.spd * (sprint ? 1.34 : 1) * (hasBall ? .94 : 1);
    if (sprint && mag > .2) m.stamina = Math.max(0, m.stamina - dt * .22); else m.stamina = Math.min(1, m.stamina + dt * .1);
    p.vx += (mx * sp - p.vx) * .22; p.vy += (my * sp - p.vy) * .22;
    if (p.stun > 0) { p.stun -= dt; p.vx *= .8; p.vy *= .8; }
    const ch = m.charge;
    if (hasBall) {
      p.hold += dt;
      if (inp && inp.shoot) ch.shoot = Math.min(1, ch.shoot + dt / .9); else if (ch.shoot > 0) {
        const pw = Math.max(.3, ch.shoot); ch.shoot = 0;
        let aim = W / 2 + mx * 70; if (mag < .2) aim = W / 2 + gauss() * 20;
        doShoot(m, p, clamp(aim, GX0 + 4, GX1 - 4), pw, true); return;
      }
      if (inp && inp.pass) ch.pass = Math.min(1, ch.pass + dt / .85); else if (ch.pass > 0) {
        const pw = Math.max(.3, ch.pass); ch.pass = 0;
        const r = bestPass(m, p, mx, my, true) || bestPass(m, p, 0, 0, true);
        if (r) doPass(m, p, r, pw, true, !!(inp && inp.through)); else { kick(m, p, p.x + Math.cos(p.face) * 200, p.y + Math.sin(p.face) * 200, 300 * pw + 200, { err: .08 }); }
        return;
      }
    } else {
      ch.shoot = 0; ch.pass = 0;
      if (inp && inp.passPress) p.call = 2.2;             /* اطلب الكرة */
      if (inp && inp.actPress && p.tcd <= 0) { const c0 = m.carrier && m.carrier.team !== p.team && dist(p, m.carrier) < 150 ? m.carrier : b; startSlide(m, p, c0.x, c0.y); tackleTry(m, p, true); }
    }
  }
  function gkThrow(m, p, mx, my, power) {
    const r = bestPass(m, p, mx, my, true) || m.teams[0].players[3];
    doPass(m, p, r, power, true, false);
  }

  /* ====== الافتكاك ====== */
  function tackleTry(m, p, isUser) {
    const c = m.carrier; p.tcd = isUser ? .85 : .75;
    if (!isUser && c && c.team !== p.team && dist(p, c) <= 26 && rnd() < .6) startSlide(m, p, c.x, c.y);
    if (!c || c.team === p.team) return;
    const d = dist(p, c), reach = isUser ? 36 : 26;
    if (isUser) m.u.tackleTry++;
    if (d > reach || m.restartHold > 0) return;
    const t = m.teams[p.team], ct = m.teams[c.team];
    const tq = isUser ? p.tackQ : t.q * .8 + .15 + (p.star ? .06 : 0), cq = c.user ? .55 : ct.q * .8 + .12 + (c.star ? .08 : 0);
    /* اتجاه الاقتراب: من قدام أصعب، من ورا أسهل لكن احتمال ماقف */
    let pr = clamp(.45 + (tq - cq) * .75 + (c.user ? .08 : 0), .12, .85);
    if (rnd() < pr) {
      /* نجح */
      const a = Math.atan2(p.y - c.y, p.x - c.x);
      c.stun = .4; c.cd = .5;
      if (rnd() < .66) { give(m, p); p.cd = 0; } else { m.carrier = null; m.poss = -1; m.ball.vx = Math.cos(a + gauss() * .8) * 150; m.ball.vy = Math.sin(a + gauss() * .8) * 150; m.ball.lastTeam = p.team; m.ball.lastP = p; }
      if (isUser) { m.u.tackles++; say(m, 'افتكاك!', 'tackle'); sfx(m, 'tackle'); }
      if (c.user) say(m, 'اتاخدت منك الكرة', 'bad');
    } else if (rnd() < (isUser ? .18 : .12)) {
      /* فاول (ممكن كارت أو ركلة جزاء) */
      p.stun = .5; foul(m, p, c);
    } else p.stun = .25;
  }

  /* ====== انزلاق العرقلة + الحكم + الفاول والكروت + الجزاء + التسلل/الفار ====== */
  const PEN_D = 110;
  const inBox = (team, x, y) => Math.abs(x - W / 2) < PA_W / 2 && (team === 0 ? y > H - PA_D : y < PA_D);   /* صندوق الفريق اللي بيدافع */
  function startSlide(m, p, tx, ty) {
    if (p.slide > 0) return;
    p.sa = Math.atan2(ty - p.y, tx - p.x); p.sdur = .42; p.slide = .42; p.face = p.sa;
    if (!m.lowFx) burst(m, p.x, p.y + 8, '#d8c79a', 7);
  }
  const pName = (m, p) => p.user ? (m.o.playerName || 'لاعبنا') : 'لاعب ' + m.teams[p.team].name;
  function sendOff(m, p) {
    const t = m.teams[p.team], i = t.players.indexOf(p);
    if (m.carrier === p) { m.carrier = null; m.poss = -1; }
    if (i > 0) t.players.splice(i, 1);
    p.off = true; p.vx = p.vy = 0; p.slide = 0;
    if (p.user) m.userOff = true;
    if (m.pen && m.pen.taker === p) m.pen.taker = null;
  }
  function foul(m, p, c) {
    const mn = minute(m), pen = inBox(p.team, c.x, c.y); p.fouls = (p.fouls || 0) + 1;
    m.cnt.foul++; if (p.user) m.u.fouls++;
    sfx(m, 'whistle'); m.restartHold = 0;
    let card = null;
    if (rnd() < (pen ? .025 : .01) + (p.fouls >= 3 ? .01 : 0)) card = 'r';
    else if (rnd() < .17 + (p.fouls >= 2 ? .2 : 0) + (pen ? .1 : 0)) { p.yel = (p.yel || 0) + 1; card = p.yel >= 2 ? 'r2' : 'y'; }
    m.ref.focus = { x: c.x, y: c.y, t: 2.4 };
    let txt = pen ? 'ركلة جزاء!' : 'فاول!', kind = 'foul';
    if (card) {
      m.ref.card = { k: card === 'y' ? 'y' : 'r', t: 2.2 };
      txt += (pen ? ' + ' : ' ') + (card === 'y' ? 'كارت أصفر' : card === 'r2' ? 'أصفر تاني = أحمر' : 'كارت أحمر') + ' · ' + pName(m, p);
      if (card === 'y') m.cnt.y++; else m.cnt.r++;
      if (card !== 'y') kind = 'bad';
      if (p.user) { if (card === 'y') m.u.yellow = 1; else { m.u.red = 1; if (card === 'r2') m.u.yellow = 1; m.timeline.push({ m: mn, t: 'red' }); } }
      if (card !== 'y') sendOff(m, p);
    }
    say(m, txt, kind);
    m.freeze = card ? 2.1 : 1.1;
    if (pen) awardPen(m, c.team, c); else { give(m, c); c.cd = 0; m.restartHold = .8; }
  }
  function awardPen(m, team, fouled) {
    m.cnt.pen++;
    const t = m.teams[team], gy = team === 0 ? 0 : H, sy = team === 0 ? PEN_D : H - PEN_D;
    let taker = null;
    if (team === 0 && !m.isGK && !m.userOff && m.user) taker = m.user;
    else taker = t.players.filter(q => q.role !== 'GK' && q !== fouled).sort((a, b) => (b.role === 'FW') - (a.role === 'FW') || Math.abs(a.ax - .5) - Math.abs(b.ax - .5))[0] || fouled;
    const b = m.ball; b.vx = b.vy = 0; b.z = 0; b.shot = null; b.pass = null;
    let i = 0;
    m.teams.forEach(tm => tm.players.forEach(q => {
      if (q === taker) return;
      q.vx = q.vy = 0; q.slide = 0; q.stun = 0; q.dive = 0;
      if (q.role === 'GK') { if (tm.idx !== team) { q.x = W / 2; q.y = gy + (team === 0 ? 10 : -10); } return; }
      const k = i++; q.x = 110 + (k * 53) % (W - 220); q.y = team === 0 ? PA_D + 34 + (k % 3) * 18 : H - PA_D - 34 - (k % 3) * 18;
    }));
    taker.x = W / 2; taker.y = sy + (team === 0 ? R + 3 : -(R + 3)); taker.face = team === 0 ? -1.57 : 1.57; taker.vx = taker.vy = 0;
    m.pen = { team: team, taker: taker, t: 0, tx: taker.x, ty: taker.y };
    m.charge.shoot = 0; m.charge.pass = 0; give(m, taker); taker.cd = 0;
  }
  function doPen(m, taker) {
    const gk = m.teams[oppIdx(taker.team)].players[0];
    const aim = clamp(rnd() < .5 ? GX0 + 12 + rnd() * 16 : GX1 - 12 - rnd() * 16, GX0 + 6, GX1 - 6);
    doShoot(m, taker, aim, .8, !!taker.user);
  }
  /* التسلل: أول مدافع قبل الأخير (غير الحارس لو الحارس طالع بيتحسب مكانه) */
  function offsideLine(m, team) {
    const ys = m.teams[oppIdx(team)].players.map(q => q.y).sort((a, b) => team === 0 ? a - b : b - a);
    return ys.length > 1 ? ys[1] : ys[0];
  }
  function isOffside(m, p, r) {
    if (!r || r.role === 'GK' || r === p) return null;
    const team = p.team, line = offsideLine(m, team);
    const half = team === 0 ? r.y < H / 2 - 4 : r.y > H / 2 + 4;
    const aheadBall = team === 0 ? r.y < p.y - 8 : r.y > p.y + 8;
    const aheadDef = team === 0 ? r.y < line - 7 : r.y > line + 7;
    return half && aheadBall && aheadDef ? { line: line, ry: r.y, rx: r.x, team: team, rid: r.id } : null;
  }
  function recHist(m) {
    const f = { b: [m.ball.x, m.ball.y, m.ball.z], r: [m.ref.x, m.ref.y], p: [] };
    for (let i = 0; i < 2; i++) { const ps = m.teams[i].players; for (let j = 0; j < ps.length; j++) { const q = ps[j]; f.p.push(q.id, q.x, q.y, q.vx, q.vy); } }
    m.hist.push(f); m.histN++; if (m.hist.length > 100) m.hist.shift();
  }
  function callOffside(m, r, off) {
    sfx(m, 'whistle'); say(m, 'تسلل!', 'foul'); m.freeze = 1.5; m.cnt.off++; m.offs[r.team]++;
    m.ref.focus = { x: r.x, y: r.y, t: 2 };
    const b = m.ball; b.vx = b.vy = 0; b.z = 0; b.shot = null; b.pass = null;
    recHist(m);
    let frames = m.hist.slice(), pi = clamp(frames.length - 1 - (m.histN - off.hi), 0, frames.length - 1);
    const st0 = Math.max(0, pi - 34); frames = frames.slice(st0); pi -= st0;
    let did = -1, bd = 1e9; m.teams[oppIdx(r.team)].players.forEach(q => { const d = Math.abs(q.y - off.line); if (d < bd) { bd = d; did = q.id; } });
    m.var = { frames: frames, pass: pi, info: { line: off.line, ry: off.ry, rx: off.rx, team: off.team, rid: off.rid, did: did } }; m.varId++;
    const defT = m.teams[oppIdx(r.team)];
    const tk = nearestTo(defT.players.filter(q => q.role !== 'GK'), r.x, r.y);
    if (tk) { if (!tk.user || m.isGK === false) { tk.x = clamp(r.x, 20, W - 20); tk.y = clamp(r.y, 40, H - 40); } give(m, tk); tk.cd = 0; }
    m.restartHold = .9;
  }
  function stepRef(m, dt) {
    const r = m.ref, b = m.ball; let tx, ty;
    if (r.focus && r.focus.t > 0) { r.focus.t -= dt; tx = r.focus.x + 42; ty = r.focus.y + 48; }
    else if (m.pen) { tx = W / 2 + 150; ty = m.pen.team === 0 ? 230 : H - 230; }
    else { tx = b.x + (b.x < W / 2 ? 80 : -80); ty = b.y + 95; }
    moveToward(r, clamp(tx, 40, W - 40), clamp(ty, 50, H - 50), 120, dt, .12); advance(r, dt);
    if (r.card) { r.card.t -= dt; if (r.card.t <= 0) r.card = null; }
  }

  /* ====== خطوة المحاكاة ====== */
  function step(m, dt, inp) {
    if (m.over) return;
    m.input = inp;
    if (m.banner) { m.banner.t -= dt; if (m.banner.t <= 0) m.banner = null; }
    if (m.flash > 0) m.flash -= dt * 1.6;
    if (m.shake > 0) m.shake -= dt * 3;
    stepFx(m, dt);
    if (m.phase !== 'play') {
      m.phaseT -= dt;
      /* في الاحتفال/البداية: اللاعيبة بتروح مكانها */
      m.teams.forEach(t => t.players.forEach(p => { if (m.phase === 'kickoff' || m.phase === 'ht') { const s = shapeTarget(m, t, p); moveToward(p, p.user && !m.isGK ? p.x : s[0], p.user && !m.isGK ? p.y : s[1], 140, dt, .12); advance(p, dt); } }));
      if (m.phase === 'goal') { m.cele && celebrate(m, dt); }
      if (m.phaseT <= 0) {
        if (m.phase === 'goal') { m.phase = 'kickoff'; m.phaseT = 1.3; placeAll(m, m.kickTeam); sfx(m, 'whistle'); say(m, 'إعادة الإرسال', ''); }
        else if (m.phase === 'ht') { m.phase = 'kickoff'; m.phaseT = 1.1; placeAll(m, 1); say(m, 'الشوط التاني', ''); sfx(m, 'whistle'); }
        else if (m.phase === 'kickoff') { m.phase = 'play'; }
        else if (m.phase === 'ft') { m.over = true; }
      }
      if (m.phase !== 'play') return;
    }
    m.t += dt;
    if (m.half === 1 && m.t >= MATCH_SECONDS / 2) { m.half = 2; m.phase = 'ht'; m.phaseT = 2.4; say(m, 'نهاية الشوط الأول', 'big'); sfx(m, 'whistle'); return; }
    if (m.t >= MATCH_SECONDS) { m.t = MATCH_SECONDS; m.phase = 'ft'; m.phaseT = 1.4; say(m, 'نهاية المباراة', 'big'); sfx(m, 'whistle'); return; }
    if (m.freeze > 0) { m.freeze -= dt; stepRef(m, dt); return; }
    if (m.restartHold > 0) m.restartHold -= dt;
    adaptTeams(m); stepRef(m, dt);
    if (++m.hc % 3 === 0) recHist(m);
    const b = m.ball, user = m.user;

    /* ـ فريقين ـ */
    m.teams.forEach(t => {
      const opp = m.teams[oppIdx(t.idx)];
      /* أقرب لاعيبة للضغط على الكرة */
      let chasers = [];
      if (m.poss !== t.idx) {
        const tgt = m.carrier || b;
        const list = t.players.filter(p => p.role !== 'GK' && !(p.user)).sort((a, c) => dist(a, tgt) - dist(c, tgt));
        chasers = list.slice(0, (m.carrier ? (t.sty.press > 1.05 ? 2 : 1) : 2));
        if (t.idx === 0 && m.userRole === 'DF' && m.carrier && m.carrier.team === 1) chasers = chasers.slice(0, 1);
      }
      t.players.forEach(p => {
        if (p.cd > 0) p.cd -= dt; if (p.tcd > 0) p.tcd -= dt; if (p.call > 0) p.call -= dt;
        if (p.slide > 0) { p.slide -= dt; const k = Math.max(0, p.slide / p.sdur), v = 40 + 250 * k; p.vx = Math.cos(p.sa) * v; p.vy = Math.sin(p.sa) * v; advance(p, dt); return; }
        if (m.pen && p.role !== 'GK') {
          const pn = m.pen;
          if (p === pn.taker) {
            if (p.user) userStep(m, p, Object.assign({}, inp, { pass: false, sprint: false }), dt);
            else if (pn.t > 1.4 && m.carrier === p) doPen(m, p);
            if (p.user && pn.t > 8 && m.carrier === p) doPen(m, p);
            p.x = pn.tx; p.y = pn.ty; p.vx = p.vy = 0; return;
          }
          p.vx = p.vy = 0; return;
        }
        if (p.user) { userStep(m, p, inp, dt); advance(p, dt); return; }
        if (p.role === 'GK') { aiKeeper(m, t, p, dt); advance(p, dt); return; }
        if (p.stun > 0) { p.stun -= dt; p.vx *= .8; p.vy *= .8; advance(p, dt); return; }
        const spd = p.spd * (t.sty.press > 1 ? 1.03 : 1);
        if (m.carrier === p) { aiCarrier(m, p, dt); moveToward(p, p.tx, p.ty, spd * .92, dt, .16); }
        else if (m.carrier && m.carrier.team === t.idx) {
          /* دعم الحامل: تحركات للأمام */
          const s = shapeTarget(m, t, p); let tx = s[0], ty = s[1];
          if (p.role === 'FW') ty += t.dir * 36; else if (p.role === 'MF' && p.ay > .35) ty += t.dir * 14;
          moveToward(p, tx, ty, spd * .9, dt, .14);
        } else if (chasers.indexOf(p) > -1) {
          const tgt = m.carrier || b, lead = m.carrier ? .15 : .35;
          const tx = tgt.x + (tgt.vx || 0) * lead, ty = tgt.y + (tgt.vy || 0) * lead;
          moveToward(p, tx, ty, spd, dt, .18);
          if (m.carrier && m.carrier.team !== t.idx && p.tcd <= 0 && dist(p, m.carrier) < 26 && m.restartHold <= 0) tackleTry(m, p, false);
        } else if (!m.carrier && b.pass && b.pass.to === p) {
          moveToward(p, b.x + b.vx * .25, b.y + b.vy * .25, spd, dt, .2);
        } else { const s = shapeTarget(m, t, p); moveToward(p, s[0], s[1], spd * .85, dt, .12); }
        advance(p, dt);
      });
    });
    if (m.pen) { m.pen.t += dt; if (m.ball.shot || m.pen.t > 14 || !m.pen.taker) m.pen = null; }
    /* مباعدة بسيطة بين اللاعيبة */
    const all = m.teams[0].players.concat(m.teams[1].players);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], c = all[j], dx = c.x - a.x, dy = c.y - a.y, d2 = dx * dx + dy * dy;
      if (d2 < 24 * 24 && d2 > .01) { const d = Math.sqrt(d2), push = (24 - d) * .22, nx = dx / d, ny = dy / d; if (!a.user || m.isGK === false) { a.x -= nx * push; a.y -= ny * push; } c.x += nx * push; c.y += ny * push; }
    }
    ballStep(m, dt);
    /* تقدّم الساعة والـ"assist" المنتهي */
    if (m.lastPass && m.t - m.lastPass.t > 8) m.lastPass = null;
  }

  /* ====== الكرة ====== */
  function ballStep(m, dt) {
    const b = m.ball, c = m.carrier;
    if (c) {
      /* الكرة مع الحامل */
      const f = c.face, tx = c.x + Math.cos(f) * (R + 3), ty = c.y + Math.sin(f) * (R + 3);
      b.x += (tx - b.x) * .55; b.y += (ty - b.y) * .55; b.z = 0; b.vx = c.vx; b.vy = c.vy;
      if (c.role === 'GK') { b.x = c.x; b.y = c.y + (c.team === 0 ? -14 : 14); }
      return;
    }
    const px = b.x, py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.z > 0 || b.vz > 0) { b.z += b.vz * dt; b.vz -= 520 * dt; if (b.z <= 0) { b.z = 0; b.vz = Math.abs(b.vz) > 60 ? -b.vz * .4 : 0; } }
    const fr = Math.pow(b.z > 2 ? .9985 : .985, dt * 60); b.vx *= fr; b.vy *= fr;
    if (Math.abs(b.vx) + Math.abs(b.vy) < 6) { b.vx = b.vy = 0; if (b.shot) b.shot = null; }
    if (b.shot && Math.hypot(b.vx, b.vy) < 200) b.shot = null;
    if (b.pass && m.t - b.pass.t > 3) b.pass = null;

    /* حراس: تصدي */
    const gks = [m.teams[0].players[0], m.teams[1].players[0]];
    for (let gi = 0; gi < 2; gi++) {
      const gk = gks[gi], t = m.teams[gi];
      if (m.carrier === gk) continue;
      const reach = (gk.dive > 0 || gk.stun > 0 && gk.dive <= 0 ? 0 : 0) + (gk.dive > 0 ? 50 : 26) + (gi === 1 ? t.q * 10 + (gk.star ? 5 + gk.star.b * 6 : 0) : 6);
      if (b.shot && b.shot.team !== gi && b.z < 38 && dist(gk, b) < reach && gk.stun <= 0) {
        const sp = Math.hypot(b.vx, b.vy), hold = sp < 560 + (gi === 1 ? t.q * 160 : 120) && rnd() < (gi === 1 ? .55 + t.q * .35 : .78);
        /* حارس بيتصدّى */
        const sh = b.shot; b.shot = null;
        if (gi === 1) { m.teams[1].saves++; }
        if (gk.user) { m.u.saves++; say(m, 'تصدي رائع!', 'save'); }
        else if (gi === 1 && sh.by && sh.by.user) say(m, 'الحارس تصدّى!', 'bad');
        sfx(m, 'save'); m.flash = Math.max(m.flash, .0);
        if (hold) { give(m, gk); gk.hold = 0; } else { b.vx = -b.vx * .3 + gauss() * 160; b.vy = -b.vy * .35; b.vz = 80; b.lastTeam = gi; b.lastP = gk; gk.cd = .5; }
        return;
      }
    }
    /* التقاط الكرة الحرة / اعتراض التمريرات */
    const sp = Math.hypot(b.vx, b.vy);
    if (b.z < 22) {
      let best = null, bd = 1e9;
      m.teams.forEach(t => t.players.forEach(p => {
        if (p.cd > 0 || p.stun > 0 || (p.role === 'GK' && !(Math.abs(p.y - b.y) < 60 && Math.abs(p.x - W / 2) < 200))) return;
        const d = dist(p, b), rad = R + BR + (p.user ? 6 : 2);
        if (d < rad && d < bd) { bd = d; best = p; }
      }));
      if (best) {
        const isRecv = b.pass && b.pass.to === best, mate = b.lastTeam === best.team;
        const fast = sp > 470;
        const t = m.teams[best.team];
        const chance = best.user ? (fast ? .8 : 1) : mate ? (isRecv ? .93 : fast ? .5 : .9) : (b.pass || b.shot ? .32 + t.q * .3 : .75);
        if (b.pass && b.pass.off && mate && b.pass.to === best) { const off = b.pass.off; b.pass = null; callOffside(m, best, off); return; }
        if (rnd() < chance) {
          if (!mate && b.pass) { if (best.team === 0 && m.userRole !== 'GK' && best.user) m.u.intercepts++; if (b.pass.from && b.pass.from.user) say(m, 'تمريرتك اتقطعت', 'bad'); }
          if (b.pass && b.pass.from && b.pass.from.user && mate && b.pass.to === best) m.u.passOk++;
          if (b.shot && !mate) { /* التقاط تسديدة من الدفاع = تشتيت */ }
          give(m, best); b.pass = null;
          if (best.user) sfx(m, 'touch');
        } else { b.vx *= -.4 + gauss() * .3; b.vy *= .6; b.lastTeam = best.team; best.cd = .25; }
      }
    }
    /* حدود الملعب والأهداف */
    const goalHeight = 38;
    if (b.y <= 0 && py > 0) {
      if (b.x > GX0 && b.x < GX1 && b.z < goalHeight) return goal(m, 0, b.shot);
      outGoalLine(m, 0);
    } else if (b.y >= H && py < H) {
      if (b.x > GX0 && b.x < GX1 && b.z < goalHeight) return goal(m, 1, b.shot);
      outGoalLine(m, 1);
    } else if (b.x < 0 || b.x > W) outSide(m);
  }
  function outSide(m) {
    const b = m.ball, team = oppIdx(b.lastTeam), t = m.teams[team];
    b.x = clamp(b.x, 14, W - 14); b.y = clamp(b.y, 40, H - 40);
    const tk = nearestTo(t.players.filter(p => p.role !== 'GK'), b.x, b.y);
    if (!tk.user || m.isGK === false) { tk.x = b.x; tk.y = b.y; }
    give(m, tk); m.restartHold = .8; m.ball.pass = null;
  }
  function outGoalLine(m, end) {          /* end 0 = المرمى اللي فوق (مرمى المنافس) */
    const b = m.ball, defTeam = end === 0 ? 1 : 0, t = m.teams[defTeam], gk = t.players[0];
    b.vx = b.vy = 0; b.z = 0; b.shot = null; b.pass = null;
    if (b.lastTeam === defTeam) {
      /* آخر لمسة للمدافعين = ركنية للمهاجمين (مبسّطة: تتنفّذ فورًا) */
      const at = m.teams[oppIdx(defTeam)], cx = b.x < W / 2 ? 20 : W - 20, cy = end === 0 ? 24 : H - 24;
      const tk = nearestTo(at.players.filter(p => p.role !== 'GK' && !p.user), cx, cy);
      if (tk) { tk.x = cx; tk.y = cy; give(m, tk); m.restartHold = 1; say(m, 'ركنية', ''); }
    } else {
      gk.x = W / 2; gk.y = end === 0 ? 40 : H - 40; give(m, gk); gk.hold = 0; m.restartHold = .6;
    }
  }
  function goal(m, end, shot) {
    /* end 0: دخل المرمى الأعلى = جول للفريق 0 (لاعبنا) */
    const scoringTeam = end === 0 ? 0 : 1, b = m.ball, scorer = (shot && shot.by) || b.lastP;
    m.score[scoringTeam]++;
    try { if (root.navigator && navigator.vibrate) navigator.vibrate(scoringTeam === 0 ? [60, 40, 90] : 40); } catch (e) { /* ignore */ }
    const mn = minute(m);
    b.vx = b.vy = 0; b.z = 0; b.hidden = false; b.shot = null; m.carrier = null; m.poss = -1;
    m.phase = 'goal'; m.phaseT = 2.7; m.kickTeam = oppIdx(scoringTeam); m.flash = 1; m.shake = 1;
    m.cele = { team: scoringTeam, scorer: scorer, t: 0, mine: false };
    if (scoringTeam === 0) {
      if (scorer && scorer.user) { m.u.goals++; m.cele.mine = true; m.timeline.push({ m: mn, t: 'goal' }); say(m, 'جووووول! ' + (m.o.playerName || ''), 'goal'); }
      else {
        m.timeline.push({ m: mn, t: 'tg' });
        if (m.lastPass && m.lastPass.p.user && m.lastPass.to === scorer && m.t - m.lastPass.t < 6.5) { m.u.assists++; m.timeline.push({ m: mn, t: 'assist' }); m.cele.assist = true; say(m, 'جووول! وإنت صنعته', 'goal'); }
        else say(m, 'جوووول لـ' + m.teams[0].name, 'goal');
      }
    } else { m.timeline.push({ m: mn, t: 'og' }); m.u.concededOnWatch++; say(m, 'جول لـ' + m.teams[1].name, 'bad'); }
    sfx(m, scoringTeam === 0 ? 'goalMine' : 'goalOpp');
    burst(m, b.x, b.y < H / 2 ? 30 : H - 30, scoringTeam === 0 ? '#24e982' : '#f6c445', m.lowFx ? 18 : 60);
    m.lastPass = null;
  }
  function celebrate(m, dt) {
    const c = m.cele; c.t += dt; const sc = c.scorer; if (!sc) return;
    /* اللاعب اللي سجل بيجري ويحتفل */
    if (c.t < 1.8) { sc.vx += ((sc.x < W / 2 ? 1 : -1) * 120 - sc.vx) * .1; sc.vy += ((sc.team === 0 ? -1 : 1) * -60 - sc.vy) * .08; advance(sc, dt); }
  }

  /* ====== جسيمات ====== */
  function burst(m, x, y, col, n) { for (let i = 0; i < n; i++) { const a = rnd() * 6.283, v = 60 + rnd() * 260; m.fx.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 1 + rnd() * .8, c: col, s: 2 + rnd() * 3 }); } }
  function stepFx(m, dt) { for (let i = m.fx.length - 1; i >= 0; i--) { const f = m.fx[i]; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 260 * dt; f.life -= dt; if (f.life <= 0) m.fx.splice(i, 1); } }

  /* ====== تقييم أداء اللاعب (من 1 لـ 5 زي إنجن المسيرة) ====== */
  function summarize(m) {
    const u = m.u, pos = m.userRole, my = m.score[0], op = m.score[1];
    let r = 3.0;
    r += Math.min(u.goals, 3) * .62 + Math.min(u.assists, 3) * .42;
    if (u.passes > 2) r += (u.passOk / u.passes - .7) * .9;
    r += (u.tackles * (pos === 'DF' ? .16 : pos === 'MF' ? .12 : .06)) + Math.min(u.intercepts, 4) * .05;
    r -= Math.max(0, u.shots - u.onTarget - u.goals) * .04;
    r += my > op ? .3 : my < op ? -.3 : 0;
    if (pos === 'GK') { r += Math.min(u.saves, 8) * .16 - Math.max(0, op - 1) * .12 + (op === 0 ? .55 : 0); }
    else if (pos === 'DF') { r += op === 0 ? .5 : -Math.max(0, op - 1) * .12; }
    else if (pos === 'MF' && op === 0) r += .12;
    r -= u.yellow * .1 + Math.max(0, u.fouls - 1) * .04 + u.red * 1.0;
    r = clamp(r + (m.o.ovr - 70) / 250, 1, 5);
    return { goals: u.goals, assists: u.assists, saves: m.isGK ? u.saves : 0, ourGoals: my, oppGoals: op, rating: Math.round(r * 10) / 10, yellow: u.yellow, red: u.red, timeline: m.timeline.slice(),
      detail: { off: m.cnt.off, foul: m.cnt.foul, cy: m.cnt.y, cr: m.cnt.r, pen: m.cnt.pen, shots: u.shots, onTarget: u.onTarget, passes: u.passes, passOk: u.passOk, tackles: u.tackles, fouls: u.fouls, intercepts: u.intercepts } };
  }

  /* اختبار من غير شاشة: اللاعب بيتحكم فيه الذكاء الاصطناعي (للضبط والفحص) */
  function autoInput(m) {
    const p = m.user, b = m.ball, inp = { mx: 0, my: 0, shoot: false, pass: false, sprint: false, passPress: false, actPress: false };
    if (m.isGK) { const dx = b.x - p.x; inp.mx = clamp(dx / 80, -1, 1); inp.my = clamp((H - 40 - p.y) / 60, -1, 1); if (b.shot && b.vy > 0 && rnd() < .08) inp.actPress = true; if (m.carrier === p && p.hold > 1) inp.pass = true; return inp; }
    if (m.carrier === p) {
      const gy = 0, dg = Math.hypot(W / 2 - p.x, p.y - gy);
      inp.mx = clamp((W / 2 - p.x) / 120, -1, 1); inp.my = -1;
      if (dg < 300) { m.charge.shoot = Math.min(1, m.charge.shoot + .02); inp.shoot = m.charge.shoot < .7; }
    } else { const t = m.carrier || b; inp.mx = clamp((t.x - p.x) / 80, -1, 1); inp.my = clamp((t.y - p.y) / 80, -1, 1); if (m.carrier && m.carrier.team === 1 && dist(p, m.carrier) < 30 && rnd() < .1) inp.actPress = true; }
    return inp;
  }
  function simulateAll(o) {
    const m = createMatch(o); let guard = 0;
    while (!m.over && guard++ < 60 * 400) step(m, DT, autoInput(m));
    return { m: m, res: summarize(m) };
  }

  /* ═════════════════════════════════════════════════════════════════════════
     2) الرسم: ملعب مرسوم مسبقًا + لاعيبة بظلال + كرة + احتفال
     ═════════════════════════════════════════════════════════════════════════ */
  function buildPitchLayer(rs) {
    const c = document.createElement('canvas'); c.width = Math.round((W + M * 2) * rs); c.height = Math.round((H + M * 2) * rs);
    const g = c.getContext('2d'); g.scale(rs, rs); g.translate(M, M);
    /* المدرجات */
    const sg = g.createLinearGradient(-M, 0, 0, 0); sg.addColorStop(0, '#0a0f0d'); sg.addColorStop(1, '#16201b');
    g.fillStyle = '#0b100e'; g.fillRect(-M, -M, W + M * 2, H + M * 2);
    for (let side = 0; side < 4; side++) {
      g.save();
      const cols = ['#2b3a33', '#1f6b4a', '#3a2f55', '#6b3a2e', '#2d4f6b', '#8a7a3a', '#444'];
      for (let i = 0; i < 1100; i++) {
        let x, y; const d = rnd() * (M - 16);
        if (side === 0) { x = rnd() * (W + M * 2) - M; y = -M + d; } else if (side === 1) { x = rnd() * (W + M * 2) - M; y = H + M - d; } else if (side === 2) { x = -M + d; y = rnd() * (H + M * 2) - M; } else { x = W + M - d; y = rnd() * (H + M * 2) - M; }
        g.fillStyle = cols[Math.floor(rnd() * cols.length)]; g.globalAlpha = .35 + rnd() * .4; g.beginPath(); g.arc(x, y, 2.4 + rnd() * 1.8, 0, 6.283); g.fill();
      }
      g.restore();
    }
    /* لوحات الإعلانات */
    g.globalAlpha = 1; g.fillStyle = '#0d1512'; g.fillRect(-14, -14, W + 28, H + 28);
    g.fillStyle = '#24e982'; g.font = '800 11px Cairo, sans-serif'; g.textAlign = 'center';
    for (let x = 40; x < W; x += 170) { g.fillText('KORA CHALLENGE', x, -4); g.fillText('KORA CHALLENGE', x + 85, H + 11); }
    /* العشب بخطوط */
    const stripes = 14, sh = H / stripes;
    for (let i = 0; i < stripes; i++) { g.fillStyle = i % 2 ? '#1b7a43' : '#1e8548'; g.fillRect(-6, i * sh, W + 12, sh + 1); }
    const rg = g.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, H * .75); rg.addColorStop(0, 'rgba(255,255,255,.05)'); rg.addColorStop(1, 'rgba(0,0,0,.28)');
    g.fillStyle = rg; g.fillRect(-6, -6, W + 12, H + 12);
    /* الخطوط */
    g.strokeStyle = 'rgba(255,255,255,.88)'; g.lineWidth = 3.2; g.lineJoin = 'round';
    g.strokeRect(0, 0, W, H);
    g.beginPath(); g.moveTo(0, H / 2); g.lineTo(W, H / 2); g.stroke();
    g.beginPath(); g.arc(W / 2, H / 2, 92, 0, 6.283); g.stroke(); g.beginPath(); g.arc(W / 2, H / 2, 4, 0, 6.283); g.fillStyle = '#fff'; g.fill();
    [0, 1].forEach(e => {
      const y0 = e ? H : 0, dir = e ? -1 : 1;
      g.strokeRect((W - PA_W) / 2, e ? H - PA_D : 0, PA_W, PA_D); g.strokeRect((W - SA_W) / 2, e ? H - SA_D : 0, SA_W, SA_D);
      g.beginPath(); g.arc(W / 2, y0 + dir * 118, 3, 0, 6.283); g.fill();
      g.beginPath(); g.arc(W / 2, y0 + dir * 118, 92, e ? 3.78 : .64, e ? 5.65 : 2.5); g.stroke();
      /* المرمى (شبكة بعمق 3D) */
      g.save(); g.fillStyle = 'rgba(255,255,255,.1)'; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1;
      const gd = 34, gy0 = e ? H : -gd; g.fillRect(GX0, gy0, GW, gd);
      for (let x = GX0; x <= GX1; x += 9) { g.beginPath(); g.moveTo(x, gy0); g.lineTo(x, gy0 + gd); g.stroke(); }
      for (let y = 0; y <= gd; y += 9) { g.beginPath(); g.moveTo(GX0, gy0 + y); g.lineTo(GX1, gy0 + y); g.stroke(); }
      g.strokeStyle = '#fff'; g.lineWidth = 4; g.beginPath(); g.moveTo(GX0, y0); g.lineTo(GX0, gy0 + (e ? gd : 0)); g.lineTo(GX1, gy0 + (e ? gd : 0)); g.lineTo(GX1, y0); g.stroke();
      g.restore();
    });
    [[0, 0, 0, 1.57], [W, 0, 1.57, 3.14], [0, H, -1.57, 0], [W, H, 3.14, 4.71]].forEach(a => { g.beginPath(); g.arc(a[0], a[1], 14, a[2], a[3]); g.stroke(); });
    /* إضاءة الكشافات في الأركان */
    [[-M, -M], [W + M, -M], [-M, H + M], [W + M, H + M]].forEach(p => { const r = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], 360); r.addColorStop(0, 'rgba(255,255,230,.28)'); r.addColorStop(1, 'rgba(255,255,230,0)'); g.fillStyle = r; g.fillRect(-M, -M, W + M * 2, H + M * 2); });
    return c;
  }

  /* ألوان مشتقة (تتخزن مرة واحدة لكل لون) */
  const _shade = {};
  function shade(c, f) {
    const k = c + f; if (_shade[k]) return _shade[k];
    let r = 128, g2 = 128, b = 128;
    if (/^#[0-9a-f]{6}$/i.test(c)) { r = parseInt(c.substr(1, 2), 16); g2 = parseInt(c.substr(3, 2), 16); b = parseInt(c.substr(5, 2), 16); }
    const t = f < 0 ? 0 : 255, a = Math.abs(f);
    return (_shade[k] = 'rgb(' + Math.round(r + (t - r) * a) + ',' + Math.round(g2 + (t - g2) * a) + ',' + Math.round(b + (t - b) * a) + ')');
  }
  let _drawT = 0, _drawDt = .016;

  /* لاعب بجسم خفيف: رأس + قميص + شورت + أرجل وأذرع بحركة جري — شكل كرتوني واضح */
  function drawPlayer(g, p, col, isUser, fx, m) {
    const x = p.x, y = p.y, isGK = p.role === 'GK';
    const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    p._ph = (p._ph || 0) + sp * .05 * _drawDt;
    const run = Math.min(1, sp / 150), sw = Math.sin(p._ph) * run;       // -1..1 تأرجح الجري
    const isRef = !!p.ref;
    const jersey = isRef ? '#14171c' : isGK ? (p.team === 0 ? '#f6c445' : '#e87bd1') : col;
    const dark = shade(jersey, -.35), light = isRef ? '#ffffff' : shade(jersey, .3);
 
