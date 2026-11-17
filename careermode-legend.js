/* Kora Challenge — مشهد الاعتزال السينمائي + لوحة الإنجازات + بطاقة الأسطورة
   ───────────────────────────────────────────────────────────────────────────
   • مشهد خفيف: شاشة داكنة تضيء بكشافات الاستاد + تصفيق وجمهور متولّد بـ Web Audio (من غير ملفات صوت)
   • أرقام المسيرة بتعدّ تصاعديًا. الحارس بيظهرله تصديات وشباك نظيفة بدل الأهداف
   • بطاقة الأسطورة: صورة PNG بتتولّد على Canvas وتتحمّل أو تتشارك
   الاستخدام: KoraLegend.cinematic(S, done) | KoraLegend.summary(S) | KoraLegend.cardPNG(S) | KoraLegend.saveHall(S) */
(function (root) {
  'use strict';
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const HALL_KEY = 'koraLegends';
  const TITLE_T = ['league', 'cup', 'cl', 'cwc', 'caf', 'afc'];
  const INDIV_T = ['ballon', 'boot', 'glove', 'kopa', 'club', 'euPlayer', 'afPlayer'];
  const POS = { ST: 'مهاجم', WG: 'جناح', MF: 'وسط', DF: 'مدافع', GK: 'حارس مرمى' };
  const NUM = { ST: 9, WG: 11, MF: 8, DF: 4, GK: 1 };

  /* ====== ملخص المسيرة (أرقام + أرقام قياسية + تقييم الأسطورة) ====== */
  function summary(S) {
    const p = S.player, H = S.history || [], hs = S.honors || [], T = S.totals || {};
    const cnt = types => hs.filter(h => types.indexOf(h.type) > -1).length;
    const gk = p.pos === 'GK';
    const best = (k, f) => H.reduce((b, h) => (f ? f(h) : h[k]) > (b ? (f ? f(b) : b[k]) : -1) ? h : b, null);
    const peak = Math.max.apply(null, [p.ovr].concat(H.map(h => h.ovrAfter || 0)));
    const rated = H.filter(h => h.avg);
    const avg = rated.length ? rated.reduce((a, h) => a + h.avg, 0) / rated.length : 0;
    const out = {
      name: p.name, pos: p.pos, posAr: POS[p.pos] || p.pos, nat: p.nat, natCode: p.natCode, gk: gk, color: p.color,
      seasons: H.length, apps: T.apps || 0, goals: T.goals || 0, assists: T.assists || 0, saves: T.saves || 0, cs: T.cs || 0,
      titles: cnt(TITLE_T), indiv: cnt(INDIV_T), ballon: cnt(['ballon']), clTitles: cnt(['cl']), peak: Math.floor(peak), avg: avg,
      caps: S.intl ? S.intl.caps : 0, icaps: S.intl ? S.intl.goals : 0, age: (S.retiredAt && S.retiredAt.age) || p.age, year: (S.retiredAt && S.retiredAt.year) || S.year, money: S.money || 0,
      clubs: H.reduce((a, h) => { if (a.indexOf(h.clubId) < 0) a.push(h.clubId); return a; }, [])
    };
    /* الأرقام القياسية */
    const bg = best('goals'), bs = best('saves'), ba = best('avg'), bas = best('assists');
    out.records = [];
    if (gk) { if (bs && bs.saves) out.records.push(['أكتر تصديات في موسم', bs.saves + ' (' + bs.year + ')']); }
    else if (bg && bg.goals) out.records.push(['أكتر أهداف في موسم', bg.goals + ' (' + bg.year + ')']);
    if (bas && bas.assists && !gk) out.records.push(['أكتر أسيست في موسم', bas.assists + ' (' + bas.year + ')']);
    if (ba && ba.avg) out.records.push(['أعلى تقييم موسمي', ba.avg.toFixed(1) + ' (' + ba.year + ')']);
    out.records.push(['أعلى طاقة وصلتلها', String(out.peak)]);
    if (out.ballon) out.records.push(['الكرة الذهبية', out.ballon + (out.ballon > 1 ? ' مرات' : ' مرة')]);
    /* تقييم الأسطورة 60..99 */
    const pts = (out.peak - 60) * 1.1 + out.titles * 2.6 + out.indiv * 4 + out.ballon * 9 + out.clTitles * 3 + (gk ? out.saves * .008 + out.cs * .06 : out.goals * .035 + out.assists * .02) + out.caps * .05 + Math.max(0, out.seasons - 8) * .5;
    out.legend = clamp(Math.round(58 + pts * .55), 58, 99);
    out.tier = out.legend >= 95 ? 'أسطورة خالدة' : out.legend >= 88 ? 'أسطورة' : out.legend >= 80 ? 'نجم عالمي' : out.legend >= 70 ? 'لاعب كبير' : 'لاعب محترف';
    return out;
  }
  /* خانات لوحة الإنجازات: الحارس بدل الأهداف = تصديات + شباك نظيفة */
  function tiles(s) {
    const t = [['مباراة', s.apps], ['موسم', s.seasons]];
    if (s.gk) t.push(['تصدي', s.saves], ['شباك نظيفة', s.cs]); else t.push(['هدف', s.goals], ['أسيست', s.assists]);
    t.push(['بطولة', s.titles], ['جايزة فردية', s.indiv]);
    if (s.caps) t.push(['مباراة دولية', s.caps]);
    return t;
  }

  /* ====== قاعة الأساطير (تتخزن محليًا) ====== */
  function saveHall(S) {
    const s = summary(S); let list = [];
    try { list = JSON.parse(localStorage.getItem(HALL_KEY) || '[]'); } catch (e) { list = []; }
    if (list.some(x => x.name === s.name && x.year === s.year)) return;
    list.unshift({ name: s.name, pos: s.pos, posAr: s.posAr, nat: s.nat, natCode: s.natCode, color: s.color, legend: s.legend, tier: s.tier, apps: s.apps, goals: s.goals, assists: s.assists, saves: s.saves, cs: s.cs, titles: s.titles, indiv: s.indiv, ballon: s.ballon, peak: s.peak, age: s.age, year: s.year, gk: s.gk, caps: s.caps, seasons: s.seasons });
    try { localStorage.setItem(HALL_KEY, JSON.stringify(list.slice(0, 12))); } catch (e) { /* ignore */ }
  }

  /* ====== بطاقة الأسطورة (Canvas → PNG) ====== */
  function cardPNG(S, s) {
    s = s || summary(S);
    return new Promise(res => {
      const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      const bg = g.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#04100a'); bg.addColorStop(.55, '#08170f'); bg.addColorStop(1, '#020805'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
      /* أشعة ضوء */
      for (let i = 0; i < 7; i++) { const x = 90 + i * 150, gr = g.createLinearGradient(x, 0, x + 120, H); gr.addColorStop(0, 'rgba(36,233,130,.16)'); gr.addColorStop(1, 'rgba(36,233,130,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 70, 0); g.lineTo(x + 280, H); g.lineTo(x - 140, H); g.closePath(); g.fill(); }
      const frame = (x, y, w, h, r, col, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); g.stroke(); };
      frame(28, 28, W - 56, H - 56, 44, 'rgba(36,233,130,.9)', 5); frame(46, 46, W - 92, H - 92, 34, 'rgba(246,196,69,.55)', 2);
      g.textAlign = 'center'; g.direction = 'rtl';
      g.fillStyle = '#24e982'; g.font = '800 34px Cairo, Tahoma, sans-serif'; g.fillText('K O R A   C H A L L E N G E', W / 2, 116);
      g.fillStyle = '#f6c445'; g.font = '900 40px Cairo, Tahoma, sans-serif'; g.fillText('بطاقة الأسطورة', W / 2, 172);
      /* الصورة / القميص */
      const cx = W / 2, cy = 400, r = 170;
      const glow = g.createRadialGradient(cx, cy, 40, cx, cy, 300); glow.addColorStop(0, 'rgba(246,196,69,.35)'); glow.addColorStop(1, 'rgba(246,196,69,0)'); g.fillStyle = glow; g.fillRect(cx - 300, cy - 300, 600, 600);
      const pl = (S && S.player) || { color: s.color, photo: null };
      const finish = () => {
        g.fillStyle = '#fff'; g.font = '900 78px Cairo, Tahoma, sans-serif'; g.fillText(s.name, W / 2, 680);
        g.fillStyle = '#9fd9bb'; g.font = '700 36px Cairo, Tahoma, sans-serif'; g.fillText(s.posAr + '  •  ' + s.nat + '  •  اعتزل في سن ' + s.age, W / 2, 740);
        /* التقييم الأسطوري */
        const bx = W / 2, by = 850;
        g.fillStyle = 'rgba(246,196,69,.12)'; g.beginPath(); g.arc(bx, by, 76, 0, 7); g.fill(); frame(bx - 76, by - 76, 152, 152, 76, '#f6c445', 5);
        g.fillStyle = '#f6c445'; g.font = '900 78px Cairo, Tahoma, sans-serif'; g.fillText(String(s.legend), bx, by + 26);
        g.fillStyle = '#fff3c4'; g.font = '800 34px Cairo, Tahoma, sans-serif'; g.fillText(s.tier, bx, by + 118);
        /* الأرقام */
        const items = [['مباراة', s.apps], s.gk ? ['تصدي', s.saves] : ['هدف', s.goals], s.gk ? ['شباك نظيفة', s.cs] : ['أسيست', s.assists], ['بطولة', s.titles], ['جايزة فردية', s.indiv], ['أعلى طاقة', s.peak]];
        items.forEach((it, i) => {
          const col = i % 3, row = Math.floor(i / 3), x = 190 + col * 350, y = 1070 + row * 130;
          g.fillStyle = 'rgba(255,255,255,.05)'; g.beginPath(); g.roundRect ? g.roundRect(x - 150, y - 60, 300, 110, 22) : g.rect(x - 150, y - 60, 300, 110); g.fill();
          g.fillStyle = '#24e982'; g.font = '900 54px Cairo, Tahoma, sans-serif'; g.fillText(Number(it[1]).toLocaleString('en-US'), x, y + 12);
          g.fillStyle = '#9fb5a9'; g.font = '700 26px Cairo, Tahoma, sans-serif'; g.fillText(it[0], x, y + 44);
        });
        g.fillStyle = 'rgba(255,255,255,.4)'; g.font = '600 24px Cairo, Tahoma, sans-serif'; g.fillText('صُنعت في Kora Challenge — كارير مود', W / 2, H - 70);
        c.toBlob(b => res({ blob: b, url: b ? URL.createObjectURL(b) : c.toDataURL('image/png') }), 'image/png');
      };
      g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.clip();
      const done = () => { g.restore(); frame(cx - r, cy - r, r * 2, r * 2, r, '#f6c445', 8); finish(); };
      if (pl.photo) {
        const im = new Image(); im.onload = () => { g.drawImage(im, cx - r, cy - r, r * 2, r * 2); done(); }; im.onerror = () => { shirt(g, cx, cy, r, pl.color, s); done(); }; im.src = pl.photo;
      } else { g.fillStyle = '#0d1c14'; g.fillRect(cx - r, cy - r, r * 2, r * 2); shirt(g, cx, cy + 10, r, pl.color, s); done(); }
    });
  }
  function shirt(g, cx, cy, r, color, s) {
    g.fillStyle = color || '#e8453c'; g.beginPath();
    g.moveTo(cx - r * .55, cy - r * .7); g.lineTo(cx - r * .95, cy - r * .35); g.lineTo(cx - r * .7, cy - r * .05); g.lineTo(cx - r * .5, cy - r * .22); g.lineTo(cx - r * .5, cy + r * .8); g.lineTo(cx + r * .5, cy + r * .8); g.lineTo(cx + r * .5, cy - r * .22); g.lineTo(cx + r * .7, cy - r * .05); g.lineTo(cx + r * .95, cy - r * .35); g.lineTo(cx + r * .55, cy - r * .7); g.quadraticCurveTo(cx, cy - r * .5, cx - r * .55, cy - r * .7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.92)'; g.font = '900 ' + Math.round(r * .75) + 'px Cairo, Tahoma, sans-serif'; g.textAlign = 'center'; g.fillText(String(NUM[s.pos] || 10), cx, cy + r * .4);
  }

  /* ====== المشهد السينمائي ====== */
  const CSS = '.lg-root{position:fixed;inset:0;z-index:99999;background:#000;color:#fff;overflow:hidden;direction:rtl;font-family:inherit;-webkit-user-select:none;user-select:none}' +
    '.lg-cv{position:absolute;inset:0;width:100%;height:100%}' +
    '.lg-fade{position:absolute;inset:0;background:#000;transition:opacity 2.6s ease;z-index:2;pointer-events:none}.lg-root.lit .lg-fade{opacity:.0}' +
    '.lg-stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:12vh 20px;z-index:3}' +
    '.lg-small{letter-spacing:.35em;color:#9fd9bb;font-size:clamp(.8rem,3.4vw,1rem);opacity:0;animation:lgIn 1.2s forwards}' +
    '.lg-name{font-size:clamp(1.8rem,9vw,3.4rem);font-weight:900;opacity:0;animation:lgIn 1.4s forwards;text-shadow:0 0 30px rgba(36,233,130,.5)}' +
    '.lg-line{font-size:clamp(1rem,4.8vw,1.6rem);color:#f6e7b0;opacity:0;animation:lgIn 1.2s forwards}' +
    '.lg-shirt{width:min(52vw,230px);opacity:0;transform:translateY(120px) scale(.7);filter:drop-shadow(0 0 40px rgba(246,196,69,.55))}.lg-shirt.in{animation:lgRise 2.4s cubic-bezier(.2,.9,.3,1) forwards}' +
    '@keyframes lgIn{from{opacity:0;transform:translateY(16px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}@keyframes lgRise{to{opacity:1;transform:none}}' +
    '.lg-btn{position:absolute;left:16px;right:16px;bottom:calc(8vh + env(safe-area-inset-bottom,0px));max-width:380px;margin:0 auto;z-index:6;font:inherit;font-weight:800;font-size:1.05rem;border-radius:14px;padding:14px;border:2px solid #f6c445;background:linear-gradient(90deg,#fff0b3,#f6c445);color:#1a1203;cursor:pointer}' +
    '.lg-skip{position:absolute;top:calc(env(safe-area-inset-top,0px) + 14px);left:14px;z-index:6;font:inherit;font-size:.8rem;color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:99px;padding:6px 14px;cursor:pointer}' +
    '.lg-snd{position:absolute;top:calc(env(safe-area-inset-top,0px) + 14px);right:14px;z-index:6;width:36px;height:36px;border-radius:50%;color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);cursor:pointer;display:grid;place-items:center;padding:0}' +
    '@media (prefers-reduced-motion:reduce){.lg-shirt.in{animation-duration:.4s}}';

  function audio() {
    let ctx = null, master = null, muted = false;
    try { const AC = root.AudioContext || root.webkitAudioContext; ctx = new AC(); master = ctx.createGain(); master.gain.value = .6; master.connect(ctx.destination); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { ctx = null; }
    const noiseBuf = (dur) => { const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; };
    /* تصفيق: نبضات ضوضاء قصيرة متفرّقة بتزيد وتهدى */
    const applause = (dur, peak) => {
      if (!ctx || muted) return; const t0 = ctx.currentTime, buf = noiseBuf(.08), n = Math.floor(dur * 55);
      for (let i = 0; i < n; i++) {
        const k = i / n, swell = Math.sin(Math.PI * Math.min(1, k * 1.1)), t = t0 + Math.random() * dur;
        const s = ctx.createBufferSource(); s.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400 + Math.random() * 2600; f.Q.value = .8;
        const g = ctx.createGain(); const v = peak * (.25 + Math.random() * .6) * Math.max(.1, Math.sin(Math.PI * (t - t0) / dur));
        g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + .07); s.connect(f); f.connect(g); g.connect(master); s.start(t);
      }
    };
    /* همهمة الجمهور */
    const crowd = (dur, vol) => {
      if (!ctx || muted) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noiseBuf(dur); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; const g = ctx.createGain();
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + dur * .4); g.gain.linearRampToValueAtTime(.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t);
    };
    const chord = (fs, dur) => { if (!ctx || muted) return; const t = ctx.currentTime; fs.forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t + i * .05); g.gain.exponentialRampToValueAtTime(.1, t + dur * .35); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(master); o.start(t + i * .05); o.stop(t + dur + .1); }); };
    return { applause: applause, crowd: crowd, chord: chord, mute: v => { muted = v; if (master) master.gain.value = v ? 0 : .6; }, close: () => { try { if (ctx) ctx.close(); } catch (e) { /* ignore */ } } };
  }

  function cinematic(S, done) {
    if (!document.getElementById('lgCss')) { const st = el('style'); st.id = 'lgCss'; st.textContent = CSS; document.head.appendChild(st); }
    const p = S.player, s = summary(S), au = audio(), timers = []; let raf = 0, ended = false, beams = 0;
    let low = false; try { low = localStorage.getItem('koraFx') === 'low'; } catch (e) { /* ignore */ }
    const rootEl = el('div', 'lg-root'), cv = el('canvas', 'lg-cv'), stage = el('div', 'lg-stage'), fade = el('div', 'lg-fade');
    const skip = el('button', 'lg-skip', 'تخطي'), snd = el('button', 'lg-snd'); skip.type = snd.type = 'button'; snd.setAttribute('aria-label', 'الصوت'); snd.textContent = '♪';
    let mu = false; snd.addEventListener('click', () => { mu = !mu; au.mute(mu); snd.style.opacity = mu ? .4 : 1; });
    rootEl.append(cv, stage, fade, skip, snd); document.body.appendChild(rootEl); document.body.style.overflow = 'hidden';
    const g = cv.getContext('2d'); let W = 0, H = 0;
    const size = () => { const d = Math.min(devicePixelRatio || 1, low ? 1 : 1.5); W = cv.width = innerWidth * d; H = cv.height = innerHeight * d; g.setTransform(d, 0, 0, d, 0, 0); };
    size(); addEventListener('resize', size);
    const parts = [];
    const at = (ms, fn) => timers.push(setTimeout(() => { if (!ended) fn(); }, ms));
    /* كشافات الاستاد: أشعة بتتحرك + غبار ضوء */
    const t0 = performance.now();
    const loop = now => {
      raf = requestAnimationFrame(loop);
      const w = innerWidth, h = innerHeight, t = (now - t0) / 1000;
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 6; i++) {
        const k = Math.min(1, beams), side = i < 3 ? 0 : 1, ox = side ? w * (.78 + (i - 3) * .09) : w * (.22 - i * .09);
        const ang = (side ? -1 : 1) * (.25 + (i % 3) * .12) + Math.sin(t * .7 + i * 1.3) * .22;
        const len = h * 1.3, spread = .075;
        const gr = g.createLinearGradient(ox, -20, ox + Math.sin(ang) * len, -20 + Math.cos(ang) * len); gr.addColorStop(0, 'rgba(255,248,215,' + (.4 * k) + ')'); gr.addColorStop(1, 'rgba(255,248,215,0)');
        g.fillStyle = gr; g.beginPath(); g.moveTo(ox - 8, -20); g.lineTo(ox + 8, -20);
        g.lineTo(ox + Math.sin(ang + spread) * len + 20, -20 + Math.cos(ang + spread) * len); g.lineTo(ox + Math.sin(ang - spread) * len - 20, -20 + Math.cos(ang - spread) * len); g.closePath(); g.fill();
      }
      if (beams > .4) { const pg = g.createRadialGradient(w / 2, h * .62, 10, w / 2, h * .62, w * .6); pg.addColorStop(0, 'rgba(246,196,69,' + (.2 * beams) + ')'); pg.addColorStop(1, 'rgba(246,196,69,0)'); g.fillStyle = pg; g.fillRect(0, 0, w, h); }
      g.globalCompositeOperation = 'source-over';
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.x += q.vx; q.y += q.vy; q.vy += .05; q.l -= .01; if (q.l <= 0) { parts.splice(i, 1); continue; } g.globalAlpha = Math.min(1, q.l); g.fillStyle = q.c; g.fillRect(q.x, q.y, q.s, q.s * 2); }
      g.globalAlpha = 1;
    };
    loop(performance.now());
    const confetti = n => { const w = innerWidth; for (let i = 0; i < n; i++) parts.push({ x: Math.random() * w, y: -10, vx: (Math.random() - .5) * 1.4, vy: 1.5 + Math.random() * 2.5, l: 2 + Math.random(), s: 3 + Math.random() * 3, c: ['#f6c445', '#24e982', '#fff', '#ff8a70'][i % 4] }); };
    const grow = () => { const st = performance.now(); const f = () => { beams = Math.min(1, (performance.now() - st) / 2500); if (beams < 1 && !ended) requestAnimationFrame(f); }; f(); };
    const end = () => {
      if (ended) return; ended = true; timers.forEach(clearTimeout); cancelAnimationFrame(raf); au.close(); removeEventListener('resize', size);
      rootEl.style.transition = 'opacity .6s'; rootEl.style.opacity = '0';
      setTimeout(() => { rootEl.remove(); document.body.style.overflow = ''; if (done) done(); }, 600);
    };
    skip.addEventListener('click', end);
    /* السيناريو */
    requestAnimationFrame(() => rootEl.classList.add('lit'));
    at(500, () => { stage.append(el('div', 'lg-small', 'نهاية رحلة'), el('div', 'lg-name', p.name)); au.crowd(8, .12); });
    at(3200, () => { grow(); au.applause(9, .5); au.chord([196, 246.9, 293.7], 5); });
    at(4200, () => {
      const sh = el('div', 'lg-shirt');
      sh.innerHTML = '<svg viewBox="0 0 100 100"><defs><linearGradient id="lgS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + (p.color || '#e8453c') + '"/><stop offset="1" stop-color="rgba(0,0,0,.5)"/></linearGradient></defs><path d="M30 12 8 28l10 16 9-6v50h46V38l9 6 10-16L70 12q-20 12-40 0z" fill="url(#lgS)" stroke="#fff3c4" stroke-width="1.6" stroke-linejoin="round"/><text x="50" y="66" text-anchor="middle" font-size="30" font-weight="900" fill="#fff" font-family="Cairo,Tahoma,sans-serif">' + (NUM[p.pos] || 10) + '</text></svg>';
      stage.appendChild(sh); requestAnimationFrame(() => sh.classList.add('in')); confetti(low ? 25 : 80);
    });
    at(7200, () => { const l = el('div', 'lg-line', s.seasons + ' موسم • ' + s.apps + ' مباراة • ' + s.titles + ' بطولة'); stage.appendChild(l); au.applause(5, .45); confetti(low ? 20 : 60); });
    at(10200, () => { const l = el('div', 'lg-line', 'شكرًا يا ' + p.name); l.style.animationDelay = '.2s'; stage.appendChild(l); });
    at(11200, () => { const b = el('button', 'lg-btn', 'كمّل'); b.type = 'button'; b.addEventListener('click', end); rootEl.appendChild(b); skip.remove(); });
  }

  root.KoraLegend = { summary: summary, tiles: tiles, cinematic: cinematic, cardPNG: cardPNG, saveHall: saveHall, HALL_KEY: HALL_KEY };
})(window);
