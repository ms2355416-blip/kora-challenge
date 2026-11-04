/* Kora Challenge — رسومات الممتلكات (SVG واقعية بتفاصيل بتزيد مع السعر) */
(function (root) {
  'use strict';
  var N = 0;
  function uid() { return 'ka' + (++N); }
  function rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.split('').map(function (c) { return c + c; }).join(''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function shade(h, p) { var c = rgb(h); return 'rgb(' + c.map(function (v) { return Math.max(0, Math.min(255, Math.round(p >= 0 ? v + (255 - v) * p : v * (1 + p)))); }).join(',') + ')'; }
  function lg(id, x1, y1, x2, y2, st) { return '<linearGradient id="' + id + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '">' + st.map(function (s) { return '<stop offset="' + s[0] + '" stop-color="' + s[1] + '"' + (s[2] != null ? ' stop-opacity="' + s[2] + '"' : '') + '/>'; }).join('') + '</linearGradient>'; }
  function R(x, y, w, h, f, rx, ex) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 0) + '" fill="' + f + '"' + (ex || '') + '/>'; }
  function P(d, f, ex) { return '<path d="' + d + '" fill="' + f + '"' + (ex || '') + '/>'; }
  function L(d, s, w, ex) { return '<path d="' + d + '" fill="none" stroke="' + s + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (ex || '') + '/>'; }
  function C(x, y, r, f, ex) { return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + f + '"' + (ex || '') + '/>'; }
  function E(x, y, rx, ry, f, ex) { return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" fill="' + f + '"' + (ex || '') + '/>'; }
  function svg(w, h, defs, inner) { return '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>' + defs + '</defs>' + inner + '</svg>'; }
  function rep(n, f) { var s = ''; for (var i = 0; i < n; i++) s += f(i); return s; }

  /* ======================= البيوت (200×130) ======================= */
  function house(k, col) {
    var sky = uid(), gr = uid(), wl = uid(), rf = uid(), gl = uid(), gld = uid(), pool = uid();
    var defs = lg(sky, 0, 0, 0, 1, [[0, '#bfe3f7'], [1, '#eef8ee']]) + lg(gr, 0, 0, 0, 1, [[0, '#6cc070'], [1, '#3f9650']]) +
      lg(wl, 0, 0, 0, 1, [[0, shade(col, .22)], [1, shade(col, -.12)]]) + lg(rf, 0, 0, 0, 1, [[0, '#b85a45'], [1, '#7d3a2b']]) +
      lg(gl, 0, 0, 1, 1, [[0, '#ffeeb8'], [1, '#f2b45e']]) + lg(gld, 0, 0, 0, 1, [[0, '#f4d775'], [1, '#b98a2a']]) + lg(pool, 0, 0, 0, 1, [[0, '#7fd7f4'], [1, '#2fa4d6']]);
    function win(x, y, w, h, lit) { return R(x - 1.5, y - 1.5, w + 3, h + 3, '#f3ecd9', 1.5) + R(x, y, w, h, lit === false ? '#8fc3e3' : 'url(#' + gl + ')', 1) + R(x + w / 2 - .5, y, 1, h, '#f3ecd9') + R(x, y + h / 2 - .5, w, 1, '#f3ecd9') + R(x - 2, y + h + 1.5, w + 4, 2, '#d8cfb8', 1); }
    function door(x, y, w, h, c) { return R(x - 1.5, y - 1.5, w + 3, h + 1.5, '#f3ecd9', 2) + P('M' + x + ' ' + (y + h) + ' L' + x + ' ' + (y + 4) + ' Q' + x + ' ' + y + ' ' + (x + 4) + ' ' + y + ' L' + (x + w - 4) + ' ' + y + ' Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + 4) + ' L' + (x + w) + ' ' + (y + h) + ' Z', c) + R(x + 2, y + 4, w / 2 - 3, h / 2 - 3, shade(c, .18), 1) + R(x + w / 2 + 1, y + 4, w / 2 - 3, h / 2 - 3, shade(c, .18), 1) + C(x + w - 3, y + h / 2 + 2, 1.1, '#e8c25a'); }
    function bush(x, y, s) { return E(x, y, 9 * s, 6 * s, '#2f8a47') + E(x - 5 * s, y + 1, 7 * s, 5 * s, '#3da556') + E(x + 6 * s, y + 1, 7 * s, 5 * s, '#37984e'); }
    function tree(x, y, s) { return R(x - 2 * s, y, 4 * s, 20 * s, '#6e4a2e') + C(x, y - 6 * s, 13 * s, '#2f8a47') + C(x - 9 * s, y + s, 9 * s, '#3da556') + C(x + 9 * s, y + s, 9 * s, '#37984e') + C(x - 3 * s, y - 12 * s, 8 * s, '#47b562'); }
    function palm(x, y, s) { return L('M' + x + ' ' + (y + 30 * s) + ' Q' + (x + 3 * s) + ' ' + (y + 14 * s) + ' ' + x + ' ' + y, '#8a6238', 3 * s) + L('M' + x + ' ' + y + ' q-16 -2 -20 10', '#2f8a47', 3 * s) + L('M' + x + ' ' + y + ' q16 -2 20 10', '#2f8a47', 3 * s) + L('M' + x + ' ' + y + ' q-8 -12 -16 -8', '#3da556', 3 * s) + L('M' + x + ' ' + y + ' q8 -12 16 -8', '#3da556', 3 * s); }
    var s = R(0, 0, 200, 130, 'url(#' + sky + ')') + P('M0 104 Q100 98 200 104 L200 130 L0 130Z', 'url(#' + gr + ')') + P('M70 130 L84 104 L116 104 L130 130Z', '#c9c4b8', ' opacity=".9"');
    if (k === 0) { // استوديو بسيط
      s += E(100, 106, 56, 4, 'rgba(0,0,0,.18)') + R(56, 58, 88, 46, 'url(#' + wl + ')') + R(52, 52, 96, 8, '#7d868b', 1) + R(52, 59, 96, 2, 'rgba(0,0,0,.25)') + win(68, 70, 22, 18) + door(108, 72, 16, 32, '#6c4a30') +
        R(100, 66, 32, 4, '#b94a3c', 1) + R(128, 80, 12, 8, '#cfd6d9', 1) + R(130, 82, 8, 1, '#8a949a') + R(56, 104, 88, 3, '#aaa') + bush(48, 103, .8) + tree(168, 82, .8);
    } else if (k === 1) { // شقة في عمارة
      s += E(100, 106, 62, 4, 'rgba(0,0,0,.18)') + R(48, 20, 104, 84, 'url(#' + wl + ')') + R(44, 15, 112, 7, '#6e7a80', 1) + R(60, 6, 22, 11, '#9aa4a9', 2) + R(62, 3, 18, 4, '#7d868b', 2);
      for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) { var x = 58 + c * 32, y = 28 + r * 24; s += win(x, y, 16, 14, (r + c) % 2 === 0) + R(x - 4, y + 15, 24, 5, '#e9e4d6', 1) + L('M' + (x - 4) + ' ' + (y + 17.5) + ' L' + (x + 20) + ' ' + (y + 17.5), '#9aa4a9', 1); }
      s += door(92, 78, 16, 26, '#3f5568') + R(84, 72, 32, 4, '#2f7cf6', 1) + bush(40, 104, .9) + bush(162, 104, .9) + tree(176, 84, .8);
    } else if (k === 2) { // تاون هاوس
      s += E(100, 106, 62, 4, 'rgba(0,0,0,.2)') + R(56, 50, 88, 54, 'url(#' + wl + ')') + rep(6, function (b) { return L('M56 ' + (56 + b * 9) + ' L144 ' + (56 + b * 9), 'rgba(0,0,0,.12)', 1); }) +
        P('M46 52 L100 14 L154 52 Z', 'url(#' + rf + ')') + L('M52 49 L100 18 L148 49', 'rgba(255,255,255,.25)', 1.5) + R(122, 14, 10, 20, '#8a4a3a') + R(120, 12, 14, 4, '#6b3a2e') +
        win(66, 58, 18, 16) + win(116, 58, 18, 16) + win(66, 80, 14, 14) + R(78, 96, 44, 8, '#bdb7a8') + door(91, 76, 18, 28, '#2f4a3a') + R(88, 100, 24, 4, '#d3cdbd') + win(120, 80, 14, 14, false) +
        R(40, 100, 14, 1.5, '#e9e4d6') + R(40, 98, 2, 8, '#e9e4d6') + R(46, 98, 2, 8, '#e9e4d6') + bush(48, 104, .9) + bush(152, 104, .9) + tree(172, 80, .85);
    } else if (k === 3) { // بيت عائلي بجراج
      s += E(104, 107, 76, 4, 'rgba(0,0,0,.2)') + R(40, 54, 80, 50, 'url(#' + wl + ')') + P('M32 56 L80 20 L128 56 Z', 'url(#' + rf + ')') + L('M38 53 L80 24 L122 53', 'rgba(255,255,255,.25)', 1.5) + R(100, 22, 9, 16, '#8a4a3a') +
        R(118, 70, 52, 34, '#e9e6de') + P('M114 72 L144 52 L174 72 Z', '#6b3a2e') + R(124, 78, 40, 26, '#c8ccce') + rep(4, function (i) { return R(124, 80 + i * 6, 40, 1, 'rgba(0,0,0,.2)'); }) + R(40, 94, 60, 3, '#d8d2c2') +
        win(50, 62, 18, 16) + win(92, 62, 18, 16) + door(72, 76, 18, 28, '#3b5a7a') + R(70, 70, 22, 3, '#f3ecd9') + R(46, 98, 70, 2, '#f3ecd9') + rep(8, function (i) { return R(48 + i * 9, 92, 2, 8, '#f3ecd9'); }) + R(120, 104, 46, 4, '#b9b4a8') +
        bush(36, 104, .9) + tree(16, 82, 1) + tree(186, 86, .8);
    } else if (k === 4) { // فيلا مودرن
      s += E(100, 108, 84, 4, 'rgba(0,0,0,.2)') + R(30, 62, 74, 42, '#eceae4') + R(76, 34, 92, 44, '#d9dcdc') + R(26, 58, 82, 6, '#3a444b', 1) + R(72, 30, 100, 6, '#3a444b', 1) +
        R(80, 40, 62, 32, 'url(#' + gl + ')', 1) + rep(3, function (i) { return R(100 + i * 20, 40, 1.5, 32, '#3a444b'); }) + R(150, 40, 14, 32, '#7a5a3c') + rep(7, function (i) { return R(150, 42 + i * 4.5, 14, 1, 'rgba(0,0,0,.25)'); }) +
        R(36, 70, 32, 22, 'url(#' + gl + ')', 1) + R(51, 70, 1.5, 22, '#3a444b') + R(74, 84, 20, 20, '#b6bcc0') + R(76, 86, 16, 16, 'url(#' + gl + ')', 1) + R(76, 74, 92, 3, 'rgba(120,180,220,.7)') + rep(12, function (i) { return R(77 + i * 8, 71, 1, 6, '#3a444b'); }) +
        R(20, 104, 70, 10, 'url(#' + pool + ')', 3) + R(20, 104, 70, 2, 'rgba(255,255,255,.55)') + palm(184, 76, 1) + palm(14, 82, .85) + bush(104, 106, .8);
    } else if (k === 5) { // قصر بمسبح
      s += E(100, 108, 94, 5, 'rgba(0,0,0,.2)') + R(18, 54, 164, 50, 'url(#' + wl + ')') + P('M12 56 L100 20 L188 56Z', '#8a5a3a') + P('M12 56 L100 20 L100 56Z', 'rgba(255,255,255,.12)') + L('M20 53 L100 24 L180 53', 'rgba(255,255,255,.3)', 1.5) +
        R(68, 40, 64, 64, '#f5ecd6') + P('M64 42 L100 22 L136 42Z', '#c9a24a') + rep(5, function (i) { return R(72 + i * 12.5, 46, 5, 58, '#fffaf0') + R(70.5 + i * 12.5, 44, 8, 3, '#e4d8b8') + R(70.5 + i * 12.5, 100, 8, 4, '#e4d8b8'); }) +
        door(92, 74, 16, 30, '#4a2f1d') + [26, 40, 144, 158].map(function (x) { return win(x, 66, 14, 20); }).join('') +
        P('M30 56 L38 44 L46 56Z', '#8a5a3a') + win(33, 49, 8, 7, true) + P('M154 56 L162 44 L170 56Z', '#8a5a3a') + win(157, 49, 8, 7, true) + R(88, 104, 24, 6, '#d9d2bf') + bush(18, 104, 1) + bush(182, 104, 1) + tree(8, 86, .8) + tree(194, 86, .8) +
        R(22, 112, 52, 12, 'url(#' + pool + ')', 3) + R(22, 112, 52, 2, 'rgba(255,255,255,.55)') + R(150, 112, 30, 8, '#3da556', 3);
    } else { // قصر ملكي
      s += E(100, 108, 98, 5, 'rgba(0,0,0,.22)') + R(10, 56, 180, 48, 'url(#' + wl + ')') + R(70, 38, 60, 66, shade(col, .08)) + R(14, 30, 40, 74, 'url(#' + wl + ')') + R(146, 30, 40, 74, 'url(#' + wl + ')') +
        P('M8 32 L34 6 L60 32Z', 'url(#' + gld + ')') + P('M140 32 L166 6 L192 32Z', 'url(#' + gld + ')') + R(33, 0, 2, 8, '#444') + P('M35 0 L46 3 L35 6Z', '#e8453c') + R(165, 0, 2, 8, '#444') + P('M167 0 L178 3 L167 6Z', '#e8453c') +
        P('M72 38 A28 28 0 0 1 128 38Z', 'url(#' + gld + ')') + R(98, 6, 4, 10, '#b98a2a') + C(100, 14, 4, '#f4d775') + L('M76 38 A24 24 0 0 1 124 38', 'rgba(255,255,255,.5)', 1.5) +
        [22, 36, 150, 164].map(function (x) { return win(x, 40, 10, 16) + win(x, 66, 10, 16); }).join('') + [78, 92, 106, 120].map(function (x) { return win(x, 48, 8, 14); }).join('') + [78, 120].map(function (x) { return win(x, 70, 8, 14); }).join('') +
        R(88, 72, 24, 32, '#3b2a1b', 12) + R(90, 74, 20, 30, '#5a3e26', 10) + R(99.5, 74, 1, 30, '#e8c25a') + R(60, 104, 80, 3, '#e4ddc8') + R(54, 107, 92, 3, '#d8d1bb') + R(48, 110, 104, 3, '#ccc5af') +
        [60, 76, 124, 140].map(function (x) { return bush(x, 106, .7); }).join('') + P('M0 114 L40 114 L40 122 L0 122Z', '#357f47') + P('M160 114 L200 114 L200 122 L160 122Z', '#357f47');
    }
    return svg(200, 130, defs, s);
  }

  /* ======================= العربيات (200×96) ======================= */
  var SH = {
    hatch: { wx: [54, 150], wr: 13, wy: 66, body: 'M10 66 L10 54 Q10 47 19 45 L40 43 Q50 27 66 25 L112 25 Q128 25 138 35 L150 44 L176 48 Q192 50 192 58 L192 66 Z',
      glass: ['M52 42 Q58 29 67 28 L84 28 L84 42 Z', 'M88 28 L111 28 Q122 28 130 37 L134 42 L88 42 Z'], door: 'M86 28 L86 61', sh: 'M16 50 L176 50', hl: [186, 53], tl: [12, 53] },
    sedan: { wx: [52, 148], wr: 13, wy: 66, body: 'M8 66 L8 56 Q8 50 16 48 L42 45 L58 30 Q61 27 66 27 L110 27 Q120 27 126 33 L144 45 L178 49 Q194 51 194 58 L194 66 Z',
      glass: ['M52 44 L62 31 L82 31 L82 44 Z', 'M86 31 L110 31 Q116 31 120 35 L130 44 L86 44 Z'], door: 'M84 31 L84 62', sh: 'M14 52 L180 52', hl: [188, 54], tl: [10, 54] },
    suv: { wx: [54, 148], wr: 14.5, wy: 64, body: 'M10 66 L10 50 Q10 44 18 42 L34 40 L46 22 Q48 19 52 19 L128 19 Q134 19 138 24 L152 40 L178 44 Q192 46 192 54 L192 66 Z',
      glass: ['M50 38 L56 24 L84 24 L84 38 Z', 'M88 24 L126 24 L136 38 L88 38 Z'], door: 'M86 24 L86 60', sh: 'M14 46 L178 46', hl: [186, 50], tl: [12, 50], rails: 'M56 16 L126 16' },
    coupe: { wx: [52, 148], wr: 13, wy: 66, body: 'M8 66 L8 58 Q8 52 17 50 L44 46 Q62 28 80 27 L108 27 Q124 28 134 39 L146 47 L180 51 Q195 53 195 60 L195 66 Z',
      glass: ['M70 44 Q80 31 90 31 L102 31 L102 44 Z', 'M106 31 Q114 31 120 37 L128 44 L106 44 Z'], door: 'M104 31 L104 61', sh: 'M14 53 L182 53', hl: [189, 56], tl: [10, 56] },
    pickup: { wx: [52, 150], wr: 14, wy: 65, body: 'M8 66 L8 46 L72 46 L76 36 Q80 24 92 24 L124 24 Q132 24 138 32 L150 44 L180 48 Q194 50 194 58 L194 66 Z',
      glass: ['M82 42 L88 29 L120 29 Q126 29 130 35 L136 42 Z'], door: 'M106 29 L106 60', sh: 'M76 47 L178 47', hl: [188, 54], tl: [10, 52], bed: true },
    super: { wx: [54, 146], wr: 12.5, wy: 67, body: 'M6 68 L6 62 Q8 56 18 55 L58 50 L90 35 Q96 32 104 32 L124 33 Q134 35 142 43 L150 50 L184 55 Q198 58 198 64 L198 68 Z',
      glass: ['M92 48 L100 37 L112 36 Q122 37 128 43 L134 48 Z'], door: 'M112 36 L112 62', sh: 'M12 57 L186 57', hl: [190, 58], tl: [8, 60], super: true }
  };
  function wheel(x, y, r, rim) {
    var s = C(x, y, r + 3.2, '#0a0d10') + C(x, y, r, '#15191d') + C(x, y, r * .68, 'url(#' + rim + ')');
    for (var i = 0; i < 5; i++) { var a = i * 72 * Math.PI / 180; s += L('M' + x + ' ' + y + ' L' + (x + Math.cos(a) * r * .62).toFixed(1) + ' ' + (y + Math.sin(a) * r * .62).toFixed(1), '#59646b', 1.6); }
    return s + C(x, y, r * .2, '#3b4349') + C(x, y, r * .08, '#c9d1d6');
  }
  function car(t, col, id) {
    var S = SH[t] || SH.sedan, bd = uid(), gl = uid(), rm = uid(), hlg = uid();
    var defs = lg(bd, 0, 0, 0, 1, [[0, shade(col, .38)], [.42, col], [1, shade(col, -.38)]]) + lg(gl, 0, 0, 0, 1, [[0, '#e8f6ff'], [1, '#5a8cae']]) + lg(rm, 0, 0, 1, 1, [[0, '#f3f6f8'], [1, '#86929a']]) +
      '<radialGradient id="' + hlg + '"><stop offset="0" stop-color="#fffbe0"/><stop offset="1" stop-color="#ffd86b" stop-opacity="0"/></radialGradient>';
    var dark = '#12161a';
    var s = E(100, 82, 92, 5, 'rgba(0,0,0,.3)');
    if (S.bed) s += R(10, 40, 62, 8, shade(col, -.5)) + R(8, 38, 66, 4, shade(col, -.2), 2);
    s += P(S.body, 'url(#' + bd + ')') + L(S.sh, shade(col, .55), 1.2, ' opacity=".6"') + R(S.wx[0] - 26, 60, S.wx[1] - S.wx[0] + 52, 4, shade(col, -.55), 2, ' opacity=".55"');
    if (S.bed) s += L('M12 40 L72 40', shade(col, .4), 1.4);
    S.glass.forEach(function (g) { s += P(g, 'url(#' + gl + ')', ' stroke="' + dark + '" stroke-width="1.4"'); });
    s += L(S.door, dark, 1, ' opacity=".5"') + R(S.wx[0] + 40, 47, 7, 2, shade(col, -.6), 1);
    if (S.rails) s += L(S.rails, '#9aa4a9', 2.2);
    if (S.super) s += P('M4 52 L34 49 L34 52 L4 55Z', shade(col, -.4)) + R(14, 50, 2.5, 8, '#222') + P('M112 54 L134 54 L128 61 L112 61Z', '#0c0f12') + R(160, 60, 36, 3, '#101316');
    if (t === 'coupe') s += P('M10 52 L28 50 L28 53 L10 55Z', shade(col, -.35));
    if (id === 'c8' || id === 'c13') s += P('M8 49 L24 47 L24 50 L8 52Z', shade(col, -.45));
    if (id === 'c20') s += L('M92 33 Q96 62 118 60', '#101316', 3) + L('M70 50 L180 56', '#0e1114', 2.2);
    if (id === 'c16' || id === 'c14') s += R(182, 42, 5, 10, '#d9dee2', 1) + L('M179 42 L179 56', '#aab3b9', 1.6);
    if (id === 'c19') s += L('M20 58 L170 58', '#ffd34a', 1.6);
    S.wx.forEach(function (x) { s += wheel(x, S.wy, S.wr, rm); });
    s += E(S.hl[0], S.hl[1], 9, 5, 'url(#' + hlg + ')') + P('M' + (S.hl[0] - 6) + ' ' + (S.hl[1] - 2.5) + ' L' + (S.hl[0] + 3) + ' ' + (S.hl[1] - 2) + ' L' + (S.hl[0] + 3) + ' ' + (S.hl[1] + 2) + ' L' + (S.hl[0] - 6) + ' ' + (S.hl[1] + 1.5) + 'Z', '#fff6c8') +
      R(S.tl[0] - 2, S.tl[1] - 3, 6, 5, '#e11d2e', 1.5) + R(S.tl[0] - 1, S.tl[1] - 2, 3, 1.6, '#ff8a8a', 1);
    return svg(200, 96, defs, s);
  }

  /* ======================= الموتوسيكلات (200×110) ======================= */
  function mWheel(x, y, r) {
    var s = C(x, y, r, 'none', ' stroke="#12161a" stroke-width="6.5"') + C(x, y, r - 4.5, 'none', ' stroke="#b4bec4" stroke-width="1.6"');
    for (var i = 0; i < 12; i++) { var a = i * 30 * Math.PI / 180; s += L('M' + x + ' ' + y + ' L' + (x + Math.cos(a) * (r - 4.5)).toFixed(1) + ' ' + (y + Math.sin(a) * (r - 4.5)).toFixed(1), '#8f9aa1', .8); }
    return s + C(x, y, 4.5, '#3b4349') + C(x, y, 2, '#c9d1d6') + C(x, y, r * .45, 'none', ' stroke="#9aa4ab" stroke-width="1.4" opacity=".7"');
  }
  function moto(t, col) {
    var tk = uid(), mt = uid();
    var defs = lg(tk, 0, 0, 0, 1, [[0, shade(col, .45)], [.5, col], [1, shade(col, -.4)]]) + lg(mt, 0, 0, 0, 1, [[0, '#d4dadd'], [1, '#6b767d']]);
    var ry = 74, rr = t === 'adv' ? 21 : 19.5, fx = 152, bx = 46;
    var s = E(100, 96, 84, 4, 'rgba(0,0,0,.28)'), dk = '#1a1f24', fr = '#2a3036';
    if (t === 'scooter') {
      rr = 16; ry = 78;
      s += mWheel(bx + 8, ry, rr) + mWheel(fx - 6, ry, rr) + P('M30 70 Q28 46 52 42 L92 42 Q104 42 108 52 L112 66 L102 74 L70 76 Q56 74 52 66 Z', 'url(#' + tk + ')') +
        P('M112 28 Q124 28 128 40 L136 74 L116 78 L108 56 Z', 'url(#' + tk + ')') + R(48, 36, 52, 8, dk, 4) + P('M96 44 L112 44 L112 52 L96 52Z', shade(col, -.45)) + L('M118 28 L116 16 L132 12', dk, 3.5) + R(126, 8, 14, 6, dk, 3) + E(137, 20, 6, 6, '#fff3c0', ' stroke="#8c969c" stroke-width="1.5"') +
        R(40, 80, 34, 5, '#8a949a', 2.5) + L('M58 70 Q70 80 90 76', shade(col, .6), 1.5, ' opacity=".6"');
    } else if (t === 'cruiser') {
      rr = 20; fx = 158; bx = 44;
      s += mWheel(bx, ry, rr) + mWheel(fx, ry, rr) + P('M22 62 Q24 50 48 50 L66 52 L66 60 Q44 62 22 66Z', 'url(#' + mt + ')') + P('M140 54 Q150 46 166 54 L164 64 L146 62Z', 'url(#' + mt + ')') +
        L('M44 74 L74 74 L96 62 L132 62 L152 74', fr, 4) + L('M138 58 L152 40', '#aab3b9', 4) + L('M148 40 Q140 22 118 24 L108 30', '#bcc5ca', 3.5) + R(98, 56, 36, 20, 'url(#' + mt + ')', 3) + P('M104 56 L108 44 L118 44 L122 56Z', 'url(#' + mt + ')') + P('M112 56 L116 44 L126 44 L128 56Z', '#8d98a0') +
        P('M62 52 Q80 38 112 42 Q124 46 122 56 L72 58Z', 'url(#' + tk + ')') + P('M46 52 Q60 46 76 50 L76 58 Q58 58 46 56Z', dk) + E(158, 40, 6, 6, '#fff3c0', ' stroke="#bcc5ca" stroke-width="2"') + L('M90 76 L28 82', '#c9d1d6', 4) + L('M96 80 L36 86', '#aab3b9', 3);
    } else if (t === 'adv') {
      s += mWheel(bx, ry, rr) + mWheel(fx, ry, rr) + P('M142 40 L162 32 L168 50 L150 54Z', 'url(#' + tk + ')') + P('M138 22 L152 30 L146 44 L134 36Z', 'rgba(150,200,230,.6)', ' stroke="#8c969c"') +
        L('M46 74 L82 62 L120 60 L152 74', fr, 4) + L('M140 54 L152 74', '#aab3b9', 4.5) + P('M70 36 Q100 24 126 36 L120 56 L80 58Z', 'url(#' + tk + ')') + R(84, 52, 38, 20, 'url(#' + mt + ')', 3) + P('M30 50 L74 44 L82 34 L96 34 L96 44 L70 52 L34 58Z', dk) +
        L('M130 34 L124 22 L108 20', dk, 3.5) + R(34, 36, 34, 4, '#9aa4a9', 2) + L('M40 40 L40 56', '#9aa4a9', 2) + L('M92 76 L40 80', '#c9d1d6', 4.5) + E(158, 38, 5, 6, '#fff3c0', ' stroke="#8c969c" stroke-width="1.5"');
    } else if (t === 'sport') {
      rr = 19;
      s += mWheel(bx, ry, rr) + mWheel(fx, ry, rr) + L('M140 50 L152 74', '#aab3b9', 4.5) + P('M26 60 Q34 46 70 44 L96 40 Q118 36 132 44 Q148 52 160 62 L150 64 L132 66 L110 74 L84 76 L52 72 L32 70Z', 'url(#' + tk + ')') +
        P('M122 40 L138 24 L148 38 L132 44Z', 'rgba(150,205,235,.7)', ' stroke="#8c969c" stroke-width="1"') + P('M26 58 Q22 52 34 48 L58 46 L58 56Z', 'url(#' + tk + ')') + R(70, 36, 34, 7, dk, 3.5) + R(82, 56, 30, 18, 'url(#' + mt + ')', 3) + L('M90 66 L36 62', '#aeb7bd', 4) +
        L('M130 38 L120 26 L106 26', dk, 3.5) + E(150, 52, 5, 5, '#fff3c0') + L('M40 60 L120 54', shade(col, .65), 1.6, ' opacity=".6"') + P('M100 64 L146 64 L136 72 L100 72Z', shade(col, -.5));
    } else { // naked
      s += mWheel(bx, ry, rr) + mWheel(fx, ry, rr) + L('M140 50 L152 74', '#aab3b9', 4.5) + L('M46 74 L86 64 L128 50', fr, 4.5) + L('M86 64 L86 44 L128 44', shade(col, -.15), 4) + L('M86 44 L60 40', shade(col, -.15), 4) +
        P('M80 38 Q104 28 130 40 L126 52 L86 50Z', 'url(#' + tk + ')') + P('M28 48 L64 42 L86 38 L86 46 L66 50 L34 56Z', dk) + P('M30 46 Q34 42 50 42 L50 48 L32 52Z', 'url(#' + tk + ')') + R(84, 52, 38, 22, 'url(#' + mt + ')', 3) +
        rep(4, function (i) { return R(86 + i * 9, 56, 5, 14, '#aab3b9'); }) + L('M128 38 L120 24 L106 24', dk, 3.5) + E(150, 44, 6, 6, '#fff3c0', ' stroke="#8c969c" stroke-width="1.5"') + L('M92 76 L36 80', '#c9d1d6', 4.2) + R(26, 70, 10, 6, '#8d98a0', 3);
    }
    return svg(200, 110, defs, s);
  }

  /* ======================= الدراجات (200×120) ======================= */
  function bWheel(x, y, r, tire) {
    var s = C(x, y, r, 'none', ' stroke="#14181c" stroke-width="' + tire + '"') + C(x, y, r - tire / 2, 'none', ' stroke="#c4ccd1" stroke-width="1.4"');
    for (var i = 0; i < 18; i++) { var a = i * 20 * Math.PI / 180; s += L('M' + x + ' ' + y + ' L' + (x + Math.cos(a) * (r - tire / 2)).toFixed(1) + ' ' + (y + Math.sin(a) * (r - tire / 2)).toFixed(1), '#a9b3b9', .55); }
    return s + C(x, y, 3, '#555e64');
  }
  function bike(t, col) {
    var fc = shade(col, -.05), dk = '#20262b', w = t === 'mtb' ? 4.8 : t === 'road' ? 3.4 : 4;
    var tire = t === 'mtb' ? 6.5 : t === 'road' ? 2.8 : 4;
    var s = E(100, 112, 84, 3.5, 'rgba(0,0,0,.25)') + bWheel(48, 82, 29, tire) + bWheel(152, 82, 29, tire);
    if (t === 'city') s += P('M20 66 Q48 50 76 66 L76 70 Q48 56 20 70Z', col, ' opacity=".9"') + P('M126 62 Q152 48 178 62 L178 66 Q152 54 126 66Z', col, ' opacity=".9"');
    s += L('M98 84 L84 46 L132 46 L98 84 M132 46 L152 82 M98 84 L48 82 M84 46 L48 82', fc, w) + L('M132 46 L128 36', fc, w);
    if (t === 'mtb') s += L('M132 46 L152 82', '#aab3b9', 5.4) + R(120, 58, 10, 14, '#5a636a', 3);
    else s += L('M132 46 L152 82', '#aab3b9', 3.2);
    s += L('M84 46 L82 36', '#c9d1d6', 2.6) + R(72, 31, 20, 5, dk, 2.5);
    if (t === 'road') s += L('M128 36 L134 30 Q146 26 146 38 Q146 46 138 46', dk, 3.2);
    else if (t === 'mtb') s += L('M128 36 L120 30 L140 28', dk, 3.6) + R(112, 27, 8, 4, '#c9d1d6', 2) + R(138, 25, 10, 5, dk, 2.5);
    else s += L('M128 36 L126 24 Q134 18 148 22', dk, 3.2) + R(142, 19, 12, 5, dk, 2.5);
    s += C(98, 84, 9, 'none', ' stroke="#9aa4ab" stroke-width="2"') + C(98, 84, 4, '#55606a') + L('M98 84 L108 98', dk, 2.8) + R(104, 97, 12, 4, dk, 2) + L('M98 84 L88 70', dk, 2.8) + R(80, 66, 12, 4, dk, 2) + L('M98 76 L48 80', '#8f9aa1', 1.2) + L('M98 92 L48 84', '#8f9aa1', 1.2);
    if (t === 'city') s += R(150, 8, 30, 18, '#b98a4d', 3) + L('M150 8 Q165 -2 180 8', '#8a6334', 2.4) + rep(4, function (i) { return L('M' + (153 + i * 7) + ' 10 L' + (153 + i * 7) + ' 24', '#8a6334', 1.2); }) + L('M152 26 L148 56', '#8a949a', 2);
    if (t === 'road') s += L('M84 46 L132 46', shade(col, .5), 1.2, ' opacity=".7"');
    return svg(200, 120, '', s);
  }

  root.KoraCMArt = { house: house, car: car, moto: moto, bike: bike };
})(typeof window !== 'undefined' ? window : globalThis);
