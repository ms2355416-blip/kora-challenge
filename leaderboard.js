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
    if (!rows.length) return state('لسه مفيش لاعبين في الترتيب. العب أي لعبة وكون أول واحد! ⚽');

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

      li.append(rankEl, avatar, info, points);
      listEl.appendChild(li);
    });
  }

  // ترتيب اللاعب الحالي (حتى لو برة أول 10)
  function updateMyRank() {
    if (!uid) return;

    db.ref('leaderboard/' + uid).once('value').then(snap => {
      const mine = snap.val();
      if (!mine || !Number(mine.points)) { meBox.hidden = true; return null; }

      const points = Number(mine.points);
      return db.ref('leaderboard').orderByChild('points').startAt(points + 1).once('value')
        .then(higher => {
          meRank.textContent = '#' + (higher.numChildren() + 1);
          mePoints.textContent = fmt(points);
          meBox.hidden = false;
        });
    }).catch(() => { meBox.hidden = true; });
  }

  function start() {
    if (typeof firebase === 'undefined') return state('تعذّر تحميل الترتيب.');

    firebase.auth().onAuthStateChanged(user => {
      if (!user) return;
      uid = user.uid;
      db = firebase.database();

      db.ref('leaderboard').orderByChild('points').limitToLast(TOP).on('value', snap => {
        rows = [];
        snap.forEach(child => {
          const v = child.val() || {};
          rows.push({
            uid: child.key,
            name: String(v.name || 'لاعب').slice(0, 30),
            points: Number(v.points) || 0,
            title: String(v.title || ''),
            frame: String(v.frame || ''),
            avatar: String(v.avatar || '')
          });
        });
        rows.sort((a, b) => b.points - a.points);
        render();
        updateMyRank();
      }, () => state('مش قادر أقرأ الترتيب. اتأكد من قواعد Firebase (leaderboard).'));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
