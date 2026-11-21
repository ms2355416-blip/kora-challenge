/* Kora Challenge — قاعة الأساطير: المحلية (التخزين) + الأونلاين (أفضل أساطير كل اللاعيبين من Firebase) */
(() => {
  'use strict';
  const box = document.getElementById('cmLegends'); if (!box) return;
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const load = () => new Promise((res, rej) => { if (window.KoraLegend) return res(); const s = document.createElement('script'); s.src = 'careermode-legend.js?v=2'; s.onload = res; s.onerror = rej; document.body.appendChild(s); });
  const row = (s, rank) => {
    const c = el('div', 'cm-card cm-hall'); c.style.cssText = 'display:flex;align-items:center;gap:10px;justify-content:space-between';
    const info = el('div'); info.append(el('b', '', (rank ? rank + '. ' : '') + s.name), el('small', '', ' ' + s.posAr + ' • ' + (s.gk ? s.saves + ' تصدي' : s.goals + ' هدف') + ' • ' + s.titles + ' بطولة' + (s.by ? ' • ' + s.by : '')));
    info.lastChild.style.cssText = 'display:block;color:var(--muted,#94a49a)';
    const r = el('b', '', String(s.legend)); r.style.cssText = 'color:#f6c445;font-size:1.3rem';
    c.append(info, r);
    if (!rank) {
      const b = el('button', 'cm-link', 'البطاقة'); b.type = 'button';
      b.addEventListener('click', async () => { try { await load(); const out = await window.KoraLegend.cardPNG(null, s); const a = document.createElement('a'); a.href = out.url; a.download = 'legend-' + s.name + '.png'; a.click(); } catch (e) { /* ignore */ } });
      c.appendChild(b);
    }
    return c;
  };
  let list = []; try { list = JSON.parse(localStorage.getItem('koraLegends') || '[]'); } catch (e) { list = []; }
  if (list.length) { box.appendChild(el('h3', 'cm-lead', 'قاعة أساطيرك')); list.forEach(s => box.appendChild(row(s, 0))); }

  /* الأونلاين */
  const on = el('div', 'cm-online'); box.appendChild(on);
  const show = () => {
    try {
      const fb = window.firebase; if (!fb || !fb.apps || !fb.apps.length || !fb.auth().currentUser) return false;
      on.appendChild(el('h3', 'cm-lead', 'قاعة الأساطير العالمية'));
      const holder = el('div'); holder.appendChild(el('small', 'cm-sub', 'بنحمّل أفضل الأساطير…')); on.appendChild(holder);
      fb.database().ref('legends_hall').orderByChild('legend').limitToLast(10).once('value').then(snap => {
        const arr = []; snap.forEach(c => { const v = c.val(); if (v && v.name) arr.push(v); });
        arr.sort((a, b) => b.legend - a.legend); holder.textContent = '';
        if (!arr.length) holder.appendChild(el('small', 'cm-sub', 'لسه مفيش أساطير اتسجلت. اعتزل بمسيرة قوية وادخل القاعة!'));
        arr.forEach((s, i) => holder.appendChild(row(s, i + 1)));
      }).catch(() => { holder.textContent = ''; holder.appendChild(el('small', 'cm-sub', 'تعذر تحميل القاعة العالمية دلوقتي.')); });
      return true;
    } catch (e) { return false; }
  };
  let tries = 0; const t = setInterval(() => { if (show() || ++tries > 20) clearInterval(t); }, 700);
})();
