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
      u: { goals: 0, assists: 0, saves: 0, shots: 0, onTarget: 0, passes: 0, passOk: 0, tackles: 0, tackleTry: 0, fouls: 0, yellow: 0, intercepts: 0, concededOnWatch: 0 }
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
      if (inp && inp.actPress && p.tcd <= 0) tackleTry(m, p, true);
    }
  }
  function gkThrow(m, p, mx, my, power) {
    const r = bestPass(m, p, mx, my, true) || m.teams[0].players[3];
    doPass(m, p, r, power, true, false);
  }

  /* ====== الافتكاك ====== */
  function tackleTry(m, p, isUser) {
    const c = m.carrier; p.tcd = isUser ? .85 : .75;
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
    } else if (isUser && rnd() < .28) {
      /* فاول */
      m.u.fouls++; say(m, 'فاول!', 'foul'); sfx(m, 'whistle');
      if (m.u.fouls >= 3 && !m.u.yellow) { m.u.yellow = 1; say(m, 'كارت أصفر', 'foul'); }
      m.restartHold = .8; give(m, c); c.cd = 0; p.stun = .5;
    } else p.stun = .25;
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
    if (m.restartHold > 0) m.restartHold -= dt;
    adaptTeams(m);
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
    r -= u.yellow * .1 + Math.max(0, u.fouls - 1) * .04;
    r = clamp(r + (m.o.ovr - 70) / 250, 1, 5);
    return { goals: u.goals, assists: u.assists, saves: m.isGK ? u.saves : 0, ourGoals: my, oppGoals: op, rating: Math.round(r * 10) / 10, yellow: u.yellow, timeline: m.timeline.slice(),
      detail: { shots: u.shots, onTarget: u.onTarget, passes: u.passes, passOk: u.passOk, tackles: u.tackles, fouls: u.fouls, intercepts: u.intercepts } };
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
    const jersey = isGK ? (p.team === 0 ? '#f6c445' : '#e87bd1') : col;
    const dark = shade(jersey, -.35), light = shade(jersey, .3);
    const short = isGK ? '#1d2230' : (p.team === 0 ? '#f4f6f8' : '#1b2330');
    const skin = '#f0c9a3';
    const fcx = Math.cos(p.face), fsy = Math.sin(p.face), back = fsy < -.35;
    /* ظل */
    if (fx) { g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(x, y + 5, 11, 4.2, 0, 0, 6.283); g.fill(); }
    g.save(); g.translate(x, y + 4);
    if (p.dive > 0) { g.translate(0, -8); g.rotate(p.vx >= 0 ? 1.25 : -1.25); g.translate(0, 8); }
    else if (p.stun > 0 && isGK) { g.translate(0, -3); g.rotate(p.vx >= 0 ? .9 : -.9); }
    g.lineCap = 'round'; g.lineJoin = 'round';
    /* الأرجل */
    const ls = sw * 7.5, bend = run * 1.5;
    g.lineWidth = 4.4;
    g.strokeStyle = skin; g.beginPath(); g.moveTo(-3, -11); g.lineTo(-3 - ls * .35, -5 - Math.max(0, -sw) * bend); g.moveTo(3, -11); g.lineTo(3 + ls * .35, -5 - Math.max(0, sw) * bend); g.stroke();
    g.strokeStyle = jersey; g.lineWidth = 4.9;                                   // الشرابات بلون الفريق
    g.beginPath(); g.moveTo(-3 - ls * .35, -6.2); g.lineTo(-3 - ls, -.6 - Math.max(0, -sw) * bend); g.moveTo(3 + ls * .35, -6.2); g.lineTo(3 + ls, -.6 - Math.max(0, sw) * bend); g.stroke();
    g.fillStyle = '#15191f';
    g.beginPath(); g.ellipse(-3 - ls, .6 - Math.max(0, -sw) * bend, 3.4, 2, 0, 0, 6.283); g.ellipse(3 + ls, .6 - Math.max(0, sw) * bend, 3.4, 2, 0, 0, 6.283); g.fill();
    /* الشورت */
    g.fillStyle = short; g.beginPath(); g.moveTo(-6.6, -18); g.lineTo(6.6, -18); g.lineTo(7.2, -10); g.lineTo(-7.2, -10); g.closePath(); g.fill();
    /* الذراعين (عكس الرجلين) */
    const as = p.dive > 0 ? 0 : -sw * 6, up = p.dive > 0 || (isGK && p.hold > 0);
    g.lineWidth = 3.6; g.strokeStyle = jersey;
    g.beginPath();
    if (up) { g.moveTo(-8, -27); g.lineTo(-11, -38); g.moveTo(8, -27); g.lineTo(11, -38); }
    else { g.moveTo(-8, -27); g.lineTo(-10 - as * .25, -19 + as * .6); g.moveTo(8, -27); g.lineTo(10 + as * .25, -19 - as * .6); }
    g.stroke();
    g.fillStyle = isGK ? '#fff' : skin;
    const hr = isGK ? 3 : 2.2;
    g.beginPath();
    if (up) { g.arc(-11, -39, hr, 0, 6.283); g.moveTo(14, -39); g.arc(11, -39, hr, 0, 6.283); }
    else { g.arc(-10 - as * .25, -18 + as * .6, hr, 0, 6.283); g.moveTo(10 + as * .25 + hr, -18 - as * .6); g.arc(10 + as * .25, -18 - as * .6, hr, 0, 6.283); }
    g.fill();
    /* القميص */
    g.fillStyle = jersey; g.beginPath(); g.moveTo(-8.4, -28); g.quadraticCurveTo(0, -31.5, 8.4, -28); g.lineTo(6.8, -15.5); g.lineTo(-6.8, -15.5); g.closePath(); g.fill();
    g.fillStyle = dark; g.beginPath(); g.moveTo(-8.4, -28); g.lineTo(-6.8, -15.5); g.lineTo(-4.2, -15.5); g.lineTo(-5.6, -28.6); g.closePath(); g.fill();
    g.fillStyle = light; g.fillRect(-1.2, -28.6, 2.4, 12.4);                      // شريط القميص
    /* الرأس */
    const hx = fcx * 1.6;
    g.fillStyle = skin; g.beginPath(); g.arc(hx, -35.5, 5.4, 0, 6.283); g.fill();
    g.fillStyle = isGK ? '#2c2c2c' : '#2a1d14';
    g.beginPath();
    if (back) g.arc(hx, -35.8, 5.5, 0, 6.283);
    else g.arc(hx, -36.6, 5.5, 3.14, 6.283);
    g.fill();
    if (!back) { g.fillStyle = '#1a1a1a'; g.fillRect(hx + fcx * 1.5 - 2.4, -35, 1.4, 1.6); g.fillRect(hx + fcx * 1.5 + 1, -35, 1.4, 1.6); }
    g.restore();
    if (p.star) {
      g.fillStyle = '#f6c445'; g.font = '800 11px Cairo, sans-serif'; g.textAlign = 'center';
      g.lineWidth = 3; g.strokeStyle = 'rgba(0,0,0,.75)'; g.strokeText('★ ' + p.star.name, x, y - 44); g.fillText('★ ' + p.star.name, x, y - 44);
    }
    if (isUser) {
      const t = _drawT;
      g.strokeStyle = '#fff'; g.lineWidth = 2.4; g.beginPath(); g.ellipse(x, y + 5, 15 + Math.sin(t / 160) * 1.5, 6.5, 0, 0, 6.283); g.stroke();
      g.fillStyle = '#24e982'; g.beginPath(); g.moveTo(x, y - 40 + Math.sin(t / 200) * 2); g.lineTo(x - 7, y - 52 + Math.sin(t / 200) * 2); g.lineTo(x + 7, y - 52 + Math.sin(t / 200) * 2); g.closePath(); g.fill();
    }
  }

  function draw(g, m, view, layer, fxOn) {
    const sc = view.scale, cam = view.cam;
    const nowT = performance.now(); _drawDt = Math.min(.05, Math.max(.004, (nowT - (_drawT || nowT)) / 1000)); _drawT = nowT;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#050807'; g.fillRect(0, 0, view.cw, view.ch);
    const shake = m.shake > 0 ? (Math.random() - .5) * 8 * m.shake : 0;
    g.setTransform(sc * view.dpr, 0, 0, sc * view.dpr, (view.cw / 2 - cam.x * sc + shake) * view.dpr, (view.ch / 2 - cam.y * sc + shake) * view.dpr);
    g.drawImage(layer, -M, -M, W + M * 2, H + M * 2);
    /* تلميح التمرير (الزميل الأنسب) */
    const u = m.user;
    if (!m.isGK && m.carrier === u && m.phase === 'play') {
      const inp = m.input || {}, r = bestPass(m, u, inp.mx || 0, inp.my || 0, true);
      if (r) { g.strokeStyle = 'rgba(255,255,255,.55)'; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(r.x, r.y); g.stroke(); g.setLineDash([]); g.strokeStyle = '#24e982'; g.beginPath(); g.arc(r.x, r.y, R + 5, 0, 6.283); g.stroke(); }
      if (m.charge.shoot > .02 || (inp.shoot)) { const aim = W / 2 + (inp.mx || 0) * 70; g.strokeStyle = 'rgba(255,200,60,.8)'; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(u.x, u.y); g.lineTo(aim, 0); g.stroke(); g.setLineDash([]); }
    }
    /* ترتيب الرسم من فوق لتحت (إحساس العمق) */
    const list = m.teams[0].players.concat(m.teams[1].players).sort((a, b) => a.y - b.y);
    const b = m.ball;
    let ballDrawn = false;
    const drawBall = () => {
      if (ballDrawn) return; ballDrawn = true;
      const hz = b.z * .55;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(b.x + 3 + b.z * .25, b.y + 4, BR * (1 - Math.min(b.z, 80) / 220), BR * .6, 0, 0, 6.283); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(b.x, b.y - hz - 2, BR + b.z * .015, 0, 6.283); g.fill();
      g.strokeStyle = '#222'; g.lineWidth = 1.4; g.stroke();
      g.fillStyle = '#222'; g.beginPath(); g.arc(b.x - 1.3, b.y - hz - 3, 2.1, 0, 6.283); g.fill();
    };
    const pk = Math.min(1.45, Math.max(1, .62 / sc));     // نكبّر اللاعيبة شوية لما الشاشة صغيرة
    list.forEach(p => {
      if (!ballDrawn && b.y < p.y - 4) drawBall();
      if (pk > 1.02) { g.save(); g.translate(p.x, p.y); g.scale(pk, pk); g.translate(-p.x, -p.y); drawPlayer(g, p, m.teams[p.team].color, p.user, fxOn, m); g.restore(); }
      else drawPlayer(g, p, m.teams[p.team].color, p.user, fxOn, m);
    });
    drawBall();
    /* جسيمات الاحتفال */
    if (fxOn) m.fx.forEach(f => { g.globalAlpha = Math.max(0, Math.min(1, f.life)); g.fillStyle = f.c; g.fillRect(f.x, f.y, f.s, f.s * 1.6); }); g.globalAlpha = 1;
    /* تأثير الفلاش عند الجول */
    g.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    if (m.flash > 0) { g.fillStyle = 'rgba(255,255,255,' + (m.flash * .35) + ')'; g.fillRect(0, 0, view.cw, view.ch); }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     3) الواجهة: شاشة كاملة + جويستيك + أزرار + الصوت + نتيجة الماتش
     ═════════════════════════════════════════════════════════════════════════ */
  const CSS = '.ms-root{position:fixed;inset:0;z-index:100000;background:#050807;color:#fff;font-family:inherit;direction:rtl;touch-action:none;-webkit-user-select:none;user-select:none;overflow:hidden}' +
    '.ms-cv{position:absolute;inset:0;width:100%;height:100%;display:block}' +
    '.ms-top{position:absolute;top:0;left:0;right:0;padding:calc(env(safe-area-inset-top,0px) + 8px) 10px 6px;display:flex;align-items:center;justify-content:space-between;gap:8px;z-index:3;background:linear-gradient(180deg,rgba(0,0,0,.72),transparent)}' +
    '.ms-score{display:flex;align-items:center;gap:8px;background:rgba(16,24,20,.82);border:1px solid rgba(36,233,130,.35);border-radius:14px;padding:5px 12px;box-shadow:0 0 18px rgba(36,233,130,.18)}' +
    '.ms-score b{font-size:1.35rem;letter-spacing:.04em;min-width:48px;text-align:center;font-variant-numeric:tabular-nums}.ms-score span{font-size:.74rem;max-width:84px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#cfe}' +
    '.ms-clock{background:rgba(0,0,0,.55);border-radius:10px;padding:3px 10px;font-weight:800;color:#24e982;font-variant-numeric:tabular-nums;font-size:.95rem;min-width:56px;text-align:center}' +
    '.ms-ibtn{width:40px;height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(16,24,20,.78);color:#fff;font:inherit;font-weight:800;font-size:.8rem;display:grid;place-items:center;cursor:pointer;padding:0}.ms-ibtn svg{width:19px;height:19px}.ms-ibtn.on{border-color:#24e982;color:#24e982}' +
    '.ms-tools{display:flex;gap:6px}' +
    '.ms-banner{position:absolute;left:0;right:0;top:24%;text-align:center;font-weight:900;font-size:clamp(1.6rem,8vw,3rem);text-shadow:0 4px 24px rgba(0,0,0,.9);z-index:4;pointer-events:none;opacity:0;transform:scale(.8)}' +
    '.ms-banner.show{animation:msPop 1.6s ease-out}.ms-banner.goal{color:#24e982;text-shadow:0 0 30px rgba(36,233,130,.8),0 4px 20px #000}.ms-banner.bad{color:#ff8a70}.ms-banner.save{color:#6ec6ff}.ms-banner.big{color:#fff}' +
    '@keyframes msPop{0%{opacity:0;transform:scale(.6)}12%{opacity:1;transform:scale(1.08)}22%{transform:scale(1)}80%{opacity:1}100%{opacity:0;transform:scale(1.04)}}' +
    '.ms-ctrl{position:absolute;left:0;right:0;bottom:0;height:min(42vh,260px);z-index:3;pointer-events:none}' +
    '.ms-joy{position:absolute;left:calc(env(safe-area-inset-left,0px) + 18px);bottom:calc(env(safe-area-inset-bottom,0px) + 22px);width:132px;height:132px;border-radius:50%;background:radial-gradient(circle,rgba(36,233,130,.12),rgba(255,255,255,.05));border:2px solid rgba(36,233,130,.45);pointer-events:auto;touch-action:none}' +
    '.ms-knob{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px 0 0 -28px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#7dffbf,#24e982 55%,#0f8a4e);box-shadow:0 4px 14px rgba(0,0,0,.6)}' +
    '.ms-btns{position:absolute;right:calc(env(safe-area-inset-right,0px) + 14px);bottom:calc(env(safe-area-inset-bottom,0px) + 18px);width:210px;height:170px;pointer-events:none}' +
    '.ms-b{position:absolute;border-radius:50%;border:2px solid rgba(255,255,255,.28);color:#fff;font:inherit;font-weight:900;display:grid;place-items:center;pointer-events:auto;touch-action:none;cursor:pointer;background:rgba(16,24,20,.78);box-shadow:0 4px 16px rgba(0,0,0,.55);text-align:center;line-height:1.1;padding:0}' +
    '.ms-b small{display:block;font-size:.6rem;font-weight:600;opacity:.75}' +
    '.ms-b.a{width:84px;height:84px;right:4px;bottom:6px;background:radial-gradient(circle at 35% 30%,#ffe59a,#f6c445 60%,#b07a14);color:#2a1b00;border-color:#fff3c4;font-size:1rem}' +
    '.ms-b.b{width:68px;height:68px;right:94px;bottom:66px;background:radial-gradient(circle at 35% 30%,#7dffbf,#24e982 60%,#0f8a4e);color:#032312;border-color:#d6ffe9}' +
    '.ms-b.c{width:56px;height:56px;right:106px;bottom:0;font-size:.74rem}' +
    '.ms-b:active,.ms-b.down{transform:scale(.92);filter:brightness(1.15)}.ms-b.off{opacity:.4}' +
    '.ms-pw{position:absolute;right:calc(env(safe-area-inset-right,0px) + 14px);bottom:calc(env(safe-area-inset-bottom,0px) + 196px);width:150px;height:12px;border-radius:99px;background:rgba(0,0,0,.6);border:1px solid rgba(255,255,255,.25);overflow:hidden;z-index:3;opacity:0;transition:opacity .15s}' +
    '.ms-pw.on{opacity:1}.ms-pw i{display:block;height:100%;width:0;background:linear-gradient(90deg,#24e982,#f6c445,#ff6a4d)}' +
    '.ms-stam{position:absolute;left:calc(env(safe-area-inset-left,0px) + 18px);bottom:calc(env(safe-area-inset-bottom,0px) + 160px);width:132px;height:6px;border-radius:9px;background:rgba(0,0,0,.55);overflow:hidden;z-index:3}.ms-stam i{display:block;height:100%;background:#6ec6ff;width:100%}' +
    '.ms-hint{position:absolute;left:12px;right:12px;top:calc(env(safe-area-inset-top,0px) + 62px);text-align:center;font-size:.76rem;color:#cfe;background:rgba(0,0,0,.55);border-radius:10px;padding:5px 10px;z-index:3;pointer-events:none}' +
    '.ms-panel{position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(3,8,6,.82);backdrop-filter:blur(6px)}' +
    '.ms-card{width:100%;max-width:420px;background:linear-gradient(160deg,rgba(24,36,30,.96),rgba(10,16,13,.96));border:1px solid rgba(36,233,130,.4);border-radius:20px;padding:18px;box-shadow:0 0 40px rgba(36,233,130,.15);max-height:92vh;overflow:auto;text-align:center}' +
    '.ms-card h2{margin:0 0 4px;font-size:1.25rem}.ms-card p{margin:4px 0;color:#9fb5a9;font-size:.86rem;line-height:1.7}' +
    '.ms-vs{display:flex;align-items:center;justify-content:center;gap:14px;margin:12px 0;font-weight:800}.ms-vs b{font-size:2.2rem;color:#24e982}' +
    '.ms-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.ms-grid div{background:rgba(255,255,255,.05);border-radius:12px;padding:8px 4px}.ms-grid small{display:block;color:#9fb5a9;font-size:.68rem}.ms-grid b{font-size:1.15rem}' +
    '.ms-act{display:block;width:100%;margin-top:10px;font:inherit;font-weight:800;border-radius:13px;padding:12px;cursor:pointer;border:2px solid #24e982;background:#24e982;color:#04110a}.ms-act.ghost{background:transparent;color:#24e982}' +
    '.ms-opts{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:8px 0}.ms-chip{font:inherit;font-size:.78rem;border-radius:99px;padding:6px 12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);color:#fff;cursor:pointer}.ms-chip.on{border-color:#24e982;color:#24e982;background:rgba(36,233,130,.12)}' +
    '.ms-rate{font-size:2.4rem;font-weight:900;color:#f6c445;margin:6px 0}' +
    '.ms-score{min-width:0;flex:0 1 auto;white-space:nowrap}.ms-clock,.ms-ibtn{flex-shrink:0}' +
    '@media (max-width:380px){.ms-top{padding-left:6px;padding-right:6px;gap:4px}.ms-clock{min-width:44px;padding:3px 6px;font-size:.85rem}.ms-score{padding:4px 8px;gap:5px}.ms-score b{font-size:1rem;min-width:0}.ms-score span{max-width:42px;font-size:.62rem}.ms-ibtn{width:34px;height:34px;border-radius:10px}.ms-tools{gap:4px}}' +
    '@media (max-height:700px) and (orientation:portrait){.ms-joy{width:112px;height:112px;bottom:calc(env(safe-area-inset-bottom,0px) + 16px)}.ms-knob{width:48px;height:48px;margin:-24px 0 0 -24px}.ms-btns{transform:scale(.8);transform-origin:100% 100%;bottom:calc(env(safe-area-inset-bottom,0px) + 14px)}.ms-stam{width:112px;bottom:calc(env(safe-area-inset-bottom,0px) + 134px)}.ms-pw{bottom:calc(env(safe-area-inset-bottom,0px) + 156px)}}' +
    '@media (orientation:landscape) and (max-width:899px){.ms-hint{display:none}.ms-joy{width:112px;height:112px;bottom:calc(env(safe-area-inset-bottom,0px) + 12px)}.ms-knob{width:48px;height:48px;margin:-24px 0 0 -24px}.ms-btns{transform:scale(.82);transform-origin:100% 100%;bottom:calc(env(safe-area-inset-bottom,0px) + 8px)}.ms-stam{width:112px;bottom:calc(env(safe-area-inset-bottom,0px) + 130px)}.ms-pw{bottom:calc(env(safe-area-inset-bottom,0px) + 150px)}.ms-top{padding-top:calc(env(safe-area-inset-top,0px) + 4px)}}' +
    '@media (min-width:900px){.ms-ctrl{height:0}.ms-joy,.ms-btns,.ms-stam{display:none}.ms-hint{top:auto;bottom:14px}.ms-pw{bottom:18px;right:18px}}' +
    '@media (prefers-reduced-motion:reduce){.ms-banner.show{animation-duration:.4s}}';

  /* ====== أصوات بسيطة بالكود (Web Audio) من غير ملفات ====== */
  function makeSfx() {
    let ctx = null, master = null, muted = false;
    try { const AC = root.AudioContext || root.webkitAudioContext; ctx = new AC(); master = ctx.createGain(); master.gain.value = .5; master.connect(ctx.destination); } catch (e) { ctx = null; }
    const resume = () => { try { if (ctx && ctx.state === 'suspended') ctx.resume(); } catch (e) { /* ignore */ } };
    const tone = (type, f1, f2, dur, vol, delay) => { if (!ctx || muted) return; const t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .05); };
    const noise = (dur, vol, lp, attack) => { if (!ctx || muted) return; const t = ctx.currentTime, n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (attack || .02)); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t); };
    return {
      resume: resume, mute: v => { muted = v; }, close: () => { try { if (ctx) ctx.close(); } catch (e) { /* ignore */ } },
      kick: () => { tone('sine', 150, 60, .12, .35); }, shot: () => { tone('sine', 190, 50, .18, .55); noise(.12, .3, 1800); }, touch: () => { tone('sine', 300, 200, .05, .08); },
      tackle: () => { noise(.1, .25, 900); }, save: () => { noise(.16, .35, 1400); tone('triangle', 330, 220, .15, .2); }, dive: () => { noise(.22, .12, 700); },
      whistle: () => { tone('sine', 2850, 2650, .35, .22); tone('sine', 2900, 2700, .35, .12, .02); },
      goalMine: () => { noise(2.4, .55, 1500, .25); tone('triangle', 392, 0, .5, .15); tone('triangle', 523, 0, .8, .15, .12); tone('triangle', 659, 0, 1.1, .15, .24); },
      goalOpp: () => { noise(1.2, .25, 800, .2); tone('sawtooth', 120, 80, .6, .1); }
    };
  }

  const FX_KEY = 'koraFx', SND_KEY = 'koraSfx';
  const getLS = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  const setLS = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };

  const POS_AR = { ST: 'مهاجم', MF: 'وسط', DF: 'مدافع', GK: 'حارس مرمى' };
  const svg = (p) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  const IC = { pause: svg('<path d="M8 5v14M16 5v14"/>'), play: svg('<path d="m7 4 13 8-13 8z"/>'), snd: svg('<path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7"/>'), mute: svg('<path d="M11 5 6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6"/>'), zoom: svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6M11 8v6"/>'), x: svg('<path d="M6 6l12 12M18 6 6 18"/>') };

  function open(o, onFinish) {
    if (!document.getElementById('msCss')) { const s = document.createElement('style'); s.id = 'msCss'; s.textContent = CSS; document.head.appendChild(s); }
    const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
    const isGK = o.pos === 'GK';
    const lowFx = getLS(FX_KEY, '') === 'low' || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 3);
    const rootEl = el('div', 'ms-root'), cv = el('canvas', 'ms-cv'); rootEl.appendChild(cv);
    document.body.appendChild(rootEl); document.body.style.overflow = 'hidden';
    const g = cv.getContext('2d', { alpha: false });
    let m = null, raf = 0, last = 0, acc = 0, paused = true, speed = 1, zoomOn = isGK, layer = null, view = { cw: 0, ch: 0, dpr: 1, scale: 1, cam: { x: W / 2, y: H / 2 } }, sfxOn = getLS(SND_KEY, '1') !== '0', ended = false;
    const sfx = makeSfx(); sfx.mute(!sfxOn);
    const inp = { mx: 0, my: 0, shoot: false, pass: false, sprint: false, passPress: false, actPress: false, through: false };
    const keys = {};

    function resize() {
      const dpr = Math.min(root.devicePixelRatio || 1, lowFx ? 1.25 : 2);
      view.dpr = dpr; view.cw = rootEl.clientWidth; view.ch = rootEl.clientHeight;
      cv.width = Math.round(view.cw * dpr); cv.height = Math.round(view.ch * dpr);
      /* الملعب كله ظاهر: نحجز مكان فوق (السكور) وتحت (الأزرار) */
      const land = view.cw > view.ch && view.cw < 900;      // موبايل أفقي: الملعب أعرض ويتابع اللاعب
      const topPad = land ? 50 : 66, botPad = land ? 6 : (view.cw < 900 ? Math.min(view.ch * .26, 150) : 20);
      const availH = view.ch - topPad - botPad, availW = view.cw - 10;
      view.land = land;
      view.fit = land ? Math.max(availH / (H + 40), Math.min(availW, view.cw * .6) / (W + 40)) : Math.min(availW / (W + 40), availH / (H + 40));
      view.padTop = topPad; view.padBot = botPad;
      const rs = Math.min(lowFx ? 1.1 : 1.6, Math.max(.8, view.fit * dpr * (zoomOn || view.land ? 1.6 : 1.15)));
      layer = buildPitchLayer(rs);
    }
    function updateCam() {
      const fit = view.fit, follow = zoomOn || view.land, z = zoomOn ? (view.land ? 1.3 : (isGK ? 1.9 : 1.55)) : 1;
      view.scale = fit * z;
      const tx = follow ? (isGK ? W / 2 + (m.ball.x - W / 2) * .35 : m.user.x * .45 + m.ball.x * .55) : W / 2;
      const ty = follow ? (isGK ? H - 240 + (m.ball.y - (H - 240)) * .25 : m.user.y * .35 + m.ball.y * .65) : H / 2;
      const halfW = view.cw / 2 / view.scale, halfH = (view.ch - view.padTop - view.padBot) / 2 / view.scale;
      const cx = clamp(tx, Math.min(W / 2, halfW - M + 6), Math.max(W / 2, W + M - halfW - 6)), cyRaw = clamp(ty, Math.min(H / 2, halfH - M + 6), Math.max(H / 2, H + M - halfH - 6));
      /* ننزّل الكاميرا شوية عشان الملعب يبقى بين الشريط العلوي والأزرار */
      const shift = (view.padTop - view.padBot) / 2 / view.scale;
      view.cam.x += (cx - view.cam.x) * .12; view.cam.y += (cyRaw - shift - view.cam.y) * .12;
    }

    /* ====== شاشة البداية ====== */
    const panel = el('div', 'ms-panel'); rootEl.appendChild(panel);
    const sty = STYLES[o.style || 'possession'];
    function showIntro() {
      panel.textContent = ''; const c = el('div', 'ms-card');
      c.append(el('h2', '', 'محاكاة الماتش'), el('p', '', (o.home ? 'على أرضك' : 'خارج ملعبك') + ' • أنت: ' + o.playerName + ' • ' + POS_AR[o.pos]));
      const vs = el('div', 'ms-vs'); vs.append(el('span', '', o.myName), el('b', '', 'VS'), el('span', '', o.oppName)); c.appendChild(vs);
      c.appendChild(el('p', '', 'الماتش 90 دقيقة على الساعة = 200 ثانية فعلية. ' + (isGK ? 'إنت حارس المرمى: حرّك الحارس بالجويستيك واضغط «ارتماء» لصدّ التسديدات، ولما تمسك الكرة وزّعها بزرار «تمرير».' : o.pos === 'DF' ? 'إنت مدافع: اقطع الهجمات بزرار «افتكاك» وابني اللعب من الخلف.' : o.pos === 'MF' ? 'إنت صانع ألعاب: اربط الخطوط ومرّر تمريرات بينية (اضغط مطوّل على «تمرير» لقوة أكبر).' : 'إنت مهاجم: اطلب الكرة وسدّد على المرمى. شدّ زرار «شوت» لتتحكم في القوة.')));
      if (o.label) c.insertBefore(el('p', '', '🏆 ' + o.label), vs);
      if (o.stars && o.stars.length) c.appendChild(el('p', '', '⭐ نجوم الخصم: ' + o.stars.map(x => x.n + ' (' + x.o + ')').join('، ') + ' — خلي بالك منهم!'));
      c.appendChild(el('p', '', 'أسلوب ' + o.oppName + ' المتوقع: ' + (STYLES[m.teams[1].styleKey] || sty).ar + ' (وبيتغير حسب النتيجة).'));
      const row = el('div', 'ms-opts');
      const fxb = el('button', 'ms-chip' + (lowFx ? ' on' : ''), 'تأثيرات خفيفة (أداء أسرع)'); fxb.type = 'button';
      fxb.addEventListener('click', () => { setLS(FX_KEY, lowFx ? '' : 'low'); fxb.classList.toggle('on'); fxb.textContent = 'هيتفعّل في المرة الجاية'; });
      row.appendChild(fxb); c.appendChild(row);
      const go = el('button', 'ms-act', 'ابدأ الماتش'); go.type = 'button';
      const cancel = el('button', 'ms-act ghost', 'رجوع'); cancel.type = 'button';
      go.addEventListener('click', () => { panel.remove(); sfx.resume(); sfx.whistle(); paused = false; last = performance.now(); });
      cancel.addEventListener('click', () => close(null));
      c.append(go, cancel); panel.appendChild(c);
    }

    /* ====== HUD ====== */
    const top = el('div', 'ms-top');
    const score = el('div', 'ms-score'), sA = el('span', '', o.myName), sN = el('b', '', '0 - 0'), sB = el('span', '', o.oppName);
    score.append(sA, sN, sB);
    const clock = el('div', 'ms-clock', "0'");
    const tools = el('div', 'ms-tools');
    const mkBtn = (html, label, fn) => { const b = el('button', 'ms-ibtn'); b.type = 'button'; b.innerHTML = html; b.setAttribute('aria-label', label); b.addEventListener('click', fn); return b; };
    const bPause = mkBtn(IC.pause, 'إيقاف مؤقت', () => togglePause());
    const bSpeed = mkBtn('x1', 'السرعة', () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; bSpeed.textContent = 'x' + speed; bSpeed.classList.toggle('on', speed > 1); });
    const bZoom = mkBtn(IC.zoom, 'تقريب الكاميرا', () => { zoomOn = !zoomOn; bZoom.classList.toggle('on', zoomOn); resize(); });
    bZoom.classList.toggle('on', zoomOn);
    const bSnd = mkBtn(sfxOn ? IC.snd : IC.mute, 'الصوت', () => { sfxOn = !sfxOn; setLS(SND_KEY, sfxOn ? '1' : '0'); sfx.mute(!sfxOn); bSnd.innerHTML = sfxOn ? IC.snd : IC.mute; });
    tools.append(bPause, bSpeed, bZoom, bSnd);
    top.append(tools, score, clock);
    const banner = el('div', 'ms-banner'); const hint = el('div', 'ms-hint');
    hint.textContent = isGK ? 'حرّك الحارس بالجويستيك • «ارتماء» للصد • «تمرير» لما تمسك الكرة' : 'جويستيك للحركة • «شوت» و«تمرير» (اضغط مطوّل للقوة) • «افتكاك» بدون كرة';
    rootEl.append(top, banner, hint);
    setTimeout(() => { hint.style.display = 'none'; }, 7000);

    /* أزرار الشاشة (موبايل) */
    const ctrl = el('div', 'ms-ctrl'); const joy = el('div', 'ms-joy'), knob = el('div', 'ms-knob'); joy.appendChild(knob);
    const stam = el('div', 'ms-stam'); const stI = el('i'); stam.appendChild(stI); if (isGK) stam.style.display = 'none';
    const btns = el('div', 'ms-btns');
    const bA = el('button', 'ms-b a'), bB = el('button', 'ms-b b'), bC = el('button', 'ms-b c');
    [bA, bB, bC].forEach(b => { b.type = 'button'; });
    btns.append(bA, bB, bC); ctrl.append(joy, btns);
    const pw = el('div', 'ms-pw'), pwI = el('i'); pw.appendChild(pwI);
    rootEl.append(ctrl, stam, pw);
    function setLabels(hasBall) {
      const set = (b, a, s) => { b.innerHTML = a + (s ? '<small>' + s + '</small>' : ''); };
      if (isGK) { set(bA, 'ارتماء', 'Dive'); set(bB, 'تمرير', m && m.carrier === m.user ? 'Pass' : ''); bC.style.display = 'none'; bB.classList.toggle('off', !(m && m.carrier === m.user)); }
      else if (hasBall) { set(bA, 'شوت', 'Shoot'); set(bB, 'تمرير', 'Pass'); set(bC, 'سبرنت', 'Sprint'); }
      else { set(bA, 'افتكاك', 'Tackle'); set(bB, 'اطلب', 'Call'); set(bC, 'سبرنت', 'Sprint'); }
    }
    setLabels(false);

    /* الجويستيك بـ Pointer Events (يدعم لمس متعدد) */
    let joyId = null;
    const joyMove = e => {
      const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R0 = r.width / 2 - 8;
      let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R0) { dx = dx / d * R0; dy = dy / d * R0; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; inp.mx = dx / R0; inp.my = dy / R0;
    };
    joy.addEventListener('pointerdown', e => { joyId = e.pointerId; try { joy.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } joyMove(e); e.preventDefault(); });
    joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
    const joyEnd = e => { if (e.pointerId !== joyId) return; joyId = null; knob.style.transform = ''; inp.mx = inp.my = 0; };
    joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);
    const hold = (b, onDown, onUp) => {
      let id = null;
      b.addEventListener('pointerdown', e => { id = e.pointerId; try { b.setPointerCapture(id); } catch (x) { /* ignore */ } b.classList.add('down'); onDown(); sfx.resume(); e.preventDefault(); });
      const up = e => { if (e.pointerId !== id) return; id = null; b.classList.remove('down'); onUp(); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    };
    hold(bA, () => { if (isGK) inp.actPress = true; else if (m.carrier === m.user) inp.shoot = true; else inp.actPress = true; }, () => { inp.shoot = false; });
    hold(bB, () => { if (m.carrier === m.user || isGK) inp.pass = true; else inp.passPress = true; }, () => { inp.pass = false; });
    hold(bC, () => { inp.sprint = true; }, () => { inp.sprint = false; });

    /* الكيبورد (كمبيوتر) */
    const kd = e => {
      const k = e.key.toLowerCase(); if (keys[k]) return; keys[k] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'shift'].indexOf(k) > -1) e.preventDefault();
      if (k === 'p' || k === 'escape') togglePause();
      if (k === ' ' || k === 'j') { if (isGK) inp.actPress = true; else if (m.carrier === m.user) inp.shoot = true; else inp.actPress = true; }
      if (k === 'k' || k === 'l') { if (m.carrier === m.user || isGK) inp.pass = true; else inp.passPress = true; }
      if (k === 'shift') inp.sprint = true;
      if (k === 'e') inp.through = true;
      kbAxis();
    };
    const ku = e => {
      const k = e.key.toLowerCase(); keys[k] = false;
      if (k === ' ' || k === 'j') inp.shoot = false; if (k === 'k' || k === 'l') inp.pass = false; if (k === 'shift') inp.sprint = false; if (k === 'e') inp.through = false;
      kbAxis();
    };
    function kbAxis() { if (joyId != null) return; inp.mx = ((keys.d || keys.arrowright) ? 1 : 0) - ((keys.a || keys.arrowleft) ? 1 : 0); inp.my = ((keys.s || keys.arrowdown) ? 1 : 0) - ((keys.w || keys.arrowup) ? 1 : 0); const n = Math.hypot(inp.mx, inp.my); if (n > 1) { inp.mx /= n; inp.my /= n; } }
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
    /* لو التاب اتخبّى أو الموبايل اتقفل: إيقاف مؤقت تلقائي (يوفّر بطارية ومايضيعش الماتش) */
    const onHide = () => { if (document.hidden && !paused && !ended && !panel.isConnected) togglePause(); };
    document.addEventListener('visibilitychange', onHide);

    /* ====== إيقاف مؤقت ====== */
    let pausePanel = null;
    function togglePause() {
      if (ended || panel.isConnected) return;
      paused = !paused; bPause.innerHTML = paused ? IC.play : IC.pause;
      if (paused) {
        pausePanel = el('div', 'ms-panel'); const c = el('div', 'ms-card');
        c.append(el('h2', '', 'إيقاف مؤقت'), el('p', '', o.myName + ' ' + m.score[0] + ' - ' + m.score[1] + ' ' + o.oppName + ' • الدقيقة ' + minute(m)));
        const r = el('button', 'ms-act', 'كمّل اللعب'); r.type = 'button'; r.addEventListener('click', togglePause);
        const q = el('button', 'ms-act ghost', 'إنهاء الماتش (سيتم حسب النتيجة الحالية)'); q.type = 'button';
        q.addEventListener('click', () => { if (confirm('تنهي الماتش دلوقتي؟ هيتحسب بالنتيجة والإحصائيات الحالية.')) { paused = false; if (pausePanel) pausePanel.remove(); pausePanel = null; m.t = MATCH_SECONDS - .01; m.phase = 'play'; m.half = 2; } });
        c.append(r, q); pausePanel.appendChild(c); rootEl.appendChild(pausePanel);
      } else { if (pausePanel) pausePanel.remove(); pausePanel = null; last = performance.now(); }
    }

    /* ====== حلقة اللعب ====== */
    const fmtClock = () => { const mn = minute(m); return (m.phase === 'ft' || m.over ? 90 : mn) + "'"; };
    let bannerRef = null;
    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (!paused && m) {
        acc += dt * speed; let n = 0;
        while (acc >= DT && n++ < 12) {
          step(m, DT, inp); acc -= DT;
          inp.actPress = false; inp.passPress = false;
          if (m.over && !ended) { finish(); return; }
        }
      }
      if (m) {
        updateCam(); draw(g, m, view, layer, !lowFx);
        sN.textContent = m.score[0] + ' - ' + m.score[1]; clock.textContent = fmtClock();
        if (m.banner && m.banner.text && m.banner !== bannerRef) { bannerRef = m.banner; banner.className = 'ms-banner ' + (m.banner.kind || ''); banner.textContent = m.banner.text; void banner.offsetWidth; banner.classList.add('show'); }
        const ch = isGK ? m.charge.pass : Math.max(m.charge.shoot, m.charge.pass);
        pw.classList.toggle('on', ch > .02); pwI.style.width = Math.round(ch * 100) + '%';
        stI.style.width = Math.round(m.stamina * 100) + '%';
        const hb = m.carrier === m.user; if (hb !== setLabels.last) { setLabels.last = hb; setLabels(hb); }
      }
    }
    /* المؤثر في الحاسبة: بنربط الدالة بالـ"Audio" */
    function finish() {
      ended = true; cancelAnimationFrame(raf); const res = summarize(m);
      const pn = el('div', 'ms-panel'); const c = el('div', 'ms-card');
      const win = res.ourGoals > res.oppGoals, draw0 = res.ourGoals === res.oppGoals;
      c.append(el('h2', '', win ? 'فوز رائع!' : draw0 ? 'تعادل' : 'خسارة'), el('div', 'ms-vs'));
      c.lastChild.append(el('span', '', o.myName), el('b', '', res.ourGoals + ' - ' + res.oppGoals), el('span', '', o.oppName));
      c.appendChild(el('div', 'ms-rate', '\u200E' + res.rating.toFixed(1) + ' / 5'));
      const gr = el('div', 'ms-grid');
      const cells = isGK ? [['تصديات', res.saves], ['شباك نظيفة', res.oppGoals === 0 ? 'نعم' : 'لا'], ['تمريرات', res.detail.passes ? Math.round(res.detail.passOk / res.detail.passes * 100) + '%' : '-']] : [['أهداف', res.goals], ['أسيست', res.assists], ['تسديدات', res.detail.onTarget + '/' + res.detail.shots], ['تمريرات', res.detail.passes ? Math.round(res.detail.passOk / res.detail.passes * 100) + '%' : '-'], ['افتكاكات', res.detail.tackles], ['أخطاء', res.detail.fouls]];
      cells.forEach(x => { const d = el('div'); d.append(el('small', '', x[0]), el('b', '', String(x[1]))); gr.appendChild(d); });
      c.appendChild(gr);
      c.appendChild(el('p', '', 'الإحصائيات دي هتتسجل في مسيرتك وتتحسب في موسمك.'));
      const ok = el('button', 'ms-act', 'سجّل النتيجة في مسيرتي'); ok.type = 'button';
      ok.addEventListener('click', () => close(res));
      c.appendChild(ok); pn.appendChild(c); rootEl.appendChild(pn);
      sfx.whistle();
    }
    function close(res) {
      cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); document.removeEventListener('visibilitychange', onHide); removeEventListener('resize', resize);
      sfx.close(); rootEl.remove(); document.body.style.overflow = '';
      if (onFinish) onFinish(res);
    }

    m = createMatch(Object.assign({}, o, { myColor: o.myColor, oppColor: o.oppColor }));
    m.sfx = sfx; m.lowFx = lowFx;
    resize(); addEventListener('resize', resize);
    view.cam.x = W / 2; view.cam.y = H / 2;
    showIntro();
    last = performance.now(); raf = requestAnimationFrame(frame);
    return { close: () => close(null) };
  }

  root.KoraMatchSim = { open: open, simulate: simulateAll, createMatch: createMatch, step: step, summarize: summarize, STYLES: STYLES, MATCH_SECONDS: MATCH_SECONDS };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.KoraMatchSim;
})(typeof window !== 'undefined' ? window : globalThis);
