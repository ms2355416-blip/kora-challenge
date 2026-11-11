/* Kora Challenge — الترتيب العالمي: أعلى 10 لاعبين + ألقاب أول 3 */
(() => {
  'use strict';

  const TOP = 10;
  const TITLES = { 1: 'KING', 2: 'LORD', 3: 'LEADER' };
  const TITLE_ICONS = { 1: '👑', 2: '⚔️', 3: '🛡️' };

  const listEl = document.getElementById('lbList');
  const meBox = document.getElementById('lbMe');
  const meRank = document.getElementById('lbMeRank');
  const mePoints = document.getElementById('lbMePoints');

  let db = null;
  let uid = null;
  let rows = [];
  let mode = 'global';          // global | weekly
  let activeRef = null;
  const tabBtns = document.querySelectorAll('.lb-tab');
  const weekInfo = document.getElementById('lbWeekInfo');
  const meLabel = document.getElementById('lbMeLabel');
  const prevBox = document.getElementById('lbPrev');
  const prevList = document.getElementById('lbPrevList');
  const PRIZES = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const DAY = 86400000;
  const weekId = (t) => Math.floor((Math.floor((t || Date.now()) / DAY) - 2) / 7);
  const basePath = (wid) => (mode === 'weekly' ? 'leaderboard_weekly/' + wid : 'leaderboard');

  const fmt = n => Number(n).toLocaleString('en-US');

  function state(message) {
    listEl.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'lb-state';
    li.textContent = message;
    listEl.appendChild(li);
  }

  function initial(name) {
    return (Array.from(String(name).trim())[0] || '⚽').toUpperCase();
  }

  // لقب/إطار/أفاتار اللاعب: بنقبلهم بس لو موجودين في الكتالوج واللاعب وصل نقاطهم
  function cosmetic(row) {
    const out = { titleName: '', frame: 'none', avatar: 'none' };
    const U = window.KoraUnlocks;
    if (!U) return out;
    const ok = (type, id) => { const it = U.item(type, id); return it && (it.at || 0) <= row.points ? it : null; };
    const t = ok('titles', row.title);
    if (t) out.titleName = t.name;
    if (ok('frames', row.frame)) out.frame = row.frame;
    if (ok('avatars', row.avatar)) out.avatar = row.avatar;
    return out;
  }

  function render() {
    if (!rows.length) return state(mode === 'weekly' ? 'لسه محدش لعب الأسبوع ده. كون أول واحد في الترتيب الأسبوعي! ⚽' : 'لسه مفيش لاعبين في الترتيب. العب أي لعبة وكون أول واحد! ⚽');

    listEl.innerHTML = '';

    rows.forEach((row, index) => {
      const rank = index + 1;
      const li = document.createElement('li');
      li.className = 'lb-row' + (rank <= 3 ? ' rank-' + rank : '') + (row.uid === uid ? ' me' : '');

      const rankEl = document.createElement('span');
      rankEl.className = 'lb-rank';
      rankEl.textContent = rank;

      const avatar = document.createElement('span');
      avatar.className = 'lb-avatar';
      const cos = cosmetic(row);
      if (cos.frame !== 'none') avatar.classList.add('kframe', 'kframe-' + cos.frame);
      if (cos.avatar !== 'none' && window.KoraUnlocks) avatar.innerHTML = window.KoraUnlocks.avatarSVG(cos.avatar);
      else avatar.textContent = initial(row.name);

      const info = document.createElement('div');
      info.className = 'lb-info';

      const nameEl = document.createElement('span');
      nameEl.className = 'lb-name';
      nameEl.textContent = row.name;

      if (row.uid === uid) {
        const you = document.createElement('span');
        you.className = 'lb-you';
        you.textContent = '(أنت)';
        nameEl.appendChild(you);
      }

      info.appendChild(nameEl);

      if (cos.titleName) {
        const honor = document.createElement('span');
        honor.className = 'lb-honor';
        honor.textContent = cos.titleName;
        info.appendChild(honor);
      }

      if (TITLES[rank]) {
        const title = document.createElement('span');
        title.className = 'lb-title';
        title.textContent = TITLE_ICONS[rank] + ' ' + TITLES[rank];
        info.appendChild(title);
      }

      const points = document.createElement('div');
      points.className = 'lb-points';
      points.textContent = fmt(row.points);
      const small = document.createElement('small');
      small.textContent = 'نقطة';
      points.appendChild(small);

      /* أدمن: ضغطة على الصورة تفتح فاحص اللاعب */
      if (window.KoraAdmin && window.KoraAdmin.me() && window.KoraAdminInspect) {
        avatar.style.cursor = 'pointer'; avatar.title = 'فحص اللاعب (أدمن)'; avatar.setAttribute('role', 'button'); avatar.tabIndex = 0;
        const openIt = ev => { ev.stopPropagation(); window.KoraAdminInspect.open(row.uid, row); };
        avatar.addEventListener('click', openIt);
        avatar.addEventListener('keydown', ev => { if (ev.key === 'Enter') openIt(ev); });
      }
      li.append(rankEl, avatar, info, points);
      listEl.appendChild(li);
    });
  }

  // ترتيب اللاعب الحالي (حتى لو برة أول 10)
  function updateMyRank() {
    if (!uid) return;
    const path = basePath(weekId());
    const m = mode;
    meLabel.textContent = m === 'weekly' ? 'ترتيبك الأسبوعي' : 'ترتيبك العالمي';

    db.ref(path + '/' + uid).once('value').then(snap => {
      const mine = snap.val();
      if (m !== mode) return null;
      if (!mine || !Number(mine.points)) { meBox.hidden = true; return null; }

      const points = Number(mine.points);
      return db.ref(path).orderByChild('points').startAt(points + 1).once('value')
        .then(higher => {
          if (m !== mode) return;
          meRank.textContent = '#' + (higher.numChildren() + 1);
          mePoints.textContent = fmt(points);
          meBox.hidden = false;
        });
    }).catch(() => { meBox.hidden = true; });
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function updateWeekInfo() {
    if (mode !== 'weekly') { weekInfo.hidden = true; return; }
    const endsAt = ((weekId() + 1) * 7 + 2) * DAY;
    const left = Math.max(0, endsAt - Date.now());
    const d = Math.floor(left / DAY), h = Math.floor(left % DAY / 3600000), m = Math.floor(left % 3600000 / 60000);
    weekInfo.textContent = 'الترتيب بيتصفّر بعد ' + d + ' يوم و' + pad(h) + ' ساعة و' + pad(m) + ' دقيقة • التلاتة الأوائل ياخدوا ميداليات';
    weekInfo.hidden = false;
  }

  function readRows(snap) {
    const out = [];
    snap.forEach(child => {
      const v = child.val() || {};
      out.push({
        uid: child.key,
        name: String(v.name || 'لاعب').slice(0, 30),
        points: Number(v.points) || 0,
        title: String(v.title || ''),
        frame: String(v.frame || ''),
        avatar: String(v.avatar || '')
      });
    });
    return out.sort((a, b) => b.points - a.points);
  }

  // جوايز رمزية: ميداليات أول 3 في الأسبوع اللي فات
  function loadPrev() {
    prevBox.hidden = true;
    if (mode !== 'weekly' || !db) return;
    db.ref('leaderboard_weekly/' + (weekId() - 1)).orderByChild('points').limitToLast(3).once('value').then(snap => {
      const top = readRows(snap);
      if (!top.length || mode !== 'weekly') return;
      prevList.innerHTML = '';
      top.forEach((r, i) => {
        const d = document.createElement('div');
        d.className = 'lb-prev-row' + (r.uid === uid ? ' me' : '');
        const medal = document.createElement('span'); medal.textContent = PRIZES[i + 1];
        const nm = document.createElement('b'); nm.textContent = r.name;
        const pt = document.createElement('small'); pt.textContent = fmt(r.points) + ' نقطة';
        d.append(medal, nm, pt);
        prevList.appendChild(d);
      });
      prevBox.hidden = false;
    }).catch(() => {});
  }

  function attach() {
    if (!db) return;
    if (activeRef) activeRef.off();
    state('بحمّل الترتيب…');
    rows = [];
    activeRef = db.ref(basePath(weekId())).orderByChild('points').limitToLast(TOP);
    activeRef.on('value', snap => {
      rows = readRows(snap);
      render();
      updateMyRank();
    }, () => state('مش قادر أقرأ الترتيب. اتأكد من قواعد Firebase (leaderboard).'));
    updateMyRank();
    updateWeekInfo();
    loadPrev();
  }

  function setMode(next) {
    if (next === mode) return;
    mode = next;
    tabBtns.forEach(b => {
      const on = b.dataset.tab === mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    meBox.hidden = true;
    attach();
  }

  function start() {
    if (typeof firebase === 'undefined') return state('تعذّر تحميل الترتيب.');
    tabBtns.forEach(b => b.addEventListener('click', () => setMode(b.dataset.tab)));
    setInterval(updateWeekInfo, 30000);

    firebase.auth().onAuthStateChanged(user => {
      if (!user) return;
      uid = user.uid;
      db = firebase.database();
      attach();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
