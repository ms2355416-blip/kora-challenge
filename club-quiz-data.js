/* Kora Challenge — أسئلة «اختبر معلوماتك عن فريقك المفضل»
   لكل نادي 20 سؤال: e = 5 سهلة، m = 10 متوسطة، h = 5 صعبة (المستوى مش بيظهر للاعب).
   السؤال: [نص السؤال, الإجابة الصح, غلط1, غلط2, غلط3]
   الأسئلة بتتقسم على ملفات club-quiz-data-1.js … 4 وكلها بتسجّل نفسها هنا. */
(function (root) {
  'use strict';
  var REG = {};
  var API = {
    register: function (o) { Object.keys(o).forEach(function (k) { REG[k] = o[k]; }); },
    get: function (name) { return REG[name] || null; },
    names: function () { return Object.keys(REG); },
    /* بيرجع 20 سؤال جاهزة: { q, opts[4], ans, lv } بترتيب عشوائي والمستوى مخفي */
    build: function (name, rng) {
      var d = REG[name]; if (!d) return null;
      rng = rng || Math.random;
      var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
      var all = [];
      [['e', 1], ['m', 2], ['h', 3]].forEach(function (g) { (d[g[0]] || []).forEach(function (r) { all.push({ r: r, lv: g[1] }); }); });
      return shuffle(all).map(function (x) {
        var opts = shuffle([x.r[1], x.r[2], x.r[3], x.r[4]]);
        return { q: x.r[0], opts: opts, ans: opts.indexOf(x.r[1]), lv: x.lv, right: x.r[1] };
      });
    },
    POINTS: { 1: 5, 2: 8, 3: 12 }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.KoraClubQuiz = API;
})(typeof window !== 'undefined' ? window : globalThis);
