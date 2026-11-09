/* Kora Challenge — الشات العالمي (الرئيسية). بيحتاج Firebase Realtime Database وقواعد chat (في تعليمات-الشات.md) */
(() => {
  'use strict';
  const MAX_LEN = 200, KEEP = 60, GAP_MS = 2000, SEEN_KEY = 'koraChatSeen', MAX_REC_S = 30;
  const Sec = window.KoraSec || { clean: s => String(s || '').trim(), name: s => String(s || '').trim(), limit: () => 0, isAudioDataUrl: s => typeof s === 'string' && s.indexOf('data:audio/') === 0 };
  const CLUBS = [['liv', 'ليفربول'], ['mun', 'مانشستر يونايتد'], ['mci', 'مانشستر سيتي'], ['ars', 'أرسنال'], ['che', 'تشيلسي'], ['tot', 'توتنهام'], ['rma', 'ريال مدريد'], ['fcb', 'برشلونة'], ['atm', 'أتلتيكو مدريد'], ['acm', 'ميلان'], ['int', 'إنتر'], ['juv', 'يوفنتوس'], ['rom', 'روما'], ['bay', 'بايرن ميونخ'], ['dor', 'دورتموند'], ['psg', 'باريس سان جيرمان'], ['ahl', 'الأهلي المصري'], ['zam', 'الزمالك'], ['hil', 'الهلال'], ['nas', 'النصر'], ['ben', 'بنفيكا'], ['por', 'بورتو'], ['ajx', 'أياكس'], ['nt', 'منتخب مصر']];
  const ROOM_KEY = 'koraChatGroup', CLUB_KEY = 'koraChatClub', BLOCK_KEY = 'koraChatBlocked';
  const store = { get: k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }, set: (k, v) => { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* ignore */ } } };
  const getBlocked = () => { try { const b = JSON.parse(store.get(BLOCK_KEY) || '[]'); return Array.isArray(b) ? b : []; } catch (e) { return []; } };
  const genCode = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.random() * 32 | 0]).join('');
  const cleanCode = v => String(v || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 5);
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
    const title = el('div', 'chat-title'); const titleB = el('b', '', 'الشات العالمي'), titleS = el('small', '', 'كل اللاعبين بيتكلموا هنا'); title.append(titleB, titleS);
    const close = el('button', 'chat-close'); close.type = 'button'; close.setAttribute('aria-label', 'إغلاق'); close.textContent = '×';
    head.append(title, close);
    const list = el('div', 'chat-list'); list.setAttribute('aria-live', 'polite');
    const empty = el('div', 'chat-empty', 'لسه مفيش رسايل. ابدأ الكلام!');
    list.appendChild(empty);
    const note = el('div', 'chat-note'); note.hidden = true;
    const form = el('form', 'chat-form'); form.autocomplete = 'off';
    const input = el('input', 'chat-input'); input.type = 'text'; input.maxLength = MAX_LEN; input.placeholder = 'اكتب رسالة...'; input.setAttribute('aria-label', 'رسالتك');
    const send = el('button', 'chat-send', 'إرسال'); send.type = 'submit';
    const MIC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>';
    const mic = el('button', 'chat-mic'); mic.type = 'button'; mic.setAttribute('aria-label', 'تسجيل رسالة صوتية'); mic.title = 'رسالة صوتية'; mic.innerHTML = MIC;
    const recBar = el('div', 'chat-rec'); recBar.hidden = true;
    const recCancel = el('button', 'chat-rec-x'); recCancel.type = 'button'; recCancel.setAttribute('aria-label', 'إلغاء التسجيل'); recCancel.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    const recDot = el('i', 'chat-rec-dot'), recTime = el('b', 'chat-rec-t', '0:00'), recGo = el('button', 'chat-send', 'إرسال'); recGo.type = 'button';
    recBar.append(recCancel, recDot, recTime, recGo);
    form.append(input, mic, send, recBar);
    const roomBar = el('div', 'chat-rooms'), subBar = el('div', 'chat-sub'), picker = el('div', 'chat-picker');
    subBar.hidden = true; picker.hidden = true;
    const chips = {};
    [['global', 'العالمي'], ['group', 'الشلة'], ['club', 'ناديي']].forEach(x => {
      const b = el('button', 'chat-chip', x[1]); b.type = 'button'; chips[x[0]] = b; roomBar.appendChild(b);
    });
    panel.append(head, roomBar, subBar, picker, list, note, form);
    document.body.append(overlay, panel);

    /* ---- الحالة ---- */
    let open = false, loaded = false, unread = 0, lastSend = 0, q = null;
    let room = { type: 'global', id: '' };
    const isGlobal = () => room.type === 'global';
    const roomPath = () => room.type === 'club' ? 'chat/club/' + room.id : room.type === 'group' ? 'chat/rooms/' + room.id : 'chat/global';
    const roomLabel = () => room.type === 'club' ? 'club:' + room.id : room.type === 'group' ? 'group:' + room.id : 'global';
    const clubName = id => (CLUBS.find(c => c[0] === id) || [0, 'النادي'])[1];
    const seen = new Set(), rows = {};
    const me = () => (window.KoraAuth && window.KoraAuth.user) || (firebase.auth && firebase.auth().currentUser) || null;
    const myName = () => { const u = me(); return u ? (u.displayName || (u.email ? u.email.split('@')[0] : '') || 'لاعب') : 'لاعب'; };
    const seenKey = () => SEEN_KEY + ':' + ((me() && me().uid) || 'x');
    const lastSeen = () => { try { return Number(localStorage.getItem(seenKey())) || 0; } catch (e) { return 0; } };
    const markSeen = t => { if (!isGlobal()) return; try { localStorage.setItem(seenKey(), String(t || Date.now())); } catch (e) { /* ignore */ } };
    const all = {};
    let newest = 0;

    function setBadge() { badge.hidden = !unread; badge.textContent = unread > 99 ? '99+' : String(unread); }
    function nearBottom() { return list.scrollHeight - list.scrollTop - list.clientHeight < 80; }
    function toBottom() { list.scrollTop = list.scrollHeight; }
    const hhmm = t => { const d = new Date(t); return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }); };
    /* أقل من 24 ساعة: الساعة. بعد كده بالأيام. بعد 7 أيام بالشهور. بعد 12 شهر بالسنين */
    const unit = (n, one, two, few, many) => n === 1 ? 'منذ ' + one : n === 2 ? 'منذ ' + two : n <= 10 ? 'منذ ' + n + ' ' + few : 'منذ ' + n + ' ' + many;
    function when(t) {
      if (!t) return '';
      const diff = Math.max(0, Date.now() - t), DAY = 86400000;
      if (diff < DAY) return hhmm(t);
      const days = Math.floor(diff / DAY);
      if (days < 7) return unit(days, 'يوم', 'يومين', 'أيام', 'يوم');
      const months = Math.max(1, Math.floor(days / 30));
      if (months < 12) return unit(months, 'شهر', 'شهرين', 'أشهر', 'شهر');
      return unit(Math.floor(months / 12), 'سنة', 'سنتين', 'سنوات', 'سنة');
    }
    setInterval(() => { list.querySelectorAll('.chat-time[data-t]').forEach(x => { x.textContent = when(Number(x.dataset.t)); }); }, 60000);

    let playing = null;
    function audioNode(key, m) {
      const box = el('div', 'chat-audio'), pb = el('button', 'chat-play'); pb.type = 'button'; pb.setAttribute('aria-label', 'تشغيل الرسالة الصوتية');
      const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>', PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
      pb.innerHTML = PLAY;
      const bar = el('div', 'chat-wave'), fill = el('i'); bar.appendChild(fill);
      const dur = Math.max(1, Math.min(MAX_REC_S + 5, Math.round(Number(m.dur) || 1)));
      const lab = el('small', 'chat-dur', '0:' + String(dur).padStart(2, '0'));
      box.append(pb, bar, lab);
      let au = null, loading = false;
      const stop = () => { if (au) { au.pause(); au.currentTime = 0; } pb.innerHTML = PLAY; fill.style.width = '0'; if (playing === stop) playing = null; };
      pb.addEventListener('click', async () => {
        if (au && !au.paused) { stop(); return; }
        if (playing) playing();
        if (!au) {
          if (loading) return; loading = true; pb.disabled = true;
          try {
            const snap = await db.ref('chat/audio/' + key).get(), url = snap.val();
            if (!Sec.isAudioDataUrl(url)) { say('الرسالة الصوتية مش متاحة.'); return; }
            au = new Audio(url); au.addEventListener('timeupdate', () => { fill.style.width = (au.duration ? au.currentTime / au.duration * 100 : 0) + '%'; });
            au.addEventListener('ended', stop);
          } catch (e) { say('مقدرناش نحمّل الصوت.'); return; } finally { loading = false; pb.disabled = false; }
        }
        playing = stop; pb.innerHTML = PAUSE;
        au.play().catch(() => stop());
      });
      return box;
    }
    function addMessage(key, m) {
      if (seen.has(key) || !m || (typeof m.text !== 'string' && m.aud !== 1)) return;
      seen.add(key); all[key] = m;
      if (m.uid && getBlocked().indexOf(m.uid) > -1) return;
      if (empty.parentNode) empty.remove();
      const u = me(), mine = u && m.uid === u.uid;
      const row = el('div', 'chat-msg' + (mine ? ' mine' : ''));
      const bub = el('div', 'chat-bubble');
      if (!mine) {
        const top = el('div', 'chat-top'), more = el('button', 'chat-more', '⋯'); more.type = 'button'; more.setAttribute('aria-label', 'خيارات الرسالة');
        const menu = el('div', 'chat-menu'); menu.hidden = true;
        const rb = el('button', '', 'إبلاغ عن الرسالة'), bb = el('button', '', 'حظر ' + Sec.name(m.name || 'لاعب', 30)); rb.type = bb.type = 'button';
        rb.addEventListener('click', () => { menu.hidden = true; reportMsg(key, m); });
        bb.addEventListener('click', () => { menu.hidden = true; blockUser(m.uid, Sec.name(m.name || 'لاعب', 30)); });
        more.addEventListener('click', () => { menu.hidden = !menu.hidden; });
        menu.append(rb, bb);
        top.append(el('b', 'chat-name', Sec.name(m.name || 'لاعب', 30)), more);
        bub.append(top, menu);
      }
      if (m.aud === 1) bub.appendChild(audioNode(key, m)); else bub.appendChild(el('span', 'chat-text', Sec.clean(m.text, MAX_LEN)));
      const tm = el('small', 'chat-time', when(m.t)); if (m.t) tm.dataset.t = String(m.t); tm.title = m.t ? new Date(m.t).toLocaleString('ar-EG') : '';
      bub.appendChild(tm);
      row.appendChild(bub); rows[key] = row;
      const stick = nearBottom() || mine;
      list.appendChild(row);
      while (list.children.length > KEEP + 20) list.firstChild.remove();
      if (m.t > newest) newest = m.t;
      if (open) { if (stick) toBottom(); markSeen(newest); }
      else if (loaded && isGlobal() && !mine && m.t > lastSeen()) { unread++; setBadge(); }
    }

    function fit() {
      const v = window.visualViewport;
      if (!v) return;
      panel.style.height = v.height + 'px'; panel.style.top = v.offsetTop + 'px'; panel.style.bottom = 'auto';
      if (open && nearBottomLock) toBottom();
    }
    let nearBottomLock = true;
    if (window.visualViewport) { window.visualViewport.addEventListener('resize', fit); window.visualViewport.addEventListener('scroll', fit); }
    input.addEventListener('focus', () => { setTimeout(() => { fit(); toBottom(); window.scrollTo(0, 0); }, 250); });

    function openPanel() {
      fit();
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

    function post(msg, audioUrl) {
      const u = me();
      if (!u) { say('لازم تسجل دخول الأول.'); return Promise.resolve(false); }
      const wait = GAP_MS - (Date.now() - lastSend);
      if (wait > 0) { say('استنى ثانية قبل الرسالة الجاية.'); return Promise.resolve(false); }
      const lim = Sec.limit('chat:send:' + u.uid, 8, 30000);
      if (lim) { say('بتبعت بسرعة! استنى ' + Math.ceil(lim / 1000) + ' ثانية.'); return Promise.resolve(false); }
      lastSend = Date.now();
      const key = ref.push().key, upd = {};
      upd[roomPath() + '/' + key] = Object.assign({ uid: u.uid, name: Sec.name(myName(), 30), t: firebase.database.ServerValue.TIMESTAMP }, msg);
      upd['chat/meta/' + u.uid + '/last'] = firebase.database.ServerValue.TIMESTAMP;
      if (audioUrl) upd['chat/audio/' + key] = audioUrl;
      return db.ref().update(upd).then(() => true).catch(err => {
        if (audioUrl) { say('مقدرناش نبعت الرسالة الصوتية (' + ((err && err.code) || 'error') + ').'); return false; }
        return ref.child(key).set(upd[roomPath() + '/' + key]).then(() => true).catch(e2 => { console.warn('[chat]', e2); say('مقدرناش نبعت الرسالة (' + ((e2 && e2.code) || 'error') + '). راجع قواعد Firebase.'); return false; });
      });
    }
    form.addEventListener('submit', e => {
      e.preventDefault();
      const text = Sec.clean(input.value, MAX_LEN);
      if (!text) return;
      send.disabled = true;
      post({ text }).then(ok => { if (ok) input.value = ''; send.disabled = false; input.focus(); });
    });

    /* ---- تسجيل صوتي ---- */
    let rec = null, stream = null, chunks = [], recT0 = 0, recIv = 0, canceled = false;
    const canRec = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    if (!canRec) mic.hidden = true;
    function recUi(on) { form.classList.toggle('recording', on); recBar.hidden = !on; input.hidden = on; send.hidden = on; mic.hidden = on || !canRec; }
    function cleanup() { clearInterval(recIv); if (stream) stream.getTracks().forEach(t => t.stop()); stream = rec = null; recUi(false); }
    async function startRec() {
      if (rec) return;
      if (!me()) { say('لازم تسجل دخول الأول.'); return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch (e) { say('محتاجين إذن المايك عشان تسجل.'); return; }
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => window.MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
      try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 }); } catch (e) { cleanup(); say('المتصفح مش بيدعم التسجيل.'); return; }
      chunks = []; canceled = false; recT0 = Date.now();
      rec.ondataavailable = ev => { if (ev.data && ev.data.size) chunks.push(ev.data); };
      rec.onstop = () => {
        const dur = Math.round((Date.now() - recT0) / 1000), type = rec && rec.mimeType || mime || 'audio/webm', blob = new Blob(chunks, { type });
        cleanup();
        if (canceled || dur < 1) return;
        const fr = new FileReader();
        fr.onload = () => {
          let url = String(fr.result || '');
          url = url.replace(/^data:[^;,]*/, 'data:' + type.split(';')[0]);
          if (!/;base64,/.test(url)) url = url.replace(/^(data:[^,]*),/, '$1;base64,');
          if (!Sec.isAudioDataUrl(url, 150000)) { say('التسجيل طويل أو مش مدعوم.'); return; }
          post({ aud: 1, dur: Math.min(dur, MAX_REC_S) }, url);
        };
        fr.readAsDataURL(blob);
      };
      rec.start(250); recUi(true);
      recIv = setInterval(() => { const sec = Math.floor((Date.now() - recT0) / 1000); recTime.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); if (sec >= MAX_REC_S && rec && rec.state === 'recording') rec.stop(); }, 250);
    }
    mic.addEventListener('click', startRec);
    recGo.addEventListener('click', () => { if (rec && rec.state === 'recording') rec.stop(); });
    recCancel.addEventListener('click', () => { canceled = true; if (rec && rec.state === 'recording') rec.stop(); else cleanup(); });

    /* ---- الإبلاغ والحظر ---- */
    function hideRow(key) { const r = rows[key]; if (r) { r.remove(); delete rows[key]; } }
    function reportMsg(key, m) {
      const u = me(); if (!u) { say('لازم تسجل دخول الأول.'); return; }
      const lim = Sec.limit('chat:report:' + u.uid, 3, 60000);
      if (lim) { say('بلّغت كتير، استنى شوية.'); return; }
      db.ref('chat/reports').push({ room: roomLabel(), key: key, uid: String(m.uid || ''), by: u.uid, text: Sec.clean(m.text || '', 200), aud: m.aud === 1 ? 1 : 0, t: firebase.database.ServerValue.TIMESTAMP })
        .then(() => { hideRow(key); say('اتبعت البلاغ، شكرًا ليك.'); })
        .catch(() => say('معرفتش أبعت البلاغ (راجع قواعد Firebase: chat/reports).'));
    }
    function blockUser(uid, name) {
      if (!uid) return;
      const b = getBlocked(); if (b.indexOf(uid) < 0) b.push(uid);
      store.set(BLOCK_KEY, JSON.stringify(b.slice(-200)));
      Object.keys(all).forEach(k => { if (all[k].uid === uid) hideRow(k); });
      say('اتحظر ' + name + '، مش هتشوف رسايله.'); renderBars();
    }

    /* ---- الغرف ---- */
    function inviteLink() { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('chat', room.id); return u.toString(); }
    function renderBars() {
      Object.keys(chips).forEach(k => chips[k].classList.toggle('active', room.type === k));
      titleB.textContent = room.type === 'club' ? 'غرفة ' + clubName(room.id) : room.type === 'group' ? 'غرفة الشلة ' + room.id : 'الشات العالمي';
      titleS.textContent = room.type === 'global' ? 'كل اللاعبين بيتكلموا هنا' : room.type === 'club' ? 'مشجعين النادي' : 'اللي معاه الكود بس بيدخل';
      subBar.textContent = '';
      const nb = getBlocked().length;
      if (room.type === 'group') {
        const cp = el('button', 'chat-link', 'نسخ رابط الدعوة'); cp.type = 'button';
        cp.addEventListener('click', async () => {
          try { if (navigator.share) { await navigator.share({ text: 'تعالى شات الشلة في Kora Challenge', url: inviteLink() }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
          try { await navigator.clipboard.writeText(inviteLink()); say('اتنسخ رابط الدعوة'); } catch (e) { say('الكود: ' + room.id); }
        });
        const lv = el('button', 'chat-link', 'خروج من الغرفة'); lv.type = 'button';
        lv.addEventListener('click', () => { store.set(ROOM_KEY, ''); switchRoom('global'); });
        subBar.append(cp, lv);
      } else if (room.type === 'club') {
        const ch = el('button', 'chat-link', 'تغيير النادي'); ch.type = 'button'; ch.addEventListener('click', () => showPicker('club'));
        subBar.appendChild(ch);
      }
      if (nb) {
        const ub = el('button', 'chat-link', 'المحظورين (' + nb + ') - إلغاء الكل'); ub.type = 'button';
        ub.addEventListener('click', () => { store.set(BLOCK_KEY, ''); say('اتلغى الحظر. اعمل ريفريش للغرفة.'); renderBars(); switchRoom(room.type, room.id, true); });
        subBar.appendChild(ub);
      }
      subBar.hidden = !subBar.children.length;
    }
    function showPicker(kind) {
      picker.textContent = ''; picker.hidden = false;
      if (kind === 'club') {
        const sel = el('select', 'chat-select');
        CLUBS.forEach(c => { const o = el('option', '', c[1]); o.value = c[0]; sel.appendChild(o); });
        sel.value = store.get(CLUB_KEY) || CLUBS[0][0];
        const go = el('button', 'chat-send', 'ادخل'); go.type = 'button';
        go.addEventListener('click', () => { store.set(CLUB_KEY, sel.value); picker.hidden = true; switchRoom('club', sel.value); });
        picker.append(el('small', '', 'اختار ناديك'), sel, go);
      } else {
        const inp = el('input', 'chat-input'); inp.maxLength = 5; inp.placeholder = 'كود الغرفة'; inp.setAttribute('aria-label', 'كود الغرفة');
        const go = el('button', 'chat-send', 'ادخل'); go.type = 'button';
        const nw = el('button', 'chat-link', 'اعمل غرفة جديدة'); nw.type = 'button';
        const enter = c => { c = cleanCode(c); if (c.length !== 5) { say('الكود 5 حروف/أرقام.'); return; } store.set(ROOM_KEY, c); picker.hidden = true; switchRoom('group', c); };
        go.addEventListener('click', () => enter(inp.value));
        nw.addEventListener('click', () => enter(genCode()));
        picker.append(el('small', '', 'ادخل كود غرفة صاحبك أو اعمل غرفة جديدة'), inp, go, nw);
        setTimeout(() => inp.focus(), 50);
      }
    }
    chips.global.addEventListener('click', () => { picker.hidden = true; switchRoom('global'); });
    chips.group.addEventListener('click', () => { const c = store.get(ROOM_KEY); if (c) { picker.hidden = true; switchRoom('group', c); } else showPicker('group'); });
    chips.club.addEventListener('click', () => { const c = store.get(CLUB_KEY); if (c) { picker.hidden = true; switchRoom('club', c); } else showPicker('club'); });

    /* ---- الاستماع للرسايل ---- */
    function listen() {
      loaded = false;
      q = ref.limitToLast(KEEP);
      q.on('child_removed', s => { const r = rows[s.key]; if (r) { r.remove(); delete rows[s.key]; seen.delete(s.key); } });
      q.on('child_added', s => addMessage(s.key, s.val()), () => { empty.textContent = 'الغرفة مش متاحة دلوقتي (راجع قواعد Firebase).'; if (!empty.parentNode) list.appendChild(empty); });
      q.once('value').then(() => {
        loaded = true;
        if (!isGlobal()) return;
        const ls = lastSeen(); if (!ls) { markSeen(newest || Date.now()); return; }
        unread = Object.keys(all).filter(k => { const m = all[k]; return m.t > ls && !(me() && m.uid === me().uid); }).length;
        setBadge();
      }).catch(() => { loaded = true; });
    }
    function switchRoom(type, id, force) {
      if (!force && room.type === type && room.id === (id || '')) { renderBars(); return; }
      if (q) q.off();
      list.textContent = ''; empty.textContent = 'لسه مفيش رسايل. ابدأ الكلام!'; list.appendChild(empty);
      seen.clear(); Object.keys(rows).forEach(k => delete rows[k]); Object.keys(all).forEach(k => delete all[k]);
      if (type !== 'global') { unread = 0; setBadge(); }
      room = { type: type, id: id || '' };
      try { ref = db.ref(roomPath()); } catch (e) { return; }
      renderBars(); listen();
    }
    renderBars(); listen();

    /* رابط دعوة: ?chat=CODE بيفتح الشات على الغرفة مباشرة */
    const inv = cleanCode(new URLSearchParams(location.search).get('chat'));
    if (inv.length === 5) { store.set(ROOM_KEY, inv); switchRoom('group', inv); openPanel(); }
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
