/* Kora Challenge — تحدي الأصحاب برابط
   الرابط بيشيل: رقم عشوائي (seed) + الطور + نقاط صاحبك + اسمه.
   اللي يفتح الرابط بيلعب نفس الأسئلة/الشبكة وفي الآخر بيشوف فاز ولا خسر.
   بيشتغل في تخمين اللاعب وشبكة اللاعيبة. */
(() => {
  'use strict';
  const q = new URLSearchParams(location.search);
  const Sec = window.KoraSec || { name: s => String(s || '').trim().slice(0, 24) };
  const info = q.get('ch') ? {
    seed: (Number(q.get('ch')) || 1) >>> 0,
    mode: String(q.get('m') || '').slice(0, 24),
    score: Math.max(0, Math.min(1e6, Math.floor(Number(q.get('s')) || 0))),
    name: Sec.name(q.get('n') || 'صاحبك', 24) || 'صاحبك'
  } : null;
  let cur = null;

  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* بيشغّل fn وMath.random مضبوط على الـseed بتاع التحدي (أو seed جديد لو لعبة عادية) */
  function run(mode, fn) {
    const same = info && info.mode === mode;
    const seed = same ? info.seed : (Math.random() * 4294967296) >>> 0;
    cur = { seed: seed, mode: mode, challenge: !!same };
    const orig = Math.random;
    Math.random = mulberry(seed);
    try { return fn(); } finally { Math.random = orig; }
  }

  function myName() {
    const u = (window.KoraAuth && window.KoraAuth.user) || (window.firebase && firebase.auth && firebase.auth().currentUser);
    return u ? Sec.name(u.displayName || (u.email ? u.email.split('@')[0] : '') || 'صاحبك', 24) : 'صاحبك';
  }

  function link(score) {
    if (!cur) return '';
    const u = new URL(location.href);
    u.search = ''; u.hash = '';
    u.searchParams.set('ch', String(cur.seed));
    u.searchParams.set('m', cur.mode);
    u.searchParams.set('s', String(Math.max(0, Math.floor(score) || 0)));
    u.searchParams.set('n', myName());
    return u.toString();
  }

  async function share(url, text) {
    try {
      if (navigator.share) { await navigator.share({ text: text, url: url }); return 'shared'; }
    } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    try { await navigator.clipboard.writeText(url); return 'copied'; } catch (e) { return 'fail'; }
  }

  function css() {
    if (document.getElementById('kcChStyle')) return;
    const s = document.createElement('style'); s.id = 'kcChStyle';
    s.textContent = '.kc-ch{margin:14px auto;padding:12px 14px;border-radius:14px;background:rgba(255,204,61,.14);border:1px solid rgba(255,204,61,.5);text-align:center;font-weight:700;line-height:1.7;max-width:520px}' +
      '.kc-ch.win{background:rgba(52,199,89,.16);border-color:rgba(52,199,89,.6)}.kc-ch.lose{background:rgba(255,122,89,.14);border-color:rgba(255,122,89,.6)}' +
      '.kc-ch button{font:inherit;font-weight:800;margin:8px 4px 0;padding:10px 16px;border-radius:12px;border:0;cursor:pointer;background:#ffcc3d;color:#14213d}' +
      '.kc-ch small{display:block;font-weight:600;opacity:.8}';
    document.head.appendChild(s);
  }

  /* شريط أعلى الصفحة لما حد يفتح رابط تحدي */
  function banner(host, extra) {
    if (!info || !host) return null;
    css();
    const d = document.createElement('div'); d.className = 'kc-ch'; d.id = 'kcChBanner';
    d.textContent = '⚔️ ' + info.name + ' بيتحداك! هدفه ' + info.score + ' نقطة. هتلعب نفس الأسئلة بالظبط.';
    if (extra) d.appendChild(extra);
    host.prepend(d);
    return d;
  }

  /* كارت في شاشة النتيجة: مقارنة (لو تحدي) + زرار تحدّي صاحبك */
  function result(host, score) {
    if (!host || !cur) return;
    css();
    const old = host.querySelector('.kc-ch-res'); if (old) old.remove();
    const box = document.createElement('div'); box.className = 'kc-ch kc-ch-res';
    if (cur.challenge && info) {
      const w = score > info.score, t = score === info.score;
      box.classList.add(w ? 'win' : t ? 'tie' : 'lose');
      box.textContent = w ? '🎉 فزت على ' + info.name + '! (' + score + ' ضد ' + info.score + ')'
        : t ? '🤝 تعادل مع ' + info.name + ' (' + score + ' نقطة)'
        : '😅 ' + info.name + ' فاز عليك (' + info.score + ' ضد ' + score + '). جرب تاني!';
    } else box.textContent = 'عايز تتحدى صاحبك؟ هيلعب نفس أسئلتك ويقارن نتيجته بنتيجتك.';
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'تحدّى صاحبك بالأسئلة دي';
    const msg = document.createElement('small');
    b.addEventListener('click', async () => {
      const r = await share(link(score), 'جبت ' + score + ' نقطة في Kora Challenge. قدر تكسرني؟ 😎');
      msg.textContent = r === 'copied' ? 'اتنسخ الرابط، ابعته لصاحبك' : r === 'fail' ? 'معرفتش أنسخ الرابط' : '';
    });
    box.append(b, msg);
    host.appendChild(box);
  }

  window.KoraChallenge = { info: info, run: run, link: link, share: share, banner: banner, result: result, current: () => cur };
})();
