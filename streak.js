/* Kora Challenge — سلسلة الأيام المتتالية (مصدر واحد للحساب)
   بيخزن في localStorage['koraChallengeStreak'] = { days, lastDate:'YYYY-MM-DD' } (بتوقيت جهاز اللاعب)
   - get(): بيرجّع السلسلة الفعلية: لو فات يوم كامل من غير لعب بترجع 0 (مش بنعرض رقم قديم).
   - touch(): بيتنادى لما اللاعب يخلص أي لعبة؛ بيزود يوم واحد بس في اليوم. */
(() => {
  'use strict';
  const KEY = 'koraChallengeStreak';
  const DAY = 86400000;

  const pad = n => String(n).padStart(2, '0');
  function dateKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }

  // بنحوّل أي صيغة تاريخ لمنتصف الليل المحلي، عشان الفرق يتحسب بالأيام صح (من غير مشاكل UTC أو التوقيت الصيفي)
  function dayNumber(str) {
    if (!str) return NaN;
    let y, m, d;
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(str));
    if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; }
    else {
      const t = new Date(str);
      if (isNaN(t)) return NaN;
      y = t.getFullYear(); m = t.getMonth() + 1; d = t.getDate();
    }
    return Math.round(Date.UTC(y, m - 1, d) / DAY);
  }

  function read() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY) || '{}');
      return { days: Math.max(0, Math.floor(Number(o.days) || 0)), lastDate: o.lastDate || '' };
    } catch (e) { return { days: 0, lastDate: '' }; }
  }

  function get() {
    const s = read();
    if (!s.days) return { days: 0, lastDate: s.lastDate, playedToday: false };
    const diff = dayNumber(dateKey()) - dayNumber(s.lastDate);
    if (isNaN(diff) || diff < 0) return { days: s.days, lastDate: s.lastDate, playedToday: true }; // ساعة الجهاز اتغيرت: منبوّظش السلسلة
    if (diff > 1) return { days: 0, lastDate: s.lastDate, playedToday: false };
    return { days: s.days, lastDate: s.lastDate, playedToday: diff === 0 };
  }

  function touch() {
    const cur = get();
    const today = dateKey();
    if (cur.playedToday && cur.days > 0) return cur;
    const next = { days: (cur.days || 0) + 1, lastDate: today };
    try { localStorage.setItem(KEY, JSON.stringify({ days: next.days, lastDate: today })); } catch (e) { /* ignore */ }
    try { window.dispatchEvent(new CustomEvent('kora-streak-change')); } catch (e) { /* ignore */ }
    return { days: next.days, lastDate: today, playedToday: true };
  }

  window.KoraStreak = { get, touch, dateKey, dayNumber };
})();
