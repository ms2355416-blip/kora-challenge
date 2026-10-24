/* Kora Challenge — مزامنة نقاط اللاعب مع الترتيب العالمي
   بتاخد totalPoints من الجهاز وتحفظها في Firebase تحت leaderboard/<uid>
   + اللقب والإطار والأفاتار المفعّلين (من unlocks.js) عشان يظهروا في الترتيب. */
(() => {
  'use strict';

  const CHECK_EVERY_MS = 4000;
  let user = null;
  let lastKey = '';
  let busy = false;

  function localPoints() {
    try {
      const stats = JSON.parse(localStorage.getItem('koraChallengeStats') || '{}');
      return Math.max(0, Math.floor(Number(stats.totalPoints) || 0));
    } catch (e) {
      return 0;
    }
  }

  function displayName() {
    if (!user) return 'لاعب';
    const name = user.displayName || (user.email ? user.email.split('@')[0] : '') || 'لاعب';
    return name.slice(0, 30);
  }

  function cosmetics() {
    try {
      if (window.KoraUnlocks) {
        const e = window.KoraUnlocks.getEquipped();
        return { title: e.title, frame: e.frame, avatar: e.avatar };
      }
    } catch (err) { /* ignore */ }
    return null;
  }

  function sync() {
    if (!user || busy) return;
    if (typeof firebase === 'undefined' || !firebase.database) return;

    const points = localPoints();
    const name = displayName();
    const cos = cosmetics();
    const key = points + '|' + name + '|' + (cos ? cos.title + cos.frame + cos.avatar : '');
    if (key === lastKey) return;

    const ref = firebase.database().ref('leaderboard/' + user.uid);
    const build = withCos => current => {
      // لو معندوش نقاط ولسه ملوش سجل، منعملش سجل فاضي
      if (!current && points === 0) return;
      // النقاط عمرها ما بتقل (لو الجهاز اتمسح أو اتغير)
      const best = Math.max(Number(current && current.points) || 0, points);
      const out = { name, points: best, t: firebase.database.ServerValue.TIMESTAMP };
      if (withCos && cos) Object.assign(out, cos);
      return out;
    };

    busy = true;
    ref.transaction(build(true))
      .catch(() => ref.transaction(build(false))) // القواعد القديمة ممكن ترفض الحقول الجديدة
      .then(() => { lastKey = key; })
      .catch(() => { /* القواعد ممكن تمنع الكتابة، هنحاول تاني بعدين */ })
      .finally(() => { busy = false; });
  }

  function start() {
    if (typeof firebase === 'undefined') return;
    firebase.auth().onAuthStateChanged(u => {
      user = u || null;
      lastKey = '';
      if (user) sync();
    });
    setInterval(sync, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
    window.addEventListener('pagehide', sync);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
