/* Kora Challenge — لعبة شبكة الأندية (Football Grid 3×3) */
(() => {
  'use strict';

  const D = window.KoraGridData;
  const U = window.KoraUnlocks || null;
  const STATS_KEY = 'koraChallengeStats';

  const MODES = {
    classic:     { name: 'كلاسيك',        desc: 'خمس غلطات مسموحة. بتتحسب نقاطك عادي.', lives: 5, time: 240, mult: 1 },
    suddenDeath: { name: 'الموت المفاجئ', desc: 'غلطة واحدة وتخلص اللعبة. نقاطك × 1.5',  lives: 1, time: 180, mult: 1.5 },
    expert:      { name: 'طور المحترفين', desc: 'أندية مظلومة ونجوم التسعينات والألفينات. نقاطك × 2', lives: 3, time: 180, mult: 2 }
  };
  const CELL_PTS = 10;
  const BONUS = 40;

  const $ = id => document.getElementById(id);
  const screens = { menu: $('gMenu'), play: $('gPlay'), result: $('gResult') };
  const boardEl = $('gBoard'), inputEl = $('gInput'), guessBtn = $('gGuess'), sugEl = $('gSuggest');
  const hintEl = $('gHint'), optsEl = $('gOptions'), powersEl = $('gPowers');

  let game = null;
  let picked = null;
  let sugList = [];
  let sugIdx = -1;
  let timerId = null;

  const fmtTime = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };

  function show(name) {
    Object.keys(screens).forEach(k => { screens[k].hidden = k !== name; });
  }

  function isModeOpen(id) {
    if (id === 'classic' || !U) return true;
    return U.isUnlocked('modes', id);
  }

  /* ---------- قايمة الأطوار ---------- */
  function renderMenu() {
    const box = $('gModes');
    box.textContent = '';
    Object.keys(MODES).forEach(id => {
      const m = MODES[id];
      const open = isModeOpen(id);
      const b = el('button', 'g-mode' + (open ? '' : ' locked'));
      b.type = 'button';
      b.disabled = !open;
      const info = el('div', 'g-mode-info');
      info.append(el('b', '', m.name), el('small', '', m.desc));
      b.appendChild(info);
      if (open) {
        b.appendChild(el('span', 'g-mode-tag', 'ابدأ'));
      } else {
        const at = U && U.item('modes', id) ? U.item('modes', id).at : 0;
        b.appendChild(el('span', 'g-mode-tag', 'يفتح عند ' + at.toLocaleString('en-US')));
      }
      b.addEventListener('click', () => start(id));
      box.appendChild(b);
    });
  }

  /* ---------- بدء لعبة ---------- */
  function start(modeId) {
    if (!isModeOpen(modeId)) return;
    const grid = D.makeGrid(modeId);
    if (!grid) { hint('حصلت مشكلة في تجهيز الشبكة، جرب تاني.', true); return; }
    const m = MODES[modeId];
    game = {
      mode: modeId, grid, cfg: m,
      cells: Array(9).fill(null),
      used: new Set(),
      lives: m.lives, time: m.time, raw: 0,
      sel: -1, over: false,
      before: U ? U.getLifetime() : 0
    };
    picked = null;
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
    show('play');
    renderBoard();
    renderHud();
    renderPowers();
    setInput(false);
    hint('اختار مربع الأول');
  }

  function tick() {
    if (!game || game.over) return;
    game.time--;
    renderHud();
    if (game.time <= 0) finish('time');
  }

  /* ---------- الرسم ---------- */
  function headerCell(h) {
    const d = el('div', 'g-h');
    const img = document.createElement('img');
    img.src = h.img; img.alt = ''; img.loading = 'lazy';
    img.addEventListener('error', () => img.remove());
    d.append(img, el('span', '', h.ar));
    return d;
  }

  function renderBoard() {
    boardEl.textContent = '';
    const corner = el('div', 'g-corner');
    corner.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#icon-ball"></use></svg>';
    boardEl.appendChild(corner);
    game.grid.cols.forEach(h => boardEl.appendChild(headerCell(h)));
    for (let r = 0; r < 3; r++) {
      boardEl.appendChild(headerCell(game.grid.rows[r]));
      for (let c = 0; c < 3; c++) {
        const i = r * 3 + c;
        const b = el('button', 'g-c');
        b.type = 'button';
        b.dataset.i = i;
        b.setAttribute('aria-label', 'اختار لاعب للمربع');
        b.addEventListener('click', () => select(i));
        boardEl.appendChild(b);
      }
    }
    for (let i = 0; i < 9; i++) paintCell(i);
  }

  function paintCell(i) {
    const b = boardEl.querySelector('.g-c[data-i="' + i + '"]');
    if (!b) return;
    const p = game.cells[i];
    b.textContent = '';
    b.classList.toggle('done', !!p);
    b.classList.toggle('sel', game.sel === i && !p);
    if (p) {
      b.append(el('b', '', p.ar));
      b.disabled = true;
    } else {
      b.append(el('span', 'plus', '+'));
      b.disabled = game.over;
    }
  }

  function currentScore() { return Math.round(game.raw * game.cfg.mult); }

  function renderHud() {
    $('gTime').textContent = fmtTime(Math.max(0, game.time));
    $('gTime').classList.toggle('warn', game.time <= 20);
    $('gLives').textContent = '♥'.repeat(Math.max(0, game.lives)) || '0';
    $('gScore').textContent = currentScore();
  }

  function hint(msg, bad) {
    hintEl.textContent = msg;
    hintEl.classList.toggle('bad', !!bad);
  }

  function setInput(on) {
    inputEl.disabled = !on;
    if (!on) { inputEl.value = ''; picked = null; closeSug(); }
    guessBtn.disabled = true;
  }

  /* ---------- اختيار مربع ---------- */
  function select(i) {
    if (!game || game.over || game.cells[i]) return;
    const prev = game.sel;
    game.sel = i;
    if (prev > -1) paintCell(prev);
    paintCell(i);
    optsEl.hidden = true;
    optsEl.textContent = '';
    setInput(true);
    const r = Math.floor(i / 3), c = i % 3;
    hint(game.grid.rows[r].ar + '  ×  ' + game.grid.cols[c].ar);
    inputEl.focus();
    renderPowers();
  }

  /* ---------- الاقتراحات ---------- */
  function closeSug() { sugEl.hidden = true; sugEl.textContent = ''; sugList = []; sugIdx = -1; }

  function updateSug() {
    picked = null;
    guessBtn.disabled = true;
    const q = D.norm(inputEl.value);
    if (q.length < 2 || !game || game.sel < 0) { closeSug(); return; }
    sugList = D.PLAYERS.filter(p => !game.used.has(p.id) && p.key.indexOf(q) > -1).slice(0, 6);
    sugEl.textContent = '';
    sugIdx = -1;
    if (!sugList.length) { closeSug(); return; }
    sugList.forEach((p, idx) => {
      const li = el('li');
      li.append(el('span', '', p.ar), el('small', '', p.en));
      li.addEventListener('mousedown', e => { e.preventDefault(); choose(idx); });
      sugEl.appendChild(li);
    });
    sugEl.hidden = false;
    // لو الاسم مطابق تمامًا، اعتبره مختار
    const exact = sugList.filter(p => D.norm(p.ar) === q || D.norm(p.en) === q);
    if (exact.length === 1) { picked = exact[0]; guessBtn.disabled = false; }
  }

  function choose(idx) {
    const p = sugList[idx];
    if (!p) return;
    picked = p;
    inputEl.value = p.ar;
    closeSug();
    guessBtn.disabled = false;
    inputEl.focus();
  }

  inputEl.addEventListener('input', updateSug);
  inputEl.addEventListener('keydown', e => {
    if (sugEl.hidden) return;
    const items = sugEl.children;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      sugIdx = (sugIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      Array.from(items).forEach((li, i) => li.classList.toggle('act', i === sugIdx));
    } else if (e.key === 'Enter' && sugIdx > -1) {
      e.preventDefault();
      choose(sugIdx);
    } else if (e.key === 'Escape') {
      closeSug();
    }
  });
  inputEl.addEventListener('blur', () => setTimeout(closeSug, 120));

  $('gForm').addEventListener('submit', e => {
    e.preventDefault();
    if (picked) submit(picked);
  });

  /* ---------- التخمين ---------- */
  function submit(p) {
    if (!game || game.over || game.sel < 0 || game.used.has(p.id)) return;
    const i = game.sel;
    const row = game.grid.rows[Math.floor(i / 3)], col = game.grid.cols[i % 3];
    if (D.valid(p, row, col)) {
      game.cells[i] = p;
      game.used.add(p.id);
      game.raw += CELL_PTS;
      game.sel = -1;
      paintCell(i);
      setInput(false);
      optsEl.hidden = true;
      optsEl.textContent = '';
      renderHud();
      renderPowers();
      if (game.cells.every(Boolean)) { game.raw += BONUS; finish('win'); return; }
      hint('تمام! اختار مربع تاني');
    } else {
      game.lives--;
      renderHud();
      const b = boardEl.querySelector('.g-c[data-i="' + i + '"]');
      b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
      inputEl.value = ''; picked = null; guessBtn.disabled = true; closeSug();
      hint(p.ar + ' ما لعبش للفريقين دول', true);
      if (game.lives <= 0) finish('lives');
    }
  }

  /* ---------- المساعدات ---------- */
  const POWERS = [
    { id: 'eliminate', label: 'حذف إجابتين', needCell: true },
    { id: 'time', label: '+15 ثانية', needCell: false },
    { id: 'reveal', label: 'كشف تلميح', needCell: true }
  ];

  function renderPowers() {
    powersEl.textContent = '';
    if (!U) return;
    const inv = U.getInventory();
    POWERS.forEach(pw => {
      const b = el('button', 'g-pw');
      b.type = 'button';
      b.append(el('span', '', pw.label), el('em', '', 'x' + (inv[pw.id] || 0)));
      b.disabled = !game || game.over;
      b.addEventListener('click', () => usePower(pw));
      powersEl.appendChild(b);
    });
  }

  function validUnused(i) {
    const row = game.grid.rows[Math.floor(i / 3)], col = game.grid.cols[i % 3];
    return D.PLAYERS.filter(p => !game.used.has(p.id) && D.valid(p, row, col));
  }

  function usePower(pw) {
    if (!game || game.over || !U) return;
    if (!U.getInventory()[pw.id]) { U.openCenter('shop'); return; }
    if (pw.needCell && game.sel < 0) { hint('اختار مربع الأول وبعدين استخدم المساعدة', true); return; }

    if (pw.id === 'time') {
      if (!U.usePowerup('time')) return;
      game.time += 15;
      renderHud();
      hint('اتزاد 15 ثانية');
    } else {
      const ok = validUnused(game.sel);
      if (!ok.length) { hint('مفيش إجابة متاحة للمربع ده', true); return; }
      if (!U.usePowerup(pw.id)) return;
      const ans = ok[Math.floor(Math.random() * ok.length)];
      if (pw.id === 'reveal') {
        hint('تلميح: جنسيته ' + (D.NAT_AR[ans.nat] || '') + '، ومركزه ' + (D.POS_AR[ans.pos] || ''));
      } else {
        const row = game.grid.rows[Math.floor(game.sel / 3)], col = game.grid.cols[game.sel % 3];
        const wrong = D.shuffle(D.PLAYERS.filter(p => !game.used.has(p.id) && !D.valid(p, row, col))).slice(0, 2);
        const opts = D.shuffle([ans].concat(wrong));
        optsEl.textContent = '';
        opts.forEach(p => {
          const b = el('button', 'g-opt', p.ar);
          b.type = 'button';
          b.addEventListener('click', () => { optsEl.hidden = true; submit(p); });
          optsEl.appendChild(b);
        });
        optsEl.hidden = false;
        hint('واحد منهم بس هو الصح');
      }
    }
    renderPowers();
  }

  /* ---------- النهاية والنقاط ---------- */
  function saveStats(points) {
    try {
      const st = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      st.gamesPlayed = (Number(st.gamesPlayed) || 0) + 1;
      st.bestScore = Math.max(Number(st.bestScore) || 0, points);
      st.totalPoints = (Number(st.totalPoints) || 0) + points;
      localStorage.setItem(STATS_KEY, JSON.stringify(st));
      // خلّي شريط التقدم يتحدث
      window.dispatchEvent(new StorageEvent('storage', { key: STATS_KEY }));
    } catch (e) { /* ignore */ }
  }

  function finish(reason) {
    if (!game || game.over) return;
    game.over = true;
    clearInterval(timerId);
    const pts = currentScore();
    if (pts > 0) saveStats(pts);

    const titles = { win: 'كملت الشبكة!', lives: 'خلصت الأرواح', time: 'الوقت خلص' };
    $('rTitle').textContent = titles[reason] || 'خلصت اللعبة';
    const filled = game.cells.filter(Boolean).length;
    $('rSub').textContent = 'جاوبت ' + filled + ' من 9 • ' + MODES[game.mode].name;
    $('rPts').textContent = pts;

    const list = $('rUnlocked');
    list.textContent = '';
    if (U) {
      const gained = U.unlockedBetween(game.before, U.getLifetime());
      const labels = { modes: 'طور', titles: 'لقب', frames: 'إطار', avatars: 'أفاتار', themes: 'ثيم' };
      gained.forEach(g => list.appendChild(el('li', '', 'اتفتح ' + labels[g.type] + ': ' + g.item.name)));
      list.hidden = !gained.length;
    } else list.hidden = true;

    show('result');
    renderMenu();
  }

  $('rAgain').addEventListener('click', () => start(game ? game.mode : 'classic'));
  $('rMenu').addEventListener('click', () => { renderMenu(); show('menu'); });
  $('gReset').addEventListener('click', () => {
    if (!game) return;
    if (!game.over && game.raw > 0) finish('lives'); else start(game.mode);
  });

  if (U) U.onChange(() => { if (!screens.menu.hidden) renderMenu(); if (game && !screens.play.hidden) renderPowers(); });
  renderMenu();
  show('menu');
})();
