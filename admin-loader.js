/* Kora Challenge — محمّل الأدمن: ملفات الأدمن (admin.js وadmin-inspect.js) مش بتتحمّل عند الزوّار العاديين،
   بتتحمّل بس لو المستخدم الحالي هو حساب الأدمن. ده بيقلل التحميل ويخبّي الأدوات من الصفحات العامة،
   لكن الحماية الحقيقية لازم تفضل في قواعد Firebase (Rules). */
(() => {
  'use strict';
  const UID = 'Psw0yI1FJeMzABoVPAAww3OblNg1';
  let started = false;
  const add = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.body.appendChild(s); });
  const cur = () => { try { return (window.KoraAuth && window.KoraAuth.user) || (window.firebase && firebase.auth && firebase.auth().currentUser) || null; } catch (e) { return null; } };
  function check() {
    if (started) return true;
    const u = cur(); if (!u || u.uid !== UID) return false;
    started = true;
    add('admin.js?v=1').then(() => /leaderboard/.test(location.pathname) ? add('admin-inspect.js?v=1') : null)
      .then(() => { try { window.dispatchEvent(new Event('koraadmin')); } catch (e) { /* ignore */ } }).catch(() => { started = false; });
    return true;
  }
  let n = 0; const t = setInterval(() => { if (check() || ++n > 25) clearInterval(t); }, 800);
})();
