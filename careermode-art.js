/* Kora Challenge — رسومات الممتلكات (SVG) في كارير مود */
(function (root) {
  'use strict';
  function r(x, y, w, h, f, rx) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (rx || 0) + '" fill="' + f + '"/>'; }
  function p(d, f, extra) { return '<path d="' + d + '" fill="' + f + '"' + (extra || '') + '/>'; }
  function c(cx, cy, rr, f, extra) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + rr + '" fill="' + f + '"' + (extra || '') + '/>'; }
  function svg(inner) { return '<svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + inner + '</svg>'; }
  var GLASS = '#9fd3f2', DARK = '#23303a', GROUND = 'rgba(120,140,130,.35)';
  function win(x, y, w, h) { return r(x, y, w || 8, h || 9, GLASS, 1) + r(x + (w || 8) / 2 - .4, y, .8, h || 9, 'rgba(0,0,0,.25)'); }
  function tree(x, y, s) { return r(x - 1.5, y, 3, 10 * s, '#6b4a2f') + c(x, y - 2, 8 * s, '#3f9c58') + c(x - 5 * s, y + 2, 6 * s, '#35874c'); }

  function house(k, col) {
    var g = r(0, 70, 120, 10, GROUND), roof = 'rgba(0,0,0,.35)', s = '';
    if (k === 0) { // استوديو صغير
      s = r(36, 38, 48, 32, col) + r(32, 33, 56, 6, '#6e7a80') + win(42, 46) + r(62, 48, 12, 22, '#7a5230') + r(30, 70, 60, 2, '#555');
    } else if (k === 1) { // شقة عائلية (عمارة)
      s = r(30, 18, 60, 52, col) + r(27, 14, 66, 6, '#6e7a80');
      for (var i = 0; i < 3; i++) { s += win(37 + i * 18, 26) + win(37 + i * 18, 42); }
      s += r(54, 56, 12, 14, '#7a5230') + r(33, 50, 20, 2, '#444');
    } else if (k === 2) { // تاون هاوس بسقف مائل
      s = r(34, 34, 52, 36, col) + p('M28 36 L60 12 L92 36 Z', '#a34a3a') + r(74, 12, 7, 14, '#7b4a3a') + win(40, 42) + win(66, 42) + r(55, 52, 11, 18, '#5a3a24') + r(40, 56, 10, 2, '#fff');
    } else if (k === 3) { // بيت عائلي بجراج وشجرة
      s = tree(14, 52, 1) + r(30, 36, 50, 34, col) + p('M24 38 L55 14 L86 38 Z', '#7a8791') + r(80, 46, 22, 24, '#d4d9dc') + r(83, 52, 16, 18, '#9aa4a9') + win(36, 44) + win(58, 44) + r(47, 54, 10, 16, '#6a4a2e');
    } else if (k === 4) { // فيلا مودرن مكعبات
      s = r(18, 38, 52, 32, col) + r(46, 18, 56, 24, '#cfd6da') + r(14, 35, 60, 4, '#3a444b') + r(42, 15, 64, 4, '#3a444b') +
        r(22, 44, 22, 14, GLASS) + r(50, 24, 46, 12, GLASS) + r(78, 46, 24, 24, '#d9dfe2') + r(82, 52, 16, 18, GLASS) + r(0, 66, 14, 4, '#53b8e8') + tree(110, 54, .8);
    } else if (k === 5) { // قصر بمسبح
      s = r(14, 34, 92, 36, col) + p('M10 36 L60 10 L110 36 Z', '#8a5a3a') + r(46, 36, 28, 34, '#f5ecd6');
      for (var j = 0; j < 4; j++) s += r(48 + j * 7.5, 38, 3, 32, '#fff');
      s += r(52, 54, 16, 16, '#5a3a24') + win(20, 42) + win(30, 42) + win(84, 42) + win(94, 42) + r(0, 71, 120, 9, '#4db6e6') + r(0, 71, 120, 2, 'rgba(255,255,255,.5)');
    } else { // قصر ملكي ضخم
      s = r(8, 38, 104, 32, col) + r(44, 20, 32, 50, col) + p('M40 22 L60 4 L80 22 Z', '#b88a2e') + c(60, 14, 5, '#e6c15a') +
        r(10, 24, 18, 46, col) + p('M8 26 L19 8 L30 26 Z', '#b88a2e') + r(92, 24, 18, 46, col) + p('M90 26 L101 8 L112 26 Z', '#b88a2e') +
        r(54, 52, 12, 18, '#5a3a24') + win(48, 28) + win(64, 28) + win(14, 34) + win(96, 34) + win(14, 50) + win(96, 50) + win(30, 46) + win(80, 46) + r(60, 0, 1.2, 8, '#444') + p('M61 0 L72 3 L61 6Z', '#e8453c');
    }
    return svg(g + s);
  }

  function wheel(x, y, rr) { return c(x, y, rr, '#14181c') + c(x, y, rr * .5, '#cfd5d9') + c(x, y, rr * .18, '#14181c'); }
  function car(t, col) {
    var body, cab, glass = GLASS, w1 = 30, w2 = 92, wy = 56, wr = 9, extra = '';
    if (t === 'hatch') { body = p('M8 52 L8 40 Q8 34 16 33 L30 31 L40 18 Q42 16 46 16 L78 16 Q82 16 85 20 L96 33 Q108 35 110 42 L110 52 Z', col); cab = p('M44 20 L40 31 L66 31 L66 20 Z', glass) + p('M69 20 L69 31 L90 31 L82 21 Z', glass); }
    else if (t === 'sedan') { body = p('M6 52 L6 41 Q6 36 14 35 L34 32 L46 18 Q48 16 52 16 L76 16 Q80 16 84 20 L94 32 L108 36 Q114 38 114 44 L114 52 Z', col); cab = p('M50 20 L42 32 L66 32 L66 20 Z', glass) + p('M69 20 L69 32 L90 32 L81 21 Z', glass); }
    else if (t === 'suv') { body = p('M6 54 L6 36 Q6 30 12 29 L26 28 L34 14 Q36 12 40 12 L88 12 Q92 12 94 15 L100 28 L110 30 Q114 32 114 38 L114 54 Z', col); cab = p('M38 16 L32 28 L62 28 L62 16 Z', glass) + p('M66 16 L66 28 L96 28 L90 16 Z', glass); wy = 56; wr = 10; extra = r(40, 12, 48, 2, 'rgba(0,0,0,.35)'); }
    else if (t === 'coupe') { body = p('M6 52 L6 44 Q6 38 14 37 L36 35 L52 21 Q54 19 58 19 L78 19 Q82 19 86 23 L98 35 L108 38 Q114 40 114 46 L114 52 Z', col); cab = p('M58 23 L47 35 L70 35 L70 23 Z', glass) + p('M73 23 L73 35 L92 35 L82 24 Z', glass); }
    else if (t === 'pickup') { body = p('M6 54 L6 40 Q6 35 12 34 L30 33 L40 18 L66 18 L70 33 L70 36 L112 36 L114 38 L114 54 Z', col) + r(72, 34, 42, 4, 'rgba(0,0,0,.35)'); cab = p('M43 21 L35 33 L62 33 L62 21 Z', glass) + p('M65 21 L65 33 L69 33 Z', glass); wr = 10; }
    else { body = p('M4 52 L4 46 Q4 42 12 41 L40 38 L58 26 Q60 24 64 24 L82 25 Q86 26 90 30 L100 38 L112 42 Q116 44 116 48 L116 52 Z', col) + r(10, 47, 100, 2, 'rgba(0,0,0,.3)'); cab = p('M62 28 L50 38 L78 38 L78 28 Z', glass) + p('M80 28 L84 38 L96 38 L88 31 Z', glass); wr = 9; wy = 54; extra = p('M2 44 L10 43 L10 46 L2 46Z', '#e8e8e8'); }
    return svg(r(0, 66, 120, 10, GROUND) + body + cab + extra + wheel(w1, wy + 2, wr) + wheel(w2, wy + 2, wr) + r(104, 40, 8, 4, '#ffe9a0', 1));
  }

  function moto(t, col) {
    var s = c(28, 56, 13, 'none', ' stroke="#14181c" stroke-width="5"') + c(94, 56, 13, 'none', ' stroke="#14181c" stroke-width="5"') + c(28, 56, 4, '#9aa4a9') + c(94, 56, 4, '#9aa4a9');
    var line = ' stroke="' + DARK + '" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    if (t === 'scooter') { s += p('M20 54 Q22 34 40 34 L74 34 Q86 34 90 44 L94 54 L80 54 Q70 46 52 52 L36 56 Z', col) + p('M80 18 L84 18 L90 44 L86 44 Z', DARK) + r(76, 14, 14, 4, DARK, 2) + r(34, 28, 30, 6, '#2b2f33', 3) + p('M20 40 L36 40 L36 56 L22 56Z', col); }
    else if (t === 'cruiser') { s += '<path d="M28 56 L50 56 L62 44 L88 44 L94 56"' + line + '/>' + p('M46 38 Q60 28 76 38 L72 46 L50 46 Z', col) + r(26, 36, 26, 7, '#2b2f33', 3) + '<path d="M88 44 L84 24 L100 20"' + line + '/>' + r(28, 52, 20, 3, '#b8c0c6'); }
    else if (t === 'adv') { s += '<path d="M28 56 L50 54 L70 46 L90 48 L94 56"' + line + '/>' + p('M40 30 Q60 22 78 34 L74 48 L48 48 Z', col) + r(30, 28, 34, 6, '#2b2f33', 3) + p('M84 20 L98 16 L98 30 L88 34 Z', col) + '<path d="M90 48 L86 26"' + line + '/>' + r(24, 22, 14, 3, '#9aa4a9'); }
    else { s += '<path d="M28 56 L50 52 L68 46 L90 50 L94 56"' + line + '/>' + p('M44 34 Q60 26 76 36 L72 48 L50 48 Z', col) + r(30, 34, 22, 6, '#2b2f33', 3) + '<path d="M88 50 L84 28 L96 24"' + line + '/>' + (t === 'sport' ? p('M80 22 L100 28 L92 40 L84 38Z', col) : r(94, 22, 6, 6, '#ffe9a0', 3)); }
    return svg(r(0, 70, 120, 6, GROUND) + s);
  }

  function bike(t, col) {
    var rr = t === 'mtb' ? 17 : 16, tire = t === 'mtb' ? 6 : 3.5;
    var s = c(28, 54, rr, 'none', ' stroke="#14181c" stroke-width="' + tire + '"') + c(94, 54, rr, 'none', ' stroke="#14181c" stroke-width="' + tire + '"') + c(28, 54, 2, '#9aa4a9') + c(94, 54, 2, '#9aa4a9');
    var fr = ' stroke="' + col + '" stroke-width="' + (t === 'mtb' ? 4.5 : 3.5) + '" stroke-linecap="round" stroke-linejoin="round" fill="none"';
    s += '<path d="M28 54 L52 28 L82 28 L94 54 M52 28 L62 54 L28 54 M62 54 L82 28"' + fr + '/>';
    s += '<path d="M80 28 L76 20 L88 20" stroke="' + DARK + '" stroke-width="3.5" stroke-linecap="round" fill="none"/>' + r(46, 22, 16, 4, '#2b2f33', 2) + c(62, 54, 5, 'none', ' stroke="#555" stroke-width="2"');
    if (t === 'road') s += '<path d="M76 20 Q88 18 88 26" stroke="' + DARK + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
    if (t === 'city') s += r(84, 14, 16, 10, '#b98a4d', 2) + '<path d="M84 14 Q92 6 100 14" stroke="#8a6334" stroke-width="2" fill="none"/>';
    return svg(r(0, 72, 120, 5, GROUND) + s);
  }

  root.KoraCMArt = { house: house, car: car, moto: moto, bike: bike };
})(typeof window !== 'undefined' ? window : globalThis);
