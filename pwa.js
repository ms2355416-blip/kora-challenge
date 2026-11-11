/* Kora Challenge — تسجيل الـPWA + زرار تثبيت التطبيق */
(() => {
  'use strict';
  /* لينكات المانيفست والأيقونة (لو الصفحة ملهاش) */
  function ensure(rel, attrs) {
    if (document.querySelector('link[rel="' + rel + '"]')) return;
    const l = document.createElement('link'); l.rel = rel; Object.keys(attrs).forEach(k => l.setAttribute(k, attrs[k])); document.head.appendChild(l);
  }
  ensure('manifest', { href: 'manifest.webmanifest' });
  ensure('apple-touch-icon', { href: 'icons/apple-touch-icon.png' });
  if (!document.querySelector('meta[name="theme-color"]')) { const m = document.createElement('meta'); m.name = 'theme-color'; m.content = '#0b1410'; document.head.appendChild(m); }

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ }); });
  }

  /* زرار التثبيت */
  let deferred = null;
  const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  function say(t) {
    const x = document.getElementById('toast');
    if (x) { x.textContent = t; x.classList.add('show'); setTimeout(() => x.classList.remove('show'), 4500); } else alert(t);
  }
  function addButton() {
    const bar = document.querySelector('.header-actions');
    if (!bar || document.getElementById('installBtn') || standalone()) return;
    if (!deferred && !isIOS) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'installBtn'; b.className = 'chat-btn'; b.title = 'ثبّت التطبيق'; b.setAttribute('aria-label', 'ثبّت التطبيق');
    b.innerHTML = window.KIcon ? window.KIcon('download') : '📲';
    b.addEventListener('click', async () => {
      if (deferred) { deferred.prompt(); try { await deferred.userChoice; } catch (e) { /* ignore */ } deferred = null; b.remove(); }
      else say('من متصفح Safari: دوس زرار المشاركة ثم "إضافة إلى الشاشة الرئيسية".');
    });
    bar.prepend(b);
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; addButton(); });
  window.addEventListener('appinstalled', () => { const b = document.getElementById('installBtn'); if (b) b.remove(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
