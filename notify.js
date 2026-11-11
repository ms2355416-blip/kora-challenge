/* Kora Challenge — الإشعارات
   بتشتغل لما الموقع أو التطبيق (PWA) يكون مفتوح، حتى لو في تاب تاني:
   1) لما صاحبك يلعب تحديك (challengeInbox)
   2) لما حد يعدّيك في ترتيب أعلى 20 العالمي
   ⚠️ مفيش إشعارات والتطبيق مقفول خالص: ده محتاج Firebase Cloud Messaging + Cloud Function. */
(() => {
  'use strict';
  if (!window.firebase || !firebase.auth) return;
  const ON_KEY = 'koraNotifyOn', TOP = 20, RANK_GAP = 10 * 60 * 1000;
  const supported = 'Notification' in window;
  let uid = null, db = null, started = false;

  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } } };
  const wanted = () => store.get(ON_KEY) !== '0';
  const allowed = () => supported && Notification.permission === 'granted' && wanted();

  function inApp(text) {
    let t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 5000);
  }
  async function show(title, body, tag, url) {
    if (!allowed() || !document.hidden) { inApp(title + ' — ' + body); if (!allowed() || !document.hidden) return; }
    try {
      const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
      if (reg && reg.showNotification) { await reg.showNotification(title, { body: body, tag: tag, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', dir: 'rtl', lang: 'ar', data: { url: url || 'index.html' } }); return; }
    } catch (e) { /* ignore */ }
    try { new Notification(title, { body: body, tag: tag, icon: 'icons/icon-192.png', dir: 'rtl', lang: 'ar' }); } catch (e) { /* ignore */ }
  }

  /* زرار الجرس */
  function bell() {
    const bar = document.querySelector('.header-actions');
    if (!bar || document.getElementById('notifyBtn') || !supported) return;
    const b = document.createElement('button'); b.type = 'button'; b.id = 'notifyBtn'; b.className = 'chat-btn';
    const paint = () => { const on = allowed(); const nm = on ? 'bell' : 'bell-off'; b.innerHTML = window.KIcon ? window.KIcon(nm) : (on ? '🔔' : '🔕'); b.classList.toggle('is-off', !on); b.title = on ? 'الإشعارات شغالة (دوس لإيقافها)' : 'فعّل الإشعارات'; b.setAttribute('aria-label', b.title); };
    b.addEventListener('click', async () => {
      if (Notification.permission === 'denied') { inApp('الإشعارات محظورة من إعدادات المتصفح للموقع ده. فعّلها من هناك.'); return; }
      if (Notification.permission !== 'granted') { const r = await Notification.requestPermission(); if (r !== 'granted') { paint(); return; } store.set(ON_KEY, '1'); inApp('الإشعارات اشتغلت ✓'); }
      else if (wanted()) { store.set(ON_KEY, '0'); inApp('الإشعارات اتقفلت'); }
      else { store.set(ON_KEY, '1'); inApp('الإشعارات اشتغلت ✓'); }
      paint();
    });
    paint(); bar.prepend(b);
  }

  /* 1) تحديات الأصحاب */
  function watchChallenges() {
    const q = db.ref('challengeInbox/' + uid).limitToLast(15);
    let chain = Promise.resolve();
    q.on('child_added', snap => {
      const v = snap.val() || {};
      chain = chain.then(() => new Promise(res => {
        const name = String(v.from || 'صاحبك').slice(0, 30), win = v.win === true;
        show('⚔️ ' + name + ' لعب تحديك', 'جاب ' + (Number(v.mine) || 0) + ' ضد ' + (Number(v.theirs) || 0) + (win ? ' وفاز عليك!' : ' وإنت اللي كسبت 🎉'), 'ch-' + snap.key, 'index.html');
        snap.ref.remove().catch(() => { /* ignore */ });
        setTimeout(res, 1800);
      }));
    }, () => { /* القواعد ممكن تمنع القراءة */ });
  }

  /* 2) النزول في الترتيب العالمي */
  function watchRank() {
    const KEY = 'koraRankState:' + uid;
    db.ref('leaderboard').orderByChild('points').limitToLast(TOP).on('value', snap => {
      const rows = []; snap.forEach(c => { const v = c.val() || {}; rows.push({ uid: c.key, name: String(v.name || 'لاعب').slice(0, 30), points: Number(v.points) || 0 }); });
      rows.sort((a, b) => b.points - a.points);
      let prev = null; try { prev = JSON.parse(store.get(KEY) || 'null'); } catch (e) { prev = null; }
      const idx = rows.findIndex(r => r.uid === uid), now = Date.now();
      const calm = !prev || now - (prev.notified || 0) > RANK_GAP;
      let next = { rank: idx >= 0 ? idx + 1 : 0, above: idx >= 0 ? rows.slice(0, idx).map(r => r.uid) : [], notified: prev ? prev.notified || 0 : 0 };
      if (prev && prev.rank) {
        if (idx >= 0 && next.rank > prev.rank) {
          const passer = rows.slice(0, idx).find(r => (prev.above || []).indexOf(r.uid) < 0);
          if (calm) { show('📉 اتنازلت في الترتيب', (passer ? passer.name + ' عدّاك' : 'حد عدّاك') + ' ونزلت للمركز ' + next.rank + '. ارجع العب واسترد مكانك!', 'rank', 'leaderboard.html'); next.notified = now; }
        } else if (idx < 0) {
          if (calm) { show('📉 وقعت من أعلى ' + TOP, 'خرجت من أعلى ' + TOP + ' في الترتيب العالمي. العب وارجع!', 'rank', 'leaderboard.html'); next.notified = now; }
        }
      }
      store.set(KEY, JSON.stringify(next));
    }, () => { /* ignore */ });
  }

  function start(u) {
    if (started || !u) return;
    started = true; uid = u.uid; db = firebase.database();
    bell();
    try { watchChallenges(); } catch (e) { /* ignore */ }
    try { watchRank(); } catch (e) { /* ignore */ }
  }
  const go = () => firebase.auth().onAuthStateChanged(start);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
