/* Kora Challenge — أدوات الأدمن
   مهم: التحقق هنا للواجهة بس. الحماية الحقيقية في قواعد Firebase (بتعتمد على الـUID).
   - الصفحة الرئيسية: زرار صندوق البلاغات (ليك إنت بس) + حذف الرسايل وكتم المرسل
   - الشات: زرار حذف على أي رسالة (في chat.js)
   - الكوريير: لوحة الأدمن (في careermode.js) */
(() => {
  'use strict';
  const UID = 'Psw0yI1FJeMzABoVPAAww3OblNg1';
  const EMAIL = 'ms2355416@gmail.com';
  const is = u => !!u && u.uid === UID && String(u.email || '').toLowerCase() === EMAIL;
  const cur = () => (window.KoraAuth && window.KoraAuth.user) || (window.firebase && firebase.auth && firebase.auth().currentUser) || null;
  window.KoraAdmin = { UID: UID, is: is, me: () => is(cur()) };

  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const pathOf = r => { r = String(r || ''); return r === 'global' ? 'chat/global' : r.indexOf('club:') === 0 ? 'chat/club/' + r.slice(5).replace(/[^a-z0-9_]/gi, '') : r.indexOf('group:') === 0 ? 'chat/rooms/' + r.slice(6).replace(/[^A-Z0-9]/g, '') : null; };
  const roomName = r => { r = String(r || ''); return r === 'global' ? 'الشات العالمي' : r.indexOf('club:') === 0 ? 'غرفة نادي ' + r.slice(5) : r.indexOf('group:') === 0 ? 'غرفة شلة ' + r.slice(6) : r; };

  function boot() {
    const isHome = /(^|\/)(index\.html)?$/.test(location.pathname);
    if (!isHome || !window.firebase || !firebase.database) return;
    const bar = document.querySelector('.header-actions');
    if (!bar || document.getElementById('repBtn')) return;
    const db = firebase.database(), ref = db.ref('chat/reports');

    const btn = el('button', 'chat-btn rep-btn'); btn.id = 'repBtn'; btn.type = 'button'; btn.title = 'صندوق البلاغات (أدمن)';
    btn.textContent = '🚩'; btn.style.cssText = 'position:relative;font-size:1.1rem';
    const badge = el('span', 'chat-badge', '0'); badge.hidden = true; btn.appendChild(badge);
    bar.prepend(btn);

    const css = el('style'); css.textContent = '.rep-ov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.6);display:none;align-items:flex-end;justify-content:center}.rep-ov.open{display:flex}' +
      '.rep-p{width:min(560px,100%);max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:14px;background:var(--surface,#16213a);color:var(--text,#fff)}' +
      '.rep-p h2{margin:0 0 10px;font-size:1.05rem}.rep-i{padding:10px;margin:8px 0;border-radius:12px;background:rgba(127,127,127,.14);display:grid;gap:6px;font-size:.88rem}' +
      '.rep-i q{display:block;padding:6px 8px;border-radius:8px;background:rgba(0,0,0,.25);word-break:break-word}.rep-i small{opacity:.7}' +
      '.rep-a{display:flex;flex-wrap:wrap;gap:6px}.rep-a button,.rep-x{border:0;border-radius:9px;padding:7px 10px;font:inherit;font-weight:700;font-size:.8rem;cursor:pointer;color:inherit;background:rgba(127,127,127,.25)}' +
      '.rep-a .d{background:#e5484d;color:#fff}.rep-x{float:left}';
    document.head.appendChild(css);
    const ov = el('div', 'rep-ov'), p = el('section', 'rep-p');
    const x = el('button', 'rep-x', 'إغلاق'); x.type = 'button';
    const list = el('div'); p.append(x, el('h2', '', 'صندوق البلاغات'), list); ov.appendChild(p); document.body.appendChild(ov);
    x.addEventListener('click', () => ov.classList.remove('open'));
    ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
    btn.addEventListener('click', () => ov.classList.add('open'));

    function act(label, cls, fn) { const b = el('button', cls, label); b.type = 'button'; b.addEventListener('click', () => { b.disabled = true; Promise.resolve(fn()).catch(() => { b.disabled = false; b.textContent = 'فشل (راجع القواعد)'; }); }); return b; }

    ref.limitToLast(100).on('value', snap => {
      const rows = []; snap.forEach(c => { rows.push(Object.assign({ id: c.key }, c.val())); });
      rows.reverse();
      badge.hidden = !rows.length; badge.textContent = String(rows.length);
      list.textContent = '';
      if (!rows.length) { list.appendChild(el('div', 'rep-i', 'مفيش بلاغات. 👌')); return; }
      rows.forEach(r => {
        const it = el('div', 'rep-i'), path = pathOf(r.room);
        it.append(el('small', '', roomName(r.room) + ' • ' + (r.t ? new Date(r.t).toLocaleString('ar-EG') : '')));
        it.appendChild(el('q', '', r.aud === 1 ? '🎙️ رسالة صوتية' : (r.text || '(فاضية)')));
        it.appendChild(el('small', '', 'المُرسِل: ' + String(r.uid || '').slice(0, 10) + '… • اللي بلّغ: ' + String(r.by || '').slice(0, 10) + '…'));
        const a = el('div', 'rep-a');
        if (path && r.key) a.appendChild(act('احذف الرسالة', 'd', () => Promise.all([db.ref(path + '/' + String(r.key).replace(/[.#$\[\]\/]/g, '')).remove(), db.ref('chat/audio/' + String(r.key).replace(/[.#$\[\]\/]/g, '')).remove(), ref.child(r.id).remove()])));
        if (r.uid) a.appendChild(act('اكتم المرسل', 'd', () => db.ref('chat/banned/' + String(r.uid).replace(/[.#$\[\]\/]/g, '')).set(true).then(() => ref.child(r.id).remove())));
        a.appendChild(act('تجاهل البلاغ', '', () => ref.child(r.id).remove()));
        it.appendChild(a); list.appendChild(it);
      });
    }, () => { list.textContent = ''; list.appendChild(el('div', 'rep-i', 'مقدرتش أقرأ البلاغات. راجع قواعد Firebase (chat/reports).')); });
  }

  function waitAdmin() {
    let n = 0;
    const t = setInterval(() => {
      n++;
      const u = cur();
      if (u) { clearInterval(t); if (is(u)) boot(); }
      else if (n > 60) clearInterval(t);
    }, 300);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitAdmin); else waitAdmin();
})();
