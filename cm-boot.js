/* Kora Challenge — تحميل مؤجّل لكارير مود
   الملفات التقيلة (بيانات اللاعيبة والأندية والمحرك والواجهة، حوالي ميجا) مش بتتحمل لما تفتح الصفحة،
   وبتتحمل بس لما تدخل "مهنة لاعب" (أو تلمس الزرار). شاشة اختيار المهنة بتظهر فورًا. */
(() => {
  'use strict';
  const LIST = ['careermode-data.js', 'coach-data.js?v=8', 'coach-squads-1.js?v=8', 'coach-squads-2.js?v=8', 'careermode-rosters.js?v=2', 'careermode-world.js?v=3',
    'careermode-art.js?v=3', 'careermode-cinema.js?v=1', 'admin.js?v=1', 'careermode-press.js?v=3', 'ai-config.js?v=1', 'careermode-press-ai.js?v=1',
    'careermode-engine.js?v=18', 'careermode.js?v=18'];
  const $ = id => document.getElementById(id);
  let loading = null, loaded = false;

  function loadOne(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = res; s.onerror = () => rej(new Error(src));
      document.body.appendChild(s);
    });
  }
  function msg(text, retry) {
    let m = $('cmBootMsg');
    if (!m) { m = document.createElement('div'); m.id = 'cmBootMsg'; m.className = 'cm-card'; m.style.cssText = 'margin:20px 16px;padding:16px;text-align:center;line-height:1.9'; (document.querySelector('main') || document.body).appendChild(m); }
    m.textContent = text;
    if (retry) { const b = document.createElement('button'); b.type = 'button'; b.className = 'cm-btn'; b.textContent = 'حاول تاني'; b.style.marginTop = '10px'; b.addEventListener('click', () => { loading = null; loadAll(); }); m.appendChild(document.createElement('br')); m.appendChild(b); }
  }
  const done = () => { loaded = true; const m = $('cmBootMsg'); if (m) m.remove(); };
  function startLoading() { return LIST.reduce((p, src) => p.then(() => loadOne(src)), Promise.resolve()).then(done); }
  function loadAll() {
    if (loaded) return Promise.resolve();
    if (location.hash === '#player') { const mode = $('cmMode'); if (mode) mode.hidden = true; msg('بحمّل بيانات الأندية واللاعيبة… (أول مرة بس)'); }
    if (!loading) loading = startLoading();
    loading = loading.catch(e => { loading = null; msg('معرفتش أحمّل الملف: ' + (e && e.message) + '. اتأكد من النت وجرب تاني.', true); });
    return loading;
  }

  /* شاشة اختيار المهنة (خفيفة) لحد ما الملفات التقيلة تتحمل */
  function lite() {
    const mode = $('cmMode'); if (!mode) return;
    ['cmCreate', 'cmGame', 'cmAwards', 'cmSeason', 'cmRetire', 'cmSign', 'cmSummer'].forEach(k => { const n = $(k); if (n) n.hidden = true; });
    mode.hidden = false;
    let open = false; try { open = localStorage.getItem('koraPlayerRetired') === '1'; } catch (e) { /* ignore */ }
    const ca = $('cmModeCoach'), lk = $('cmCoachLock');
    if (ca) { ca.classList.toggle('locked', !open); if (open) { ca.setAttribute('href', 'coach.html'); ca.removeAttribute('aria-disabled'); } else { ca.removeAttribute('href'); ca.setAttribute('aria-disabled', 'true'); } }
    if (lk) lk.hidden = open;
  }

  function route() {
    if (loaded) return;
    if (location.hash === '#player') loadAll(); else lite();
  }

  const go = () => {
    route();
    window.addEventListener('hashchange', () => { if (!loaded && location.hash === '#player') loadAll(); else if (!loaded) lite(); });
    const pl = $('cmModePlayer');
    if (pl) {
      /* لمّا إيدك تقرّب من الزرار نبدأ نحمّل في الخلفية */
      ['pointerenter', 'touchstart', 'focus'].forEach(ev => pl.addEventListener(ev, () => { if (!loading && !loaded) loading = startLoading().catch(() => { loading = null; }); }, { once: true, passive: true }));
    }
    const co = $('cmModeCoach');
    if (co) co.addEventListener('click', e => {
      if (loaded) return;
      let open = false; try { open = localStorage.getItem('koraPlayerRetired') === '1'; } catch (x) { /* ignore */ }
      if (!open) { e.preventDefault(); if (window.KoraDialog) window.KoraDialog.confirm({ title: 'مهنة المدرب مقفولة', message: 'لازم تخلّص مهنة لاعب وتعتزل الأول عشان تتفتح.', okText: 'تمام', cancelText: 'إغلاق' }); }
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
