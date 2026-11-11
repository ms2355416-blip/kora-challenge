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

  /* ---------- حالة الاتصال + سجل النشاط + ملخص التقدّم (للأدمن وكشف الغش) ---------- */
  const TS = () => firebase.database.ServerValue.TIMESTAMP;
  const page = () => (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '').slice(0, 30);
  const ymd = t => new Date(t).toISOString().slice(0, 10).replace(/-/g, '');
  let presenceFor = null, lastProgress = '', progTimer = null;

  function presence() {
    if (!user || presenceFor === user.uid) return;
    presenceFor = user.uid;
    try {
      const db = firebase.database(), st = db.ref('status/' + user.uid);
      db.ref('.info/connected').on('value', snap => {
        if (snap.val() !== true) return;
        st.onDisconnect().set({ online: false, last: TS(), page: page() }).then(() => st.set({ online: true, last: TS(), page: page() })).catch(() => { /* ignore */ });
      });
    } catch (e) { /* ignore */ }
  }

  function readStats() { try { return JSON.parse(localStorage.getItem('koraChallengeStats') || '{}'); } catch (e) { return {}; } }
  function num(v, max) { v = Math.floor(Number(v) || 0); return Math.max(0, Math.min(max || 1e12, v)); }

  function logActivity(points) {
    if (!user) return;
    const k = 'koraActLast:' + user.uid; let last = null;
    try { last = localStorage.getItem(k); } catch (e) { last = null; }
    const st = readStats(), db = firebase.database(), base = db.ref('activity/' + user.uid);
    const meta = { games: num(st.gamesPlayed, 1e7), best: num(st.bestScore, 1e9), total: points, last: TS() };
    if (last === null) {
      meta.base = points; meta.first = TS();
      base.child('meta').update(meta).catch(() => { /* ignore */ });
      try { localStorage.setItem(k, String(points)); } catch (e) { /* ignore */ }
      return;
    }
    const d = points - Number(last);
    base.child('meta').update(meta).catch(() => { /* ignore */ });
    if (!d) return;
    const day = ymd(Date.now());
    base.child('log/' + day).push({ t: TS(), p: points, d: Math.max(-1e9, Math.min(1e9, d)), g: page() }).catch(() => { /* ignore */ });
    try { localStorage.setItem(k, String(points)); } catch (e) { /* ignore */ }
    /* أول كتابة في اليوم: نمسح السجلات الأقدم من 14 يوم */
    const ck = 'koraActClean:' + user.uid;
    try {
      if (localStorage.getItem(ck) !== day) {
        localStorage.setItem(ck, day);
        const old = ymd(Date.now() - 14 * 86400000);
        base.child('log').orderByKey().endAt(old).once('value').then(sn => { sn.forEach(c => { c.ref.remove(); }); }).catch(() => { /* ignore */ });
      }
    } catch (e) { /* ignore */ }
  }

  function progressSnapshot() {
    const out = { page: page(), v: 1 };
    const st = readStats();
    out.stats = { games: num(st.gamesPlayed, 1e7), best: num(st.bestScore, 1e9), total: num(st.totalPoints, 1e12) };
    try { const sk = JSON.parse(localStorage.getItem('koraChallengeStreak') || 'null'); if (sk) out.streak = { days: num(sk.days, 1e5) }; } catch (e) { /* ignore */ }
    try {
      const c = JSON.parse(localStorage.getItem('koraCareerMode') || 'null');
      if (c && c.player) {
        const club = c.clubs && c.clubs[c.clubId];
        out.career = { year: num(c.year, 3000), age: num(c.player.age, 99), ovr: Math.floor(Number(c.player.ovr) || 0), club: club ? String(club.ar || '').slice(0, 30) : '', seasons: (c.history || []).length, apps: num(c.totals && c.totals.apps, 1e6), goals: num(c.totals && c.totals.goals, 1e6), honors: (c.honors || []).length, money: num(c.money, 1e12), phase: String(c.phase || '').slice(0, 12) };
      }
    } catch (e) { /* ignore */ }
    try {
      const k = JSON.parse(localStorage.getItem('koraCoach') || 'null');
      if (k) {
        const o = { kind: String(k.kind || '').slice(0, 12) };
        Object.keys(k).forEach(f => { if (typeof k[f] === 'number' && Object.keys(o).length < 12 && /^[a-zA-Z]{1,14}$/.test(f)) o[f] = k[f]; });
        out.coach = o;
      }
    } catch (e) { /* ignore */ }
    try { const dl = JSON.parse(localStorage.getItem('koraDaily') || 'null'); if (dl && dl.date) out.daily = { date: String(dl.date).slice(0, 10) }; } catch (e) { /* ignore */ }
    return out;
  }
  function pushProgress(force) {
    if (!user) return;
    const snap = progressSnapshot(), j = JSON.stringify(snap);
    if (!force && j === lastProgress) return;
    lastProgress = j;
    snap.t = TS();
    firebase.database().ref('progress/' + user.uid).set(snap).catch(() => { /* ignore */ });
  }

  function loadScript(src) { const sc = document.createElement('script'); sc.src = src; sc.defer = true; document.head.appendChild(sc); }
  let extrasLoaded = false;
  function extras() {
    if (extrasLoaded) return; extrasLoaded = true;
    if (!document.querySelector('script[src^="pwa.js"]')) loadScript('pwa.js?v=1');
    if (!document.querySelector('script[src^="notify.js"]')) loadScript('notify.js?v=1');
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
    try { logActivity(points); } catch (e) { /* ignore */ }

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
      if (user) { sync(); presence(); pushProgress(true); extras(); }
    });
    clearInterval(progTimer);
    progTimer = setInterval(() => pushProgress(false), 60000);
    setInterval(sync, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
    window.addEventListener('pagehide', () => { sync(); pushProgress(false); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
