/* Kora Challenge — نظام المكافآت (Unlocks)
   - الفتح بالمستويات بيعتمد على "مجموع النقاط الكلي" (عمره ما بيقل).
   - المساعدات بتتشرى من "الرصيد" = مجموع النقاط - اللي اتصرف.
   - الترتيب العالمي مش بيتأثر بالشراء أبدًا.
   لازم يتحمّل بعد firebase-app/auth/database وقبل points-sync.js */
(() => {
  'use strict';

  const STATS_KEY = 'koraChallengeStats';
  const STORE_KEY = 'koraUnlocks';
  const MAX_STACK = 20;
  const root = document.documentElement;

  /* ---------- أيقونات الأفاتار (SVG داخلي) ---------- */
  const AV_PATHS = {
    ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7.2l4 2.9-1.5 4.7h-5L8 10.1z"/><path d="M12 7.2V3M16 10.1l4-1.3M14.5 14.8l2.4 3.6M9.5 14.8l-2.4 3.6M8 10.1L4 8.8"/>',
    bolt: '<path d="M13 2 4 13h7l-1 9 10-13h-7z"/>',
    star: '<path d="m12 2 3 6.5 7 1-5 5 1.2 7L12 18l-6.2 3.5 1.2-7-5-5 7-1z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
    crown: '<path d="M2 18h20M3 7l4.5 5L12 5l4.5 7L21 7l-2 11H5z"/>'
  };

  function avatarSVG(id, cls) {
    const p = AV_PATHS[id];
    if (!p) return '';
    return '<svg class="kavatar ' + (cls || '') + '" data-id="' + id + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  /* ---------- الكتالوج (عدّل الأرقام براحتك) ---------- */
  const CATALOG = {
    modes: [
      { id: 'classic', name: 'كلاسيك', desc: 'الطور العادي. متاح من البداية.', at: 0 },
      { id: 'suddenDeath', name: 'الموت المفاجئ', desc: 'غلطة واحدة وتخلص اللعبة. نقاطك × 1.5', at: 800 },
      { id: 'expert', name: 'طور المحترفين', desc: 'لاعبين التسعينات والألفينات والأندية المظلومة. نقاطك × 2', at: 1500 }
    ],
    powerups: [
      { id: 'eliminate', name: 'حذف إجابتين', desc: 'بيقلل الاختيارات لـ 3 أسماء، واحد منهم صح.', price: 60 },
      { id: 'time', name: '+15 ثانية', desc: 'بيزود 15 ثانية على العداد.', price: 80 },
      { id: 'reveal', name: 'كشف الجنسية والمركز', desc: 'بيكشفلك جنسية ومركز لاعب إجابته صح.', price: 50 }
    ],
    titles: [
      { id: 'rookie', name: 'ناشئ', at: 0 },
      { id: 'starter', name: 'لاعب أساسي', at: 300 },
      { id: 'fan', name: 'مشجع متعصب', at: 800 },
      { id: 'captain', name: 'كابتن الفريق', at: 1500 },
      { id: 'coach', name: 'مديراً فنياً', at: 3000 },
      { id: 'tactician', name: 'أسطورة التكتيك', at: 6000 }
    ],
    frames: [
      { id: 'none', name: 'بدون إطار', at: 0 },
      { id: 'bronze', name: 'إطار برونزي', at: 500 },
      { id: 'silver', name: 'إطار فضي', at: 1200 },
      { id: 'gold', name: 'إطار ذهبي', at: 2500 },
      { id: 'neon', name: 'إطار نيون', at: 4500 },
      { id: 'legend', name: 'إطار أسطوري', at: 8000 }
    ],
    avatars: [
      { id: 'none', name: 'الحرف الأول', at: 0 },
      { id: 'ball', name: 'الكورة', at: 100 },
      { id: 'bolt', name: 'الصاعقة', at: 300 },
      { id: 'star', name: 'النجم', at: 700 },
      { id: 'shield', name: 'الدرع', at: 1500 },
      { id: 'flame', name: 'اللهب', at: 2500 },
      { id: 'trophy', name: 'الكأس', at: 4000 },
      { id: 'crown', name: 'التاج', at: 7000 }
    ],
    themes: [
      { id: 'default', name: 'الافتراضي', at: 0, sw: ['#080d0b', '#24e982'] },
      { id: 'night', name: 'ملعب ليلي', at: 1000, sw: ['#050b14', '#35d6ff'] },
      { id: 'sunset', name: 'غروب ذهبي', at: 2200, sw: ['#140d06', '#f6c445'] },
      { id: 'neon', name: 'أرينا نيون', at: 3500, sw: ['#07040f', '#c15cff'] },
      { id: 'grass', name: 'عشب كلاسيكي', at: 5000, sw: ['#0f2a14', '#9dff6a'] }
    ]
  };

  const EQ_KEYS = { titles: 'title', frames: 'frame', avatars: 'avatar', themes: 'theme' };
  const UNLOCKABLE = ['modes', 'titles', 'frames', 'avatars', 'themes'];
  const TABS = [['shop', 'المتجر'], ['modes', 'الأطوار'], ['titles', 'الألقاب'], ['frames', 'الإطارات'], ['avatars', 'الأفاتار'], ['themes', 'الثيمات']];

  const find = (type, id) => (CATALOG[type] || []).find(i => i.id === id) || null;
  const fmt = n => Number(n).toLocaleString('en-US');
  const clampInt = (v, min, max) => Math.min(max, Math.max(min, Math.floor(Number(v) || 0)));

  /* ---------- الحالة ---------- */
  function defaults() {
    return {
      spent: 0,
      inv: { eliminate: 0, time: 0, reveal: 0 },
      eq: { title: 'rookie', frame: 'none', avatar: 'none', theme: 'default' },
      u: 0
    };
  }

  function sanitize(raw) {
    const s = defaults();
    if (!raw || typeof raw !== 'object') return s;
    s.spent = clampInt(raw.spent, 0, 1e9);
    CATALOG.powerups.forEach(p => { s.inv[p.id] = clampInt(raw.inv && raw.inv[p.id], 0, MAX_STACK); });
    const e = raw.eq || {};
    Object.keys(EQ_KEYS).forEach(type => {
      const key = EQ_KEYS[type];
      if (find(type, e[key])) s.eq[key] = e[key];
    });
    s.u = clampInt(raw.u, 0, 1e15);
    return s;
  }

  let state = defaults();
  try { state = sanitize(JSON.parse(localStorage.getItem(STORE_KEY) || 'null')); } catch (e) { state = defaults(); }

  function localTotal() {
    try {
      const st = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
      return Math.max(0, Math.floor(Number(st.totalPoints) || 0));
    } catch (e) { return 0; }
  }

  let remoteBest = 0;
  let user = null;
  let pushTimer = null;

  const getLifetime = () => Math.max(localTotal(), remoteBest);
  const getBalance = () => Math.max(0, getLifetime() - state.spent);
  const isUnlocked = (type, id) => { const it = find(type, id); return !!it && (it.at || 0) <= getLifetime(); };

  /* ---------- Firebase ---------- */
  function ref(path) {
    try {
      if (user && typeof firebase !== 'undefined' && firebase.database) return firebase.database().ref(path);
    } catch (e) { /* ignore */ }
    return null;
  }

  function pushRemote() {
    if (!user) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      const r = ref('users/' + user.uid + '/unlocks');
      if (r) r.set(state).catch(() => { /* القواعد ممكن تمنع الكتابة، الحفظ المحلي شغال */ });
    }, 1200);
  }

  function persistLocal() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function save() {
    state.u = Date.now();
    persistLocal();
    pushRemote();
    emit();
  }

  /* ---------- مستمعين ---------- */
  const listeners = [];
  function onChange(fn) {
    listeners.push(fn);
    return () => { const i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); };
  }

  function emit() {
    applyTheme();
    decorateAvatars();
    listeners.slice().forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
    try { window.dispatchEvent(new CustomEvent('kora-unlocks-change')); } catch (e) { /* ignore */ }
  }

  /* ---------- الشراء والاستخدام ---------- */
  function buyPowerup(id, qty) {
    const p = find('powerups', id);
    qty = qty || 1;
    if (!p) return { ok: false, reason: 'unknown' };
    if (state.inv[id] + qty > MAX_STACK) return { ok: false, reason: 'max' };
    const cost = p.price * qty;
    if (getBalance() < cost) return { ok: false, reason: 'balance' };
    state.spent += cost;
    state.inv[id] += qty;
    save();
    return { ok: true };
  }

  function usePowerup(id) {
    if (!state.inv[id] || state.inv[id] < 1) return false;
    state.inv[id] -= 1;
    save();
    return true;
  }

  function equip(type, id) {
    if (!EQ_KEYS[type] || !find(type, id) || !isUnlocked(type, id)) return false;
    state.eq[EQ_KEYS[type]] = id;
    save();
    return true;
  }

  const getEquipped = () => Object.assign({}, state.eq);
  const getInventory = () => Object.assign({}, state.inv);

  function unlockedBetween(from, to) {
    const out = [];
    UNLOCKABLE.forEach(type => {
      CATALOG[type].forEach(item => {
        if (item.at > 0 && item.at > from && item.at <= to) out.push({ type, item });
      });
    });
    return out.sort((a, b) => a.item.at - b.item.at);
  }

  function nextUnlock() {
    const life = getLifetime();
    let next = null;
    let prevAt = 0;
    UNLOCKABLE.forEach(type => {
      CATALOG[type].forEach(item => {
        if (item.at <= life) { if (item.at > prevAt) prevAt = item.at; }
        else if (!next || item.at < next.item.at) next = { type, item };
      });
    });
    if (!next) return { done: true, life, pct: 100 };
    const span = next.item.at - prevAt;
    return {
      done: false, type: next.type, item: next.item, life, prevAt,
      remaining: next.item.at - life,
      pct: Math.max(0, Math.min(100, ((life - prevAt) / span) * 100))
    };
  }

  const TYPE_LABEL = { modes: 'طور', titles: 'لقب', frames: 'إطار', avatars: 'أفاتار', themes: 'ثيم' };

  /* ---------- أدوات DOM ---------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  const LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
  const GIFT_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12v9H4v-9"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>';
  const CLOSE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  /* ---------- رسالة صغيرة ---------- */
  let toastEl = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = el('div', 'unl-toast');
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  /* ---------- الثيمات ---------- */
  function applyTheme() {
    const t = state.eq.theme;
    if (t && t !== 'default') root.setAttribute('data-stadium', t);
    else root.removeAttribute('data-stadium');
  }

  /* ---------- الإطارات والأفاتار (حساب + هيدر) ---------- */
  function initialName() {
    let name = 'لاعب';
    try {
      const u = firebase.auth().currentUser;
      if (u) name = u.displayName || (u.email ? u.email.split('@')[0] : '') || 'لاعب';
    } catch (e) { /* ignore */ }
    return (Array.from(name.trim())[0] || 'L').toUpperCase();
  }

  let decoQueued = false;
  function decorateAvatars() {
    if (decoQueued) return;
    decoQueued = true;
    requestAnimationFrame(() => {
      decoQueued = false;
      const frame = state.eq.frame;
      const av = state.eq.avatar;
      document.querySelectorAll('.acc-avatar, .acc-head-btn').forEach(box => {
        Array.from(box.classList).forEach(c => {
          if (/^kframe-/.test(c) && c !== 'kframe-' + frame) box.classList.remove(c);
        });
        if (frame && frame !== 'none') {
          if (!box.classList.contains('kframe')) box.classList.add('kframe');
          if (!box.classList.contains('kframe-' + frame)) box.classList.add('kframe-' + frame);
        } else if (box.classList.contains('kframe')) {
          box.classList.remove('kframe');
        }

        const hasImg = box.querySelector('img');
        const svgEl = box.querySelector('svg.kavatar');
        if (hasImg) { if (svgEl) svgEl.remove(); return; }
        if (av && av !== 'none') {
          if (!svgEl || svgEl.getAttribute('data-id') !== av) box.innerHTML = avatarSVG(av);
        } else if (svgEl) {
          box.textContent = initialName();
        }
      });
    });
  }

  /* ---------- شريط التقدم ---------- */
  const mounted = [];

  function renderProgress(box) {
    const n = nextUnlock();
    box.textContent = '';
    box.classList.add('unl-progress');

    const top = el('div', 'unl-p-top');
    const title = el('span', 'unl-p-title');
    if (n.done) {
      title.textContent = 'فتحت كل المكافآت. إنت أسطورة!';
    } else {
      title.append('المكافأة الجاية: ');
      title.appendChild(el('b', '', TYPE_LABEL[n.type] + ' ' + n.item.name));
    }
    const open = el('button', 'unl-p-open', 'المكافآت');
    open.type = 'button';
    open.addEventListener('click', () => openCenter());
    top.append(title, open);

    const track = el('div', 'unl-track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(Math.round(n.pct)));
    const fill = el('i');
    fill.style.width = n.pct + '%';
    track.appendChild(fill);

    const meta = el('div', 'unl-p-meta');
    meta.appendChild(el('span', '', fmt(getLifetime()) + ' نقطة'));
    meta.appendChild(el('span', '', n.done ? '100%' : 'باقي ' + fmt(n.remaining) + ' نقطة'));

    box.append(top, track, meta);
  }

  function mountProgress(box) {
    if (!box || mounted.some(m => m.box === box)) return;
    mounted.push({ box });
    renderProgress(box);
  }

  onChange(() => {
    for (let i = mounted.length - 1; i >= 0; i--) {
      if (!mounted[i].box.isConnected) mounted.splice(i, 1);
      else renderProgress(mounted[i].box);
    }
  });

  /* ---------- مركز المكافآت (المتجر + القوايم) ---------- */
  let overlay = null;
  let bodyEl = null;
  let balEl = null;
  let tabsEl = null;
  let curTab = 'shop';

  function buildCenter() {
    overlay = el('div', 'unl-overlay');
    const modal = el('section', 'unl-modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'المكافآت');

    const head = el('div', 'unl-head');
    const h = el('h2', '', 'المكافآت');
    balEl = el('span', 'unl-bal');
    const close = el('button', 'unl-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'إغلاق');
    close.innerHTML = CLOSE_SVG;
    close.addEventListener('click', closeCenter);
    head.append(h, balEl, close);

    const prog = el('div');
    prog.className = 'unl-modal-progress';
    tabsEl = el('div', 'unl-tabs');
    tabsEl.setAttribute('role', 'tablist');
    bodyEl = el('div', 'unl-body');

    modal.append(head, prog, tabsEl, bodyEl);
    overlay.appendChild(modal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeCenter(); });
    document.body.appendChild(overlay);
    mountProgress(prog);

    TABS.forEach(([id, label]) => {
      const b = el('button', 'unl-tab', label);
      b.type = 'button';
      b.dataset.tab = id;
      b.setAttribute('role', 'tab');
      b.addEventListener('click', () => { curTab = id; renderCenter(); });
      tabsEl.appendChild(b);
    });
  }

  function previewFor(type, item) {
    const p = el('div', 'unl-prev');
    if (type === 'titles') {
      p.appendChild(el('span', 'unl-title-chip', item.name));
    } else if (type === 'frames') {
      const c = el('span', 'unl-frame-demo' + (item.id !== 'none' ? ' kframe kframe-' + item.id : ''));
      c.innerHTML = avatarSVG('ball');
      p.appendChild(c);
    } else if (type === 'avatars') {
      const c = el('span', 'unl-av-demo');
      if (item.id === 'none') c.textContent = 'أ'; else c.innerHTML = avatarSVG(item.id);
      p.appendChild(c);
    } else if (type === 'themes') {
      const c = el('span', 'unl-sw');
      c.style.background = 'linear-gradient(135deg,' + item.sw[0] + ' 55%,' + item.sw[1] + ' 55%)';
      p.appendChild(c);
    } else if (type === 'modes') {
      p.appendChild(el('span', 'unl-mode-chip', item.id === 'expert' ? 'x2' : item.id === 'suddenDeath' ? 'x1.5' : 'x1'));
    }
    return p;
  }

  function itemCard(type, item) {
    const life = getLifetime();
    const unlocked = isUnlocked(type, item.id);
    const card = el('div', 'unl-card' + (unlocked ? '' : ' locked'));
    card.appendChild(previewFor(type, item));

    const info = el('div', 'unl-info');
    info.appendChild(el('b', 'unl-name', item.name));
    if (item.desc) info.appendChild(el('small', 'unl-desc', item.desc));
    card.appendChild(info);

    const act = el('div', 'unl-act');
    if (!unlocked) {
      const lock = el('span', 'unl-lockmsg');
      lock.innerHTML = LOCK_SVG;
      lock.appendChild(el('span', '', 'يفتح عند ' + fmt(item.at) + ' نقطة (باقي ' + fmt(item.at - life) + ')'));
      act.appendChild(lock);
    } else if (EQ_KEYS[type]) {
      const on = state.eq[EQ_KEYS[type]] === item.id;
      const b = el('button', 'unl-btn' + (on ? ' on' : ''), on ? 'مفعّل' : 'استخدم');
      b.type = 'button';
      b.disabled = on;
      b.addEventListener('click', () => { if (equip(type, item.id)) toast('تم تفعيل ' + item.name); });
      act.appendChild(b);
    } else {
      act.appendChild(el('span', 'unl-open', 'مفتوح'));
    }
    card.appendChild(act);
    return card;
  }

  function powerCard(item) {
    const card = el('div', 'unl-card');
    const prev = el('div', 'unl-prev');
    prev.appendChild(el('span', 'unl-own', 'x' + state.inv[item.id]));
    card.appendChild(prev);

    const info = el('div', 'unl-info');
    info.appendChild(el('b', 'unl-name', item.name));
    info.appendChild(el('small', 'unl-desc', item.desc));
    card.appendChild(info);

    const act = el('div', 'unl-act');
    const b = el('button', 'unl-btn', 'اشتري ' + fmt(item.price));
    b.type = 'button';
    const full = state.inv[item.id] >= MAX_STACK;
    b.disabled = full || getBalance() < item.price;
    if (full) b.textContent = 'المخزون ممتلئ';
    b.addEventListener('click', () => {
      const r = buyPowerup(item.id);
      if (r.ok) toast('اشتريت ' + item.name);
      else toast(r.reason === 'balance' ? 'رصيدك مش كفاية' : 'مش هينفع تشتري');
    });
    act.appendChild(b);
    card.appendChild(act);
    return card;
  }

  function renderCenter() {
    if (!overlay) return;
    balEl.textContent = 'رصيدك: ' + fmt(getBalance());
    tabsEl.querySelectorAll('.unl-tab').forEach(b => {
      const on = b.dataset.tab === curTab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    bodyEl.textContent = '';
    if (curTab === 'shop') {
      bodyEl.appendChild(el('p', 'unl-note', 'بتشتري المساعدات من رصيدك. الشراء مش بيقلل ترتيبك العالمي.'));
      CATALOG.powerups.forEach(p => bodyEl.appendChild(powerCard(p)));
    } else {
      CATALOG[curTab].forEach(i => bodyEl.appendChild(itemCard(curTab, i)));
    }
  }

  onChange(() => { if (overlay && overlay.classList.contains('open')) renderCenter(); });

  function openCenter(tab) {
    if (!overlay) buildCenter();
    if (tab && TABS.some(t => t[0] === tab)) curTab = tab;
    renderCenter();
    overlay.classList.add('open');
    document.body.classList.add('unl-lock');
  }

  function closeCenter() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.classList.remove('unl-lock');
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCenter(); });

  /* ---------- تشغيل ---------- */
  function mountHeaderButton() {
    const actions = document.querySelector('.header-actions');
    if (!actions || actions.querySelector('.unl-head-btn')) return;
    const b = el('button', 'unl-head-btn');
    b.type = 'button';
    b.title = 'المكافآت';
    b.setAttribute('aria-label', 'المكافآت');
    b.innerHTML = GIFT_SVG;
    b.addEventListener('click', () => openCenter());
    actions.prepend(b);
  }

  function boot() {
    mountHeaderButton();
    document.querySelectorAll('[data-unlock-progress]').forEach(mountProgress);

    // الصفحة الرئيسية: شريط التقدم تحت الإحصائيات
    const strip = document.querySelector('.stats-strip');
    if (strip && !document.querySelector('.unl-wrap')) {
      const wrap = el('section', 'unl-wrap');
      const box = el('div');
      wrap.appendChild(box);
      strip.after(wrap);
      mountProgress(box);
    }

    document.addEventListener('click', e => {
      const t = e.target.closest && e.target.closest('[data-open-unlocks]');
      if (t) openCenter(t.getAttribute('data-open-unlocks') || undefined);
    });

    new MutationObserver(decorateAvatars).observe(document.body, { childList: true, subtree: true });
    decorateAvatars();
    window.addEventListener('storage', e => { if (e.key === STATS_KEY || e.key === STORE_KEY) { if (e.key === STORE_KEY) { try { state = sanitize(JSON.parse(e.newValue || 'null')); } catch (x) { /* ignore */ } } emit(); } });
  }

  function initAuth() {
    if (typeof firebase === 'undefined' || !firebase.auth) return;
    firebase.auth().onAuthStateChanged(u => {
      user = u || null;
      if (!user) return;

      const lb = ref('leaderboard/' + user.uid + '/points');
      if (lb) {
        lb.once('value').then(s => { remoteBest = clampInt(s.val(), 0, 1e9); emit(); }).catch(() => {});
      }

      const r = ref('users/' + user.uid + '/unlocks');
      if (r) {
        r.once('value').then(s => {
          const v = s.val();
          if (v) {
            const rs = sanitize(v);
            if (rs.u > state.u) { state = rs; persistLocal(); emit(); }
            else if (state.u > rs.u) pushRemote();
          } else if (state.u) {
            pushRemote();
          }
        }).catch(() => {});
      }
      emit();
    });
  }

  applyTheme();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  initAuth();

  window.KoraUnlocks = {
    catalog: CATALOG,
    item: find,
    getLifetime, getBalance, isUnlocked,
    buyPowerup, usePowerup, getInventory,
    equip, getEquipped,
    nextUnlock, unlockedBetween,
    onChange, openCenter, closeCenter, mountProgress,
    avatarSVG, toast
  };
})();
