/* Kora Challenge — نافذة تأكيد بتصميم الموقع (بدل نافذة المتصفح التلقائية)
   الاستخدام: KoraDialog.confirm({ title, message, okText, cancelText, danger }).then(ok => ...) */
(() => {
  'use strict';

  const css = `
.kd-overlay{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.66);backdrop-filter:blur(4px);opacity:0;transition:opacity .18s}
.kd-overlay.show{opacity:1}
.kd-box{width:100%;max-width:380px;background:var(--panel,var(--surface,#111613));color:var(--text,#f3f7f4);border:1px solid var(--border,#27342b);border-radius:18px;padding:22px 20px 18px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.55);transform:translateY(12px) scale(.97);transition:transform .2s;font-family:inherit}
.kd-overlay.show .kd-box{transform:none}
.kd-ico{width:52px;height:52px;margin:0 auto 12px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,138,61,.14);color:#ff8a3d}
.kd-ico svg{width:26px;height:26px}
.kd-title{margin:0 0 6px;font-size:1.1rem;font-weight:800}
.kd-msg{margin:0 0 18px;color:var(--muted,#98a69c);font-size:.9rem;line-height:1.7}
.kd-actions{display:flex;gap:10px}
.kd-btn{flex:1;font:inherit;font-weight:800;font-size:.92rem;padding:12px 10px;border-radius:12px;cursor:pointer;border:1px solid var(--border,#27342b);background:transparent;color:var(--text,#f3f7f4);transition:filter .15s,transform .15s}
.kd-btn:hover{filter:brightness(1.12)}
.kd-btn:active{transform:scale(.98)}
.kd-btn.main{background:var(--green,#35e879);border-color:var(--green,#35e879);color:#04110a}
.kd-btn.danger{background:#ff5555;border-color:#ff5555;color:#fff}
@media (prefers-reduced-motion:reduce){.kd-overlay,.kd-box{transition:none}}
`;
  let styled = false;
  function inject() {
    if (styled) return;
    styled = true;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
  }

  function confirmDialog(opts) {
    opts = opts || {};
    inject();
    return new Promise(resolve => {
      const prevFocus = document.activeElement;
      const ov = document.createElement('div');
      ov.className = 'kd-overlay';
      const box = document.createElement('div');
      box.className = 'kd-box';
      box.setAttribute('role', 'alertdialog');
      box.setAttribute('aria-modal', 'true');

      const ico = document.createElement('div');
      ico.className = 'kd-ico';
      ico.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>';

      const h = document.createElement('h3');
      h.className = 'kd-title';
      h.textContent = opts.title || 'متأكد؟';
      h.id = 'kdTitle';
      box.setAttribute('aria-labelledby', 'kdTitle');

      const p = document.createElement('p');
      p.className = 'kd-msg';
      p.textContent = opts.message || '';

      const row = document.createElement('div');
      row.className = 'kd-actions';
      const no = document.createElement('button');
      no.type = 'button'; no.className = 'kd-btn main';
      no.textContent = opts.cancelText || 'كمّل';
      const yes = document.createElement('button');
      yes.type = 'button'; yes.className = 'kd-btn' + (opts.danger === false ? '' : ' danger');
      yes.textContent = opts.okText || 'تأكيد';
      row.append(yes, no);

      box.append(ico, h, p, row);
      ov.appendChild(box);
      document.body.appendChild(ov);
      requestAnimationFrame(() => ov.classList.add('show'));
      no.focus();

      function close(result) {
        document.removeEventListener('keydown', onKey, true);
        ov.classList.remove('show');
        setTimeout(() => { ov.remove(); if (prevFocus && prevFocus.focus) try { prevFocus.focus(); } catch (e) { /* ignore */ } }, 180);
        resolve(result);
      }
      function onKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); close(false); }
        else if (e.key === 'Tab') { // الفوكس يفضل جوه النافذة
          e.preventDefault();
          (document.activeElement === yes ? no : yes).focus();
        }
      }
      document.addEventListener('keydown', onKey, true);
      yes.addEventListener('click', () => close(true));
      no.addEventListener('click', () => close(false));
      ov.addEventListener('click', e => { if (e.target === ov) close(false); });
    });
  }

  /* يمنع الخروج بالروابط (الرئيسية/اللوجو) أثناء لعبة شغالة لحد ما اللاعب يأكد */
  function guardLinks(isActive, opts) {
    document.addEventListener('click', e => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || !isActive()) return;
      const href = a.getAttribute('href') || '';
      if (href.charAt(0) === '#' || a.target === '_blank') return;
      e.preventDefault();
      confirmDialog(opts).then(ok => { if (ok) location.href = a.href; });
    }, true);
  }

  window.KoraDialog = { confirm: confirmDialog, guardLinks };
})();
