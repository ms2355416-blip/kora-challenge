/* Kora Challenge — مشهد سينمائي للفوز بالكرة الذهبية (شاشة كاملة + مؤثرات صوتية متولّدة بالكود) */
(function (root) {
  'use strict';
  var CSS = '' +
    '.kc-root{position:fixed;inset:0;z-index:99999;background:#000;color:#fff;overflow:hidden;font-family:inherit;direction:rtl;-webkit-user-select:none;user-select:none}' +
    '.kc-bg{position:absolute;inset:-20%;background:radial-gradient(circle at 50% 45%,#2b2008 0,#0b0904 45%,#000 75%);transition:opacity 1s}' +
    '.kc-rays{position:absolute;left:50%;top:48%;width:170vmax;height:170vmax;margin:-85vmax 0 0 -85vmax;background:repeating-conic-gradient(from 0deg,rgba(246,196,69,.0) 0 9deg,rgba(246,196,69,.2) 10deg 12deg,rgba(246,196,69,0) 13deg 20deg);animation:kcSpin 28s linear infinite;opacity:0;transition:opacity 1.2s;-webkit-mask-image:radial-gradient(circle,#000 0,transparent 55%);mask-image:radial-gradient(circle,#000 0,transparent 55%)}' +
    '.kc-rays.on{opacity:1}@keyframes kcSpin{to{transform:rotate(360deg)}}' +
    '.kc-grain{position:absolute;inset:0;opacity:.13;mix-blend-mode:overlay;pointer-events:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'.9\' numOctaves=\'2\'/></filter><rect width=\'160\' height=\'160\' filter=\'url(%23n)\'/></svg>");animation:kcGrain .6s steps(4) infinite}' +
    '@keyframes kcGrain{0%{transform:translate(0,0)}25%{transform:translate(-8px,6px)}50%{transform:translate(6px,-8px)}75%{transform:translate(-4px,-4px)}}' +
    '.kc-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle,transparent 45%,rgba(0,0,0,.8) 100%)}' +
    '.kc-bar{position:absolute;left:0;right:0;height:0;background:#000;z-index:5;transition:height 1.2s cubic-bezier(.2,.8,.2,1)}.kc-bar.t{top:0}.kc-bar.b{bottom:0}.kc-root.go .kc-bar{height:11vh}' +
    '.kc-stage{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:16vh 20px;gap:14px;z-index:3}' +
    '.kc-cv{position:absolute;inset:0;z-index:4;pointer-events:none}' +
    '.kc-flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:6;pointer-events:none}.kc-flash.on{animation:kcFlash .9s ease-out}@keyframes kcFlash{0%{opacity:.95}100%{opacity:0}}' +
    '.kc-shake{animation:kcShake .5s}@keyframes kcShake{0%,100%{transform:none}20%{transform:translate(-9px,5px)}40%{transform:translate(8px,-6px)}60%{transform:translate(-6px,-4px)}80%{transform:translate(5px,6px)}}' +
    '.kc-small{font-size:clamp(.8rem,3.4vw,1.05rem);letter-spacing:.35em;color:#d9c58a;opacity:0;animation:kcIn 1.2s .2s forwards}' +
    '.kc-line{font-size:clamp(1.3rem,6.2vw,2.3rem);font-weight:800;opacity:0;animation:kcIn 1s forwards;text-shadow:0 4px 30px rgba(0,0,0,.8)}' +
    '@keyframes kcIn{from{opacity:0;transform:translateY(18px) scale(.97);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}' +
    '.kc-stats{display:flex;gap:clamp(10px,4vw,34px);justify-content:center}' +
    '.kc-stat{opacity:0;transform:scale(2.4);min-width:84px}.kc-stat.in{animation:kcSlam .55s cubic-bezier(.2,1.4,.3,1) forwards}@keyframes kcSlam{to{opacity:1;transform:scale(1)}}' +
    '.kc-stat b{display:block;font-size:clamp(2.6rem,15vw,5.6rem);line-height:1;background:linear-gradient(180deg,#fff2b8,#f6c445 55%,#a8731a);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 6px 18px rgba(246,196,69,.35))}' +
    '.kc-stat span{font-size:clamp(.8rem,3.6vw,1.1rem);color:#d9c58a}' +
    '.kc-cands{display:flex;flex-direction:column;gap:8px;align-items:center;margin-top:6px}' +
    '.kc-cand{font-size:clamp(1.05rem,5vw,1.7rem);font-weight:700;padding:6px 18px;border-radius:10px;color:#8a7a50;opacity:0;animation:kcIn .5s forwards;transition:color .12s,background .12s,transform .12s,opacity .6s}' +
    '.kc-cand.hot{color:#fff;background:rgba(246,196,69,.2);transform:scale(1.07)}.kc-cand.me.hot{color:#1a1203;background:linear-gradient(90deg,#fff0b3,#f6c445)}.kc-cand.dim{opacity:.12!important}' +
    '.kc-ball{width:min(46vw,210px);height:min(46vw,210px);opacity:0;transform:scale(.2) translateY(60px);filter:drop-shadow(0 0 40px rgba(246,196,69,.75))}.kc-ball.in{animation:kcBall 1.6s cubic-bezier(.2,1,.3,1) forwards}' +
    '@keyframes kcBall{to{opacity:1;transform:scale(1)}}.kc-ball svg{width:100%;height:100%;animation:kcFloat 3s ease-in-out infinite}@keyframes kcFloat{50%{transform:translateY(-9px) rotate(4deg)}}' +
    '.kc-title{font-size:clamp(2.1rem,11vw,4.2rem);font-weight:900;line-height:1.1;background:linear-gradient(100deg,#a8731a 10%,#fff2b8 35%,#f6c445 50%,#fff2b8 65%,#a8731a 90%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;opacity:0;animation:kcIn 1.2s forwards,kcShine 3.2s 1.2s linear infinite}@keyframes kcShine{to{background-position:-250% 0}}' +
    '.kc-av{width:84px;height:84px;border-radius:50%;overflow:hidden;border:3px solid #f6c445;box-shadow:0 0 30px rgba(246,196,69,.6);opacity:0;animation:kcIn 1s forwards;background:#111}.kc-av svg,.kc-av img{width:100%;height:100%;object-fit:cover}' +
    '.kc-name{font-size:clamp(1.5rem,8vw,2.6rem);font-weight:800;opacity:0;animation:kcIn 1s forwards}' +
    '.kc-sub{color:#d9c58a;font-size:clamp(.85rem,3.8vw,1.1rem);opacity:0;animation:kcIn 1s forwards}' +
    '.kc-skip,.kc-snd{position:absolute;top:calc(env(safe-area-inset-top,0px) + 12vh);z-index:8;font:inherit;font-size:.8rem;color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:99px;padding:7px 14px;cursor:pointer;backdrop-filter:blur(6px)}.kc-skip{left:14px}.kc-snd{right:14px;padding:7px 10px}' +
    '.kc-snd svg{width:18px;height:18px;display:block}' +
    '.kc-go{position:absolute;left:16px;right:16px;bottom:calc(13vh + env(safe-area-inset-bottom,0px));max-width:420px;margin:0 auto;z-index:8;font:inherit;font-weight:800;font-size:1.05rem;color:#1a1203;background:linear-gradient(90deg,#fff0b3,#f6c445);border:0;border-radius:16px;padding:15px;cursor:pointer;box-shadow:0 12px 34px rgba(246,196,69,.4);opacity:0;animation:kcIn .8s forwards}' +
    '@media (prefers-reduced-motion:reduce){.kc-rays,.kc-grain,.kc-ball svg,.kc-title{animation:none}}';

  function injectCss() { if (document.getElementById('kcCss')) return; var s = document.createElement('style'); s.id = 'kcCss'; s.textContent = CSS; document.head.appendChild(s); }
  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; }

  function Audio_() {
    var ctx = null, master = null, muted = false;
    try { var AC = root.AudioContext || root.webkitAudioContext; ctx = new AC(); master = ctx.createGain(); master.gain.value = .55; master.connect(ctx.destination); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { ctx = null; }
    function env(g, t, a, d, v) { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); }
    function osc(type, f1, f2, t, dur, vol, a) { if (!ctx) return; var o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f1, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur); env(g, t, a || .02, dur, vol); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .1); }
    function noise(t, dur, vol, lp) { if (!ctx) return; var n = ctx.sampleRate * dur, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; f.type = 'lowpass'; f.frequency.value = lp || 1200; env(g, t, .01, dur, vol); s.connect(f); f.connect(g); g.connect(master); s.start(t); }
    return {
      hit: function () { if (!ctx || muted) return; var t = ctx.currentTime; osc('sine', 110, 38, t, .7, .9, .005); noise(t, .35, .5, 900); },
      tick: function () { if (!ctx || muted) return; osc('square', 1500, 900, ctx.currentTime, .05, .08, .002); },
      riser: function (d) { if (!ctx || muted) return; var t = ctx.currentTime; osc('sawtooth', 90, 1500, t, d, .22, d * .85); noise(t, d, .18, 4000); },
      boom: function () { if (!ctx || muted) return; var t = ctx.currentTime; osc('sine', 80, 28, t, 1.6, 1, .005); noise(t, .9, .6, 1800); },
      chord: function (fs, d) { if (!ctx || muted) return; var t = ctx.currentTime; fs.forEach(function (f, i) { osc('triangle', f, 0, t + i * .02, d, .16, d * .45); osc('sine', f * 2, 0, t, d, .06, d * .5); }); },
      rumble: function (d) { if (!ctx || muted) return; osc('sine', 42, 55, ctx.currentTime, d, .4, d * .6); },
      mute: function (m) { muted = m; if (master) master.gain.value = m ? 0 : .55; },
      close: function () { try { if (ctx) ctx.close(); } catch (e) { /* ignore */ } }
    };
  }

  var BALL = '<svg viewBox="0 0 120 120"><defs><radialGradient id="kb1" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff7cf"/><stop offset=".35" stop-color="#f6c445"/><stop offset="1" stop-color="#8a5a10"/></radialGradient></defs><circle cx="60" cy="60" r="56" fill="url(#kb1)"/><g fill="none" stroke="#7a4f0e" stroke-width="2" opacity=".75"><path d="M60 38 L81 53 L73 78 L47 78 L39 53Z"/><path d="M60 38 L60 6M81 53 L112 44M73 78 L92 106M47 78 L28 106M39 53 L8 44"/></g><path d="M60 38 L81 53 L73 78 L47 78 L39 53Z" fill="#a8731a" opacity=".45"/><ellipse cx="42" cy="30" rx="20" ry="11" fill="#fff" opacity=".35" transform="rotate(-30 42 30)"/></svg>';

  function ballon(o, done) {
    injectCss();
    var au = Audio_(), timers = [], raf = 0, ended = false, parts = [];
    var rootEl = el('div', 'kc-root'), bg = el('div', 'kc-bg'), rays = el('div', 'kc-rays'), stage = el('div', 'kc-stage'), cv = el('canvas', 'kc-cv'), flash = el('div', 'kc-flash');
    var skip = el('button', 'kc-skip', 'تخطي'), snd = el('button', 'kc-snd');
    snd.setAttribute('aria-label', 'الصوت'); skip.type = snd.type = 'button';
    var ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>', OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6"/></svg>';
    snd.innerHTML = ON; var mu = false; snd.addEventListener('click', function () { mu = !mu; au.mute(mu); snd.innerHTML = mu ? OFF : ON; });
    rootEl.append(bg, rays, stage, cv, el('div', 'kc-grain'), el('div', 'kc-vig'), el('div', 'kc-bar t'), el('div', 'kc-bar b'), flash, skip, snd);
    document.body.appendChild(rootEl); document.body.style.overflow = 'hidden';

    function at(ms, fn) { timers.push(setTimeout(function () { if (!ended) fn(); }, ms)); }
    function clear() { stage.textContent = ''; }
    function shake() { rootEl.classList.remove('kc-shake'); void rootEl.offsetWidth; rootEl.classList.add('kc-shake'); }
    function flashIt() { flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on'); }
    function end() {
      if (ended) return; ended = true; timers.forEach(clearTimeout); cancelAnimationFrame(raf); au.close();
      rootEl.style.transition = 'opacity .5s'; rootEl.style.opacity = '0';
      setTimeout(function () { rootEl.remove(); document.body.style.overflow = ''; if (done) done(); }, 500);
    }
    skip.addEventListener('click', end);

    /* جسيمات ذهبية */
    var ctx2 = cv.getContext('2d'), W = 0, H = 0;
    function size() { W = cv.width = innerWidth; H = cv.height = innerHeight; } size(); addEventListener('resize', size);
    function burst(x, y, n, spd) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = (Math.random() * .7 + .3) * spd; parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, s: Math.random() * 3 + 1.5, h: 38 + Math.random() * 18 }); } }
    function rain(n) { for (var i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: -10 - Math.random() * 200, vx: (Math.random() - .5) * 1.2, vy: Math.random() * 2 + 2, life: 1.6, s: Math.random() * 4 + 2, h: 40 + Math.random() * 14, rect: 1 }); }
    function loop() {
      ctx2.clearRect(0, 0, W, H);
      for (var i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += p.rect ? .01 : .09; p.life -= .011; if (p.life <= 0 || p.y > H + 20) { parts.splice(i, 1); continue; }
        ctx2.globalAlpha = Math.min(1, p.life); ctx2.fillStyle = 'hsl(' + p.h + ',95%,' + (55 + Math.random() * 20) + '%)'; if (p.rect) ctx2.fillRect(p.x, p.y, p.s, p.s * 2.2); else { ctx2.beginPath(); ctx2.arc(p.x, p.y, p.s, 0, 6.283); ctx2.fill(); } }
      ctx2.globalAlpha = 1; raf = requestAnimationFrame(loop);
    }
    loop();

    var yr = o.year || 2026, season = yr + '/' + String((yr + 1) % 100).padStart(2, '0');
    /* المشهد 1: افتتاحية */
    requestAnimationFrame(function () { rootEl.classList.add('go'); });
    au.rumble(3.2);
    at(300, function () { stage.append(el('div', 'kc-small', 'موسم ' + season), el('div', 'kc-line', 'حلم كل لاعب في العالم')); stage.lastChild.style.animationDelay = '.8s'; });
    /* المشهد 2: الأرقام */
    at(3000, function () {
      clear(); au.riser(2.4);
      var row = el('div', 'kc-stats'); var items = [[o.goals, 'هدف'], [o.assists, 'أسيست'], [Number(o.avg || 0).toFixed(1), 'تقييم']];
      var nodes = items.map(function (x) { var d = el('div', 'kc-stat'); d.append(el('b', '', String(x[0])), el('span', '', x[1])); row.appendChild(d); return d; });
      stage.append(el('div', 'kc-small', 'موسمك'), row);
      [0, 800, 1600].forEach(function (d, i) { setTimeout(function () { if (ended) return; nodes[i].classList.add('in'); au.hit(); shake(); burst(innerWidth / 2, innerHeight / 2, 26, 6); }, 400 + d); });
    });
    at(6200, function () { var l = el('div', 'kc-line', 'وكل العالم كان بيتفرج'); stage.appendChild(l); au.chord([220, 261.6, 329.6], 2.6); });
    /* المشهد 3: المرشحين */
    at(8400, function () {
      clear(); au.riser(3.2);
      stage.appendChild(el('div', 'kc-small', 'المرشحين النهائيين'));
      var names = (o.cands || []).filter(function (n) { return n !== o.name; }).slice(0, 4); names.push(o.name);
      var list = el('div', 'kc-cands'); var nodes = names.map(function (n, i) { var c = el('div', 'kc-cand' + (n === o.name ? ' me' : ''), n); c.style.animationDelay = (i * .18) + 's'; list.appendChild(c); return c; });
      stage.appendChild(list);
      var k = 0, iv = setInterval(function () { if (ended) { clearInterval(iv); return; } nodes.forEach(function (c) { c.classList.remove('hot'); }); nodes[k % nodes.length].classList.add('hot'); au.tick(); k++; }, 170);
      setTimeout(function () { clearInterval(iv); if (ended) return; nodes.forEach(function (c) { c.classList.remove('hot'); if (!c.classList.contains('me')) c.classList.add('dim'); }); var me = nodes[nodes.length - 1]; me.classList.add('hot'); au.hit(); shake(); }, 2900);
    });
    /* المشهد 4: الكرة الذهبية */
    at(12000, function () {
      clear(); flashIt(); au.boom(); shake(); rays.classList.add('on'); au.chord([261.6, 329.6, 392, 523.3], 4.5);
      var ball = el('div', 'kc-ball'); ball.innerHTML = BALL; stage.appendChild(ball); requestAnimationFrame(function () { ball.classList.add('in'); });
      burst(innerWidth / 2, innerHeight * .42, 90, 9); rain(70);
      setTimeout(function () { if (ended) return; stage.append(el('div', 'kc-title', 'الكرة الذهبية')); burst(innerWidth / 2, innerHeight * .5, 60, 7); }, 1100);
      setTimeout(function () { if (ended) return; var av = el('div', 'kc-av'); av.innerHTML = o.avatar || ''; stage.append(av, el('div', 'kc-name', o.name), el('div', 'kc-sub', o.club + ' • أحسن لاعب في العالم ' + season)); rain(60); }, 2300);
      setTimeout(function () { if (ended) return; rain(60); burst(innerWidth / 2, innerHeight * .55, 70, 8); au.chord([293.7, 370, 440, 587.3], 4); }, 4500);
      setTimeout(function () { if (ended) return; var b = el('button', 'kc-go', 'كمّل'); b.type = 'button'; b.addEventListener('click', end); rootEl.appendChild(b); skip.remove(); }, 5200);
    });
  }

  root.KoraCinema = { ballon: ballon };
})(typeof window !== 'undefined' ? window : globalThis);
