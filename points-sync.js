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
    return (window.KoraSec ? window.KoraSec.name(name, 30) : name.slice(0, 30)) || 'لاعب';
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

  /* رقم الأسبوع (بيبدأ السبت 00:00 UTC) */
  function weekId(d) { return Math.floor((Math.floor((d || Date.now()) / 86400000) - 2) / 7); }
  const WK_KEY = 'koraWeeklySync';
  function readWk() { try { return JSON.parse(localStorage.getItem(WK_KEY) || '{}'); } catch (e) { return {}; } }

  // بنضيف على نقاط الأسبوع الفرق بس من آخر مزامنة، فمفيش حد بياخد نقاط قديمة
  function syncWeekly(points, name, cos) {
    const wk = readWk(), wid = weekId();
    if (wk.uid !== user.uid) { localStorage.setItem(WK_KEY, JSON.stringify({ uid: user.uid, last: points })); return; }
    const delta = Math.min(Math.max(0, points - (Number(wk.last) || 0)), 3000);
    if (!delta && wk.week === wid) return;
    const ref = firebase.database().ref('leaderboard_weekly/' + wid + '/' + user.uid);
    ref.transaction(cur => {
      if (!cur && !delta) return;
      const out = { name, points: (Number(cur && cur.points) || 0) + delta, t: firebase.database.ServerValue.TIMESTAMP };
      if (cos) Object.assign(out, cos);
      return out;
    }).then(() => {
      try { localStorage.setItem(WK_KEY, JSON.stringify({ uid: user.uid, last: points, week: wid })); } catch (e) { /* ignore */ }
    }).catch(() => { /* هنحاول تاني */ });
  }

  function sync() {
    if (!user || busy) return;
    if (typeof firebase === 'undefined' || !firebase.database) return;

    const points = localPoints();
    const name = displayName();
    const cos = cosmetics();
    const key = points + '|' + name + '|' + (cos ? cos.title + cos.frame + cos.avatar : '');
    if (key === lastKey) return;
    try { syncWeekly(points, name, cos); } catch (e) { /* ignore */ }

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
      .catch(err => {
        console.warn('[Kora] قواعد Firebase رفضت اللقب/الأفاتار، حدّث قواعد leaderboard:', err && err.message);
        return ref.transaction(build(false)); // القواعد القديمة ممكن ترفض الحقول الجديدة
      })
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
