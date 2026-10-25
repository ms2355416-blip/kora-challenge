/* Kora Challenge — الشات العالمي (الرئيسية). بيحتاج Firebase Realtime Database وقواعد chat (في تعليمات-الشات.md) */
(() => {
  'use strict';
  const MAX_LEN = 200, KEEP = 60, GAP_MS = 2000, SEEN_KEY = 'koraChatSeen';
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };

  function init() {
    if (!window.firebase || !firebase.database) return;
    const bar = document.querySelector('.header-actions');
    if (!bar || document.getElementById('chatBtn')) return;

    let db, ref;
    try { db = firebase.database(); ref = db.ref('chat/global'); } catch (e) { return; }

    /* ---- الواجهة ---- */
    const btn = el('button', 'chat-btn'); btn.id = 'chatBtn'; btn.type = 'button';
    btn.setAttribute('aria-label', 'الشات العالمي'); btn.title = 'الشات العالمي';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4"/></svg>';
    const badge = el('span', 'chat-badge'); badge.hidden = true; btn.appendChild(badge);
    bar.prepend(btn);

    const overlay = el('div', 'chat-overlay');
    const panel = el('section', 'chat-panel'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'الشات العالمي');
    const head = el('div', 'chat-head');
    const title = el('div', 'chat-title'); title.append(el('b', '', 'الشات العالمي'), el('small', '', 'كل اللاعبين بيتكلموا هنا'));
    const close = el('button', 'chat-close'); close.type = 'button'; close.setAttribute('aria-label', 'إغلاق'); close.textContent = '×';
    head.append(title, close);
    const list = el('div', 'chat-list'); list.setAttribute('aria-live', 'polite');
    const empty = el('div', 'chat-empty', 'لسه مفيش رسايل. ابدأ الكلام!');
    list.appendChild(empty);
    const note = el('div', 'chat-note'); note.hidden = true;
    const form = el('form', 'chat-form'); form.autocomplete = 'off';
    const input = el('input', 'chat-input'); input.type = 'text'; input.maxLength = MAX_LEN; input.placeholder = 'اكتب رسالة...'; input.setAttribute('aria-label', 'رسالتك');
    const send = el('button', 'chat-send', 'إرسال'); send.type = 'submit';
    form.append(input, send);
    panel.append(head, list, note, form);
    document.body.append(overlay, panel);

    /* ---- الحالة ---- */
    let open = false, loaded = false, unread = 0, lastSend = 0;
    const seen = new Set();
    const me = () => (window.KoraAuth && window.KoraAuth.user) || (firebase.auth && firebase.auth().currentUser) || null;
    const myName = () => { const u = me(); return u ? (u.displayName || (u.email ? u.email.split('@')[0] : '') || 'لاعب') : 'لاعب'; };
    const lastSeen = () => { try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch (e) { return 0; } };
    const markSeen = t => { try { localStorage.setItem(SEEN_KEY, String(t || Date.now())); } catch (e) { /* ignore */ } };
    let newest = 0;

    function setBadge() { badge.hidden = !unread; badge.textContent = unread > 99 ? '99+' : String(unread); }
    function nearBottom() { return list.scrollHeight - list.scrollTop - list.clientHeight < 80; }
    function toBottom() { list.scrollTop = list.scrollHeight; }
    const hhmm = t => { const d = new Date(t); return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); };

    function addMessage(key, m) {
      if (seen.has(key) || !m || typeof m.text !== 'string') return;
      seen.add(key);
      if (empty.parentNode) empty.remove();
      const u = me(), mine = u && m.uid === u.uid;
      const row = el('div', 'chat-msg' + (mine ? ' mine' : ''));
      const bub = el('div', 'chat-bubble');
      if (!mine) bub.appendChild(el('b', 'chat-name', String(m.name || 'لاعب').slice(0, 30)));
      bub.appendChild(el('span', 'chat-text', m.text.slice(0, MAX_LEN)));
      bub.appendChild(el('small', 'chat-time', m.t ? hhmm(m.t) : ''));
      row.appendChild(bub);
      const stick = nearBottom() || mine;
      list.appendChild(row);
      while (list.children.length > KEEP + 20) list.firstChild.remove();
      if (m.t > newest) newest = m.t;
      if (open) { if (stick) toBottom(); markSeen(newest); }
      else if (loaded && !mine && m.t > lastSeen()) { unread++; setBadge(); }
    }

    function openPanel() {
      open = true; document.body.classList.add('chat-lock');
      overlay.classList.add('open'); panel.classList.add('open');
      unread = 0; setBadge(); markSeen(newest || Date.now());
      setTimeout(() => { toBottom(); input.focus(); }, 60);
    }
    function closePanel() {
      open = false; document.body.classList.remove('chat-lock');
      overlay.classList.remove('open'); panel.classList.remove('open');
      btn.focus();
    }
    btn.addEventListener('click', () => (open ? closePanel() : openPanel()));
    close.addEventListener('click', closePanel);
    overlay.addEventListener('click', closePanel);
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) closePanel(); });

    function say(t) { note.textContent = t; note.hidden = !t; if (t) setTimeout(() => { note.hidden = true; }, 3500); }

    form.addEventListener('submit', e => {
      e.preventDefault();
      const text = input.value.replace(/\s+/g, ' ').trim();
      const u = me();
      if (!text) return;
      if (!u) { say('لازم تسجل دخول الأول.'); return; }
      const wait = GAP_MS - (Date.now() - lastSend);
      if (wait > 0) { say('استنى ثانية قبل الرسالة الجاية.'); return; }
      lastSend = Date.now();
      send.disabled = true;
      ref.push({ uid: u.uid, name: myName().slice(0, 30), text: text.slice(0, MAX_LEN), t: firebase.database.ServerValue.TIMESTAMP })
        .then(() => { input.value = ''; })
        .catch(() => say('مقدرناش نبعت الرسالة. اتأكد من النت أو من قواعد Firebase.'))
        .then(() => { send.disabled = false; input.focus(); });
    });

    /* ---- الاستماع للرسايل ---- */
    const q = ref.limitToLast(KEEP);
    q.on('child_added', s => addMessage(s.key, s.val()), () => { empty.textContent = 'الشات مش متاح دلوقتي (راجع قواعد Firebase).'; });
    q.once('value').then(() => { loaded = true; }).catch(() => { loaded = true; });
  }

  /* ننتظر تسجيل الدخول (الحارس بيظهر الصفحة بعد ما يتأكد) */
  function boot() {
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if ((window.KoraAuth && window.KoraAuth.user) || tries > 40) { clearInterval(t); if (window.KoraAuth && window.KoraAuth.user) init(); }
    }, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
