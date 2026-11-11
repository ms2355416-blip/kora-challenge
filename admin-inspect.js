/* Kora Challenge — فاحص المستخدم (للأدمن بس)
   بتدوس على صورة أي لاعب في الليدربورد فيفتح: النقاط، الجولات، الاسم والصورة، متصل ولا لأ،
   تقدّمه في الألعاب، وتقدير احتمال الغش من سجل النقاط.
   ⚠️ النقاط بتتحسب في متصفح اللاعب، فالتقدير هنا "مؤشر" مش دليل قاطع. الحماية الحقيقية: Cloud Function تحسب النقاط. */
(() => {
  'use strict';
  const A = window.KoraAdmin;
  if (!A) return;
  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const fmt = n => Number(n || 0).toLocaleString('en-US');
  const safeKey = s => String(s || '').replace(/[.#$\[\]\/]/g, '');

  /* حدود التحليل (عدّلها حسب نظام نقاط ألعابك) */
  const T = { jump: [400, 800, 2000], burst: [500, 1000, 3000], perMin: [8, 15], perGame: 400, day: 30000, youngHours: 2, youngPoints: 3000, unverifiedShare: 0.5, unverifiedMin: 1000 };

  function analyze(log, meta, lb) {
    const reasons = []; let score = 0;
    const ev = log.filter(e => e.t && e.d).sort((a, b) => a.t - b.t), pos = ev.filter(e => e.d > 0);
    const maxJump = pos.reduce((m, e) => Math.max(m, e.d), 0);
    let maxBurst = 0, maxCount = 0, j = 0, sum = 0;
    for (let i = 0; i < pos.length; i++) {
      sum += pos[i].d;
      while (pos[i].t - pos[j].t > 60000) { sum -= pos[j].d; j++; }
      maxBurst = Math.max(maxBurst, sum); maxCount = Math.max(maxCount, i - j + 1);
    }
    const dayAgo = Date.now() - 86400000, last24 = pos.filter(e => e.t >= dayAgo).reduce((a, e) => a + e.d, 0);
    const verified = pos.reduce((a, e) => a + e.d, 0), base = Number(meta && meta.base) || 0, games = Number(meta && meta.games) || 0;
    const unverified = Math.max(0, lb - base - verified), share = lb ? unverified / lb : 0;
    const ageH = meta && meta.first ? (Date.now() - meta.first) / 3600000 : null;
    const add = (n, t) => { score += n; reasons.push(t); };
    if (maxJump >= T.jump[2]) add(45, 'قفزة واحدة ' + fmt(maxJump) + ' نقطة مرة واحدة'); else if (maxJump >= T.jump[1]) add(30, 'قفزة كبيرة ' + fmt(maxJump) + ' نقطة'); else if (maxJump >= T.jump[0]) add(15, 'قفزة ملحوظة ' + fmt(maxJump) + ' نقطة');
    if (maxBurst >= T.burst[2]) add(30, fmt(maxBurst) + ' نقطة في دقيقة واحدة'); else if (maxBurst >= T.burst[1]) add(20, fmt(maxBurst) + ' نقطة في دقيقة'); else if (maxBurst >= T.burst[0]) add(8, fmt(maxBurst) + ' نقطة في دقيقة');
    if (maxCount >= T.perMin[1]) add(20, maxCount + ' تحديثات نقاط في دقيقة (أسرع من لعب بشري)'); else if (maxCount >= T.perMin[0]) add(8, maxCount + ' تحديثات نقاط في دقيقة');
    if (games > 0 && lb / games > T.perGame) add(15, 'متوسط ' + fmt(Math.round(lb / games)) + ' نقطة لكل جولة (عالي)');
    if (share > T.unverifiedShare && unverified > T.unverifiedMin) add(25, fmt(unverified) + ' نقطة من غير سجل نشاط يثبتها');
    if (last24 >= T.day) add(20, fmt(last24) + ' نقطة في آخر 24 ساعة');
    if (ageH != null && ageH < T.youngHours && lb > T.youngPoints) add(25, 'حساب عمره ' + ageH.toFixed(1) + ' ساعة وفيه ' + fmt(lb) + ' نقطة');
    score = Math.min(100, score);
    return { score: score, label: score < 25 ? 'طبيعي' : score < 55 ? 'يستاهل مراجعة' : 'غالبًا غش', reasons: reasons, maxJump: maxJump, maxBurst: maxBurst, maxCount: maxCount, verified: verified, base: base, unverified: unverified, last24: last24, events: ev.length };
  }

  function css() {
    if (document.getElementById('aiCss')) return;
    const s = el('style'); s.id = 'aiCss';
    s.textContent = '.ai-ov{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.65);display:flex;align-items:flex-end;justify-content:center}' +
      '.ai-p{width:min(600px,100%);max-height:92vh;overflow:auto;border-radius:18px 18px 0 0;padding:16px;background:var(--surface,#16213a);color:var(--text,#fff);font-size:.9rem}' +
      '.ai-h{display:flex;align-items:center;gap:12px;margin-bottom:10px}.ai-ph{width:60px;height:60px;border-radius:50%;object-fit:cover;background:rgba(127,127,127,.25);display:grid;place-items:center;font-size:1.6rem;font-weight:800;flex:none}' +
      '.ai-h b{font-size:1.05rem}.ai-h small{opacity:.7;word-break:break-all}.ai-on{display:inline-flex;align-items:center;gap:6px;font-weight:700}.ai-dot{width:10px;height:10px;border-radius:50%;background:#888}.ai-dot.on{background:#24e982;box-shadow:0 0 8px #24e982}' +
      '.ai-sec{margin:12px 0;padding:10px 12px;border-radius:12px;background:rgba(127,127,127,.13)}.ai-sec h3{margin:0 0 8px;font-size:.92rem;color:#ffcc3d}' +
      '.ai-g{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ai-g div{display:grid;gap:2px}.ai-g small{opacity:.7}.ai-g b{font-size:1rem}' +
      '.ai-gauge{height:14px;border-radius:99px;background:rgba(127,127,127,.3);overflow:hidden;margin:6px 0}.ai-gauge i{display:block;height:100%;border-radius:99px}' +
      '.ai-t{width:100%;border-collapse:collapse;font-size:.82rem}.ai-t th,.ai-t td{padding:5px 4px;text-align:start;border-bottom:1px solid rgba(127,127,127,.2)}' +
      '.ai-r li{margin:3px 0}.ai-x{float:left;border:0;border-radius:9px;padding:7px 12px;font:inherit;font-weight:700;cursor:pointer;background:rgba(127,127,127,.3);color:inherit}.ai-note{font-size:.78rem;opacity:.75;line-height:1.6}';
    document.head.appendChild(s);
  }
  const ago = t => { if (!t) return '—'; const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? 'دلوقتي' : m < 60 ? 'من ' + m + ' دقيقة' : m < 1440 ? 'من ' + Math.floor(m / 60) + ' ساعة' : 'من ' + Math.floor(m / 1440) + ' يوم'; };

  function kv(parent, pairs) { const g = el('div', 'ai-g'); pairs.forEach(x => { const d = el('div'); d.append(el('small', '', x[0]), el('b', '', String(x[1]))); g.appendChild(d); }); parent.appendChild(g); }

  async function open(uid, row) {
    if (!A.me() || !uid) return;
    css();
    const db = firebase.database(), key = safeKey(uid);
    const ov = el('div', 'ai-ov'), p = el('section', 'ai-p'); ov.appendChild(p); document.body.appendChild(ov);
    let off = null;
    const close = () => { if (off) off(); ov.remove(); };
    const x = el('button', 'ai-x', 'إغلاق'); x.type = 'button'; x.addEventListener('click', close);
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    p.append(x, el('div', 'ai-note', 'بحمّل بيانات اللاعب…'));
    const get = path => db.ref(path).once('value').then(s => s.val()).catch(() => null);
    const [lb, photo, unl, meta, logs, prog] = await Promise.all([
      get('leaderboard/' + key), get('users/' + key + '/photo'), get('users/' + key + '/unlocks'), get('activity/' + key + '/meta'), get('activity/' + key + '/log'), get('progress/' + key)
    ]);
    const log = []; Object.keys(logs || {}).forEach(day => Object.keys(logs[day] || {}).forEach(k => { const e = logs[day][k]; if (e && typeof e === 'object') log.push({ t: Number(e.t) || 0, d: Number(e.d) || 0, p: Number(e.p) || 0, g: String(e.g || '') }); }));
    const points = Number((lb && lb.points) || (row && row.points) || 0), name = String((lb && lb.name) || (row && row.name) || 'لاعب');
    const an = analyze(log, meta || {}, points);
    p.textContent = ''; p.appendChild(x);

    const head = el('div', 'ai-h');
    let pic;
    if (typeof photo === 'string' && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(photo)) { pic = el('img', 'ai-ph'); pic.src = photo; pic.alt = ''; }
    else pic = el('div', 'ai-ph', Array.from(name)[0] || '?');
    const info = el('div'); const on = el('div', 'ai-on'), dot = el('span', 'ai-dot'), ont = el('span', '', 'بحمّل…'); on.append(dot, ont);
    info.append(el('b', '', name), on, el('small', '', 'UID: ' + uid)); head.append(pic, info); p.appendChild(head);
    const st = db.ref('status/' + key), cb = s => { const v = s.val() || {}; dot.classList.toggle('on', v.online === true); ont.textContent = v.online === true ? 'متصل دلوقتي' + (v.page ? ' • في ' + v.page : '') : (v.last ? 'غير متصل • آخر ظهور ' + ago(v.last) : 'غير متصل (مفيش بيانات)'); };
    st.on('value', cb, () => { ont.textContent = 'مقدرتش أقرأ حالة الاتصال'; }); off = () => st.off('value', cb);

    const s1 = el('div', 'ai-sec'); s1.appendChild(el('h3', '', 'النقاط والجولات'));
    kv(s1, [['النقاط في الليدربورد', fmt(points)], ['نقاط ليها سجل يثبتها', fmt(an.verified + an.base)], ['نقاط بدون سجل', fmt(an.unverified)], ['الجولات اللي لعبها', fmt((meta && meta.games) || (prog && prog.stats && prog.stats.games) || 0)], ['أعلى نتيجة', fmt((meta && meta.best) || (prog && prog.stats && prog.stats.best) || 0)], ['أول ظهور للسجل', meta && meta.first ? ago(meta.first) : '—']]);
    s1.appendChild(el('div', 'ai-note', 'النقاط بتتحسب في متصفح اللاعب، فمفيش رقم "حقيقي" مضمون 100%. "نقاط ليها سجل" = النقاط الأولية + اللي اتسجلت تغييراتها.'));
    p.appendChild(s1);

    /* تقدّمه في كل لعبة (من سجل النقاط) */
    const byG = {}; log.forEach(e => { const g = e.g || '?'; const o = byG[g] = byG[g] || { n: 0, pts: 0, last: 0, max: 0, lastP: 0 }; o.n++; if (e.d > 0) o.pts += e.d; o.max = Math.max(o.max, e.d); if (e.t >= o.last) { o.last = e.t; o.lastP = e.p; } });
    const s2 = el('div', 'ai-sec'); s2.appendChild(el('h3', '', 'النشاط في الألعاب (آخر 14 يوم)'));
    const gk = Object.keys(byG).sort((a, b) => byG[b].last - byG[a].last);
    if (!gk.length) s2.appendChild(el('div', 'ai-note', 'مفيش سجل نشاط لسه.'));
    else {
      const tb = el('table', 'ai-t'), h = tb.insertRow(); ['اللعبة', 'مرات', 'نقاط', 'أكبر زيادة', 'آخر نشاط'].forEach(t => h.appendChild(el('th', '', t)));
      gk.forEach(g => { const r = tb.insertRow(), o = byG[g]; [g, o.n, fmt(o.pts), fmt(o.max), ago(o.last)].forEach(v => r.insertCell().textContent = v); });
      s2.appendChild(tb);
    }
    p.appendChild(s2);

    /* تقدمه ومراحله */
    const s3 = el('div', 'ai-sec'); s3.appendChild(el('h3', '', 'التقدّم والمراحل'));
    const pr = prog || {}, rows = [];
    if (pr.career) rows.push(['مهنة اللاعب', pr.career.club + ' • عمر ' + pr.career.age + ' • طاقة ' + pr.career.ovr + ' • ' + pr.career.seasons + ' موسم • ' + fmt(pr.career.apps) + ' مباراة • ' + fmt(pr.career.goals) + ' هدف • ' + pr.career.honors + ' بطولة/جايزة']);
    if (pr.coach) rows.push(['مهنة المدرب', Object.keys(pr.coach).filter(k => k !== 'kind').map(k => k + ': ' + pr.coach[k]).join(' • ') || 'موجودة']);
    if (pr.streak) rows.push(['أيام متتالية', pr.streak.days + ' يوم']);
    if (pr.daily) rows.push(['آخر تحدي يومي', pr.daily.date]);
    if (unl && typeof unl === 'object') rows.push(['العناصر المفتوحة', Object.keys(unl).filter(k => unl[k] && typeof unl[k] === 'object').map(k => k + ': ' + Object.keys(unl[k]).length).join(' • ') || 'فيه بيانات']);
    if (pr.t) rows.push(['آخر تحديث للتقدم', ago(pr.t) + (pr.page ? ' • من صفحة ' + pr.page : '')]);
    if (!rows.length) s3.appendChild(el('div', 'ai-note', 'مفيش ملخص تقدّم لسه (بيتحدّث لما اللاعب يفتح الموقع).'));
    rows.forEach(r => { const d = el('div'); d.append(el('small', '', r[0] + ': '), document.createTextNode(r[1])); d.style.margin = '5px 0'; s3.appendChild(d); });
    p.appendChild(s3);

    /* احتمال الغش */
    const s4 = el('div', 'ai-sec'); s4.appendChild(el('h3', '', 'احتمال الغش أو النشاط غير الطبيعي'));
    const col = an.score < 25 ? '#24e982' : an.score < 55 ? '#ffcc3d' : '#ff5d5d';
    const head4 = el('div'); head4.append(el('b', '', an.score + '% • ' + an.label)); s4.appendChild(head4);
    const g = el('div', 'ai-gauge'), fi = el('i'); fi.style.width = Math.max(2, an.score) + '%'; fi.style.background = col; g.appendChild(fi); s4.appendChild(g);
    kv(s4, [['أكبر زيادة مرة واحدة', fmt(an.maxJump)], ['أكبر زيادة في دقيقة', fmt(an.maxBurst)], ['أكتر تحديثات في دقيقة', an.maxCount], ['نقاط آخر 24 ساعة', fmt(an.last24)]]);
    if (an.reasons.length) { const ul = el('ul', 'ai-r'); an.reasons.forEach(r => ul.appendChild(el('li', '', r))); s4.appendChild(ul); }
    else s4.appendChild(el('div', 'ai-note', 'مفيش مؤشرات مريبة في السجل المتاح.'));
    s4.appendChild(el('div', 'ai-note', 'ده تقدير تقريبي من سجل النقاط (' + an.events + ' حدث). ممكن يبقى لاعب شاطر فعلًا، أو غشاش بيزوّر النقاط بشكل بطيء. الحد الأدنى للقرار: راجع السجل بنفسك.'));
    p.appendChild(s4);
  }

  window.KoraAdminInspect = { open: open, _analyze: analyze };
})();
