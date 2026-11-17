/* Kora Challenge — قاعة الأساطير: اللاعيبة اللي اعتزلوا بتظهر في شاشة اختيار المهنة (من التخزين المحلي) */
(() => {
  'use strict';
  const box = document.getElementById('cmLegends'); if (!box) return;
  let list = []; try { list = JSON.parse(localStorage.getItem('koraLegends') || '[]'); } catch (e) { list = []; }
  if (!list.length) return;
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  box.appendChild(el('h3', 'cm-lead', 'قاعة الأساطير'));
  const load = () => new Promise((res, rej) => { if (window.KoraLegend) return res(); const s = document.createElement('script'); s.src = 'careermode-legend.js?v=1'; s.onload = res; s.onerror = rej; document.body.appendChild(s); });
  list.forEach(s => {
    const c = el('div', 'cm-card cm-hall'); c.style.cssText = 'display:flex;align-items:center;gap:10px;justify-content:space-between';
    const info = el('div'); info.append(el('b', '', s.name), el('small', '', ' ' + s.posAr + ' • ' + (s.gk ? s.saves + ' تصدي' : s.goals + ' هدف') + ' • ' + s.titles + ' بطولة'));
    info.lastChild.style.cssText = 'display:block;color:var(--muted,#94a49a)';
    const r = el('b', '', String(s.legend)); r.style.cssText = 'color:#f6c445;font-size:1.3rem';
    const b = el('button', 'cm-link', 'البطاقة'); b.type = 'button';
    b.addEventListener('click', async () => {
      try { await load(); const out = await window.KoraLegend.cardPNG(null, s); const a = document.createElement('a'); a.href = out.url; a.download = 'legend-' + s.name + '.png'; a.click(); } catch (e) { /* ignore */ }
    });
    c.append(info, r, b); box.appendChild(c);
  });
})();
