/* Kora Challenge — مكتبة الأيقونات: بتحوّل أي إيموجي في الموقع لأيقونة SVG
   - KIcon("trophy") بترجّع كود SVG جاهز
   - أي إيموجي معروف بيظهر في الصفحة (حتى لو اتكتب من الجافا سكربت) بيتحوّل تلقائي */
(() => {
  'use strict';

  const ICONS = {"ball": "<circle cx=\"12\" cy=\"12\" r=\"9\" /><path d=\"M12 7.2l4 2.9-1.5 4.7h-5L8 10.1z\"/><path d=\"M12 7.2V3\"/><path d=\"M16 10.1l4-1.3\"/><path d=\"M14.5 14.8l2.4 3.6\"/><path d=\"M9.5 14.8l-2.4 3.6\"/><path d=\"M8 10.1L4 8.8\"/>", "gear": "<path d=\"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z\"/><circle cx=\"12\" cy=\"12\" r=\"3\" />", "globe": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M2 12h20\"/><path d=\"M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z\"/>", "palette": "<path d=\"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z\"/><circle cx=\"13.5\" cy=\"6.5\" r=\"0.8\" fill=\"currentColor\"/><circle cx=\"17.5\" cy=\"10.5\" r=\"0.8\" fill=\"currentColor\"/><circle cx=\"6.5\" cy=\"12.5\" r=\"0.8\" fill=\"currentColor\"/><circle cx=\"8.5\" cy=\"7.5\" r=\"0.8\" fill=\"currentColor\"/>", "moon": "<path d=\"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z\"/>", "sun": "<circle cx=\"12\" cy=\"12\" r=\"4\" /><path d=\"M12 2v2\"/><path d=\"M12 20v2\"/><path d=\"M4.93 4.93l1.41 1.41\"/><path d=\"M17.66 17.66l1.41 1.41\"/><path d=\"M2 12h2\"/><path d=\"M20 12h2\"/><path d=\"M6.34 17.66l-1.41 1.41\"/><path d=\"M19.07 4.93l-1.41 1.41\"/>", "user": "<path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\" />", "users": "<path d=\"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2\"/><path d=\"M23 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/><circle cx=\"9\" cy=\"7\" r=\"4\" />", "logout": "<path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/><path d=\"M16 17l5-5-5-5\"/><path d=\"M21 12H9\"/>", "trophy": "<path d=\"M6 9H4.5a2.5 2.5 0 0 1 0-5H6\"/><path d=\"M18 9h1.5a2.5 2.5 0 0 0 0-5H18\"/><path d=\"M4 22h16\"/><path d=\"M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22\"/><path d=\"M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22\"/><path d=\"M18 2H6v7a6 6 0 0 0 12 0V2z\"/>", "crown": "<path d=\"M3 8l4 4 5-7 5 7 4-4-2 12H5z\"/>", "swords": "<path d=\"M14.5 17.5L3 6V3h3l11.5 11.5\"/><path d=\"M13 19l6-6\"/><path d=\"M16 16l4 4\"/><path d=\"M19 21l2-2\"/><path d=\"M14.5 6.5L18 3h3v3l-3.5 3.5\"/><path d=\"M5 14l4 4\"/><path d=\"M7 17l-3 3\"/><path d=\"M3 19l2 2\"/>", "shield": "<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/>", "shield-check": "<path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/><path d=\"M9 12l2 2 4-4\"/>", "check": "<path d=\"M20 6L9 17l-5-5\"/>", "check-circle": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M8 12.5l3 3 5-6\"/>", "x": "<path d=\"M18 6L6 18\"/><path d=\"M6 6l12 12\"/>", "x-circle": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M15 9l-6 6\"/><path d=\"M9 9l6 6\"/>", "flame": "<path d=\"M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z\"/>", "bulb": "<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\"/><path d=\"M9 18h6\"/><path d=\"M10 22h4\"/>", "eye-off": "<path d=\"M9.88 9.88a3 3 0 1 0 4.24 4.24\"/><path d=\"M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68\"/><path d=\"M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61\"/><path d=\"M2 2l20 20\"/>", "bolt": "<path d=\"M13 2L3 14h9l-1 8 10-12h-9l1-8z\"/>", "skull": "<path d=\"M9 12h.01\"/><path d=\"M15 12h.01\"/><path d=\"M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5\"/><path d=\"M8 20v2h8v-2\"/><path d=\"M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20\"/>", "dot-green": "<circle cx=\"12\" cy=\"12\" r=\"8\" fill=\"#24e982\" stroke=\"none\"/>", "dot-yellow": "<circle cx=\"12\" cy=\"12\" r=\"8\" fill=\"#f6c445\" stroke=\"none\"/>", "dot-orange": "<circle cx=\"12\" cy=\"12\" r=\"8\" fill=\"#ff8a3d\" stroke=\"none\"/>", "lock": "<rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>", "heart": "<path d=\"M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z\"/>", "bot": "<rect x=\"4\" y=\"8\" width=\"16\" height=\"12\" rx=\"3\"/><path d=\"M12 8V4\"/><path d=\"M2 14h2\"/><path d=\"M20 14h2\"/><path d=\"M9 14h.01\"/><path d=\"M15 14h.01\"/><path d=\"M9.5 17.5h5\"/><circle cx=\"12\" cy=\"3\" r=\"1\" />", "gamepad": "<rect x=\"2\" y=\"6\" width=\"20\" height=\"12\" rx=\"5\"/><path d=\"M6 12h4\"/><path d=\"M8 10v4\"/><path d=\"M15 13h.01\"/><path d=\"M18 11h.01\"/>", "skip": "<path d=\"M5 4l10 8-10 8z\"/><path d=\"M19 5v14\"/>", "flag": "<path d=\"M4 22V4\"/><path d=\"M4 4h14l-2.5 4.5L18 13H4\"/>", "pause": "<path d=\"M7 4h3v16H7z\"/><path d=\"M14 4h3v16h-3z\"/>", "target": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><circle cx=\"12\" cy=\"12\" r=\"6\" /><circle cx=\"12\" cy=\"12\" r=\"2\" />", "hand": "<path d=\"M18 11V6a2 2 0 0 0-4 0\"/><path d=\"M14 10V4a2 2 0 0 0-4 0v2\"/><path d=\"M10 10.5V6a2 2 0 0 0-4 0v8\"/><path d=\"M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15\"/>", "wind": "<path d=\"M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2\"/><path d=\"M9.6 4.6A2 2 0 1 1 11 8H2\"/><path d=\"M12.6 19.4A2 2 0 1 0 14 16H2\"/>", "timer": "<circle cx=\"12\" cy=\"13\" r=\"8\" /><path d=\"M12 9v4l2 2\"/><path d=\"M9 2h6\"/>", "hourglass": "<path d=\"M5 22h14\"/><path d=\"M5 2h14\"/><path d=\"M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22\"/><path d=\"M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2\"/>", "warning": "<path d=\"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>", "sad": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M16 16s-1.5-2-4-2-4 2-4 2\"/><path d=\"M9 9h.01\"/><path d=\"M15 9h.01\"/>", "arrow-left": "<path d=\"M19 12H5\"/><path d=\"M12 19l-7-7 7-7\"/>", "arrow-right": "<path d=\"M5 12h14\"/><path d=\"M12 5l7 7-7 7\"/>"};
  const EMO = {"\u26bd": "ball", "\u2699": "gear", "\ud83c\udf10": "globe", "\ud83c\udf0d": "globe", "\ud83c\udfa8": "palette", "\ud83c\udf19": "moon", "\u2600": "sun", "\ud83d\udc64": "user", "\ud83d\udc65": "users", "\ud83d\udeaa": "logout", "\ud83c\udfc6": "trophy", "\ud83d\udc51": "crown", "\u2694": "swords", "\ud83d\udee1": "shield", "\ud83d\udd30": "shield-check", "\u2705": "check-circle", "\u2714": "check", "\u274c": "x-circle", "\u2716": "x", "\u2715": "x", "\ud83d\udd25": "flame", "\ud83d\udca1": "bulb", "\ud83d\udd75": "eye-off", "\ud83d\udcaa": "bolt", "\ud83d\udc80": "skull", "\ud83d\udfe2": "dot-green", "\ud83d\udfe1": "dot-yellow", "\ud83d\udfe0": "dot-orange", "\ud83d\udd12": "lock", "\u2764": "heart", "\ud83e\udd16": "bot", "\ud83c\udfae": "gamepad", "\u23ed": "skip", "\ud83c\udfc1": "flag", "\u23f8": "pause", "\ud83c\udfaf": "target", "\ud83e\udde4": "hand", "\ud83d\udca8": "wind", "\u23f1": "timer", "\u23f3": "hourglass", "\u26a0": "warning", "\ud83d\ude15": "sad", "\ud83d\ude05": "sad", "\u2190": "arrow-left", "\u2192": "arrow-right"};

  const VS = '\uFE0F';
  const keys = Object.keys(EMO);
  const emojiRe = new RegExp('(?:' + keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')' + VS + '?', 'g');
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'OPTION', 'TITLE', 'INPUT', 'SELECT', 'NOSCRIPT', 'SVG']);

  const NS = 'http://www.w3.org/2000/svg';

  function KIcon(name, extraClass) {
    if (!ICONS[name]) return '';
    return '<svg class="kico' + (extraClass ? ' ' + extraClass : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + '</svg>';
  }

  function node(name) {
    const holder = document.createElement('span');
    holder.innerHTML = KIcon(name);
    return holder.firstChild;
  }

  // شيل الإيموجي من نص (بيستعمله نظام الترجمة)
  function strip(text) {
    return String(text).replace(emojiRe, '').replace(/\s+/g, ' ').trim();
  }

  // رجّع الإيموجي اللي كان في أول/آخر النص الأصلي للنص المترجم
  function keepEmoji(original, translated) {
    const t = String(original).trim();
    const lead = (t.match(new RegExp('^(?:(?:' + emojiRe.source + ')\\s*)+')) || [''])[0];
    const trail = (t.match(new RegExp('(?:\\s*(?:' + emojiRe.source + '))+$')) || [''])[0];
    return lead + translated + trail;
  }

  function convertText(textNode) {
    const text = textNode.nodeValue;
    if (!text) return;
    emojiRe.lastIndex = 0;
    if (!emojiRe.test(text)) return;
    emojiRe.lastIndex = 0;

    const frag = document.createDocumentFragment();
    let last = 0, m;
    while ((m = emojiRe.exec(text))) {
      if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      const name = EMO[m[0].replace(VS, '')];
      const icon = name && node(name);
      if (icon) frag.appendChild(icon);
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
    textNode.parentNode.replaceChild(frag, textNode);
  }

  function convert(root) {
    root = root || document.body;
    if (!root) return;
    if (root.nodeType === 3) { if (root.parentNode && !SKIP.has(root.parentNode.nodeName.toUpperCase())) convertText(root); return; }
    if (root.nodeType !== 1 || SKIP.has(root.nodeName.toUpperCase())) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentNode;
        if (!p || SKIP.has(p.nodeName.toUpperCase()) || (p.closest && p.closest('[data-no-icons]'))) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const list = [];
    while (walker.nextNode()) list.push(walker.currentNode);
    list.forEach(convertText);
  }

  KIcon.icons = ICONS;
  KIcon.node = node;
  KIcon.strip = strip;
  KIcon.keepEmoji = keepEmoji;
  KIcon.convert = convert;
  window.KIcon = KIcon;

  // ستايل الأيقونات: بتمشي مع حجم الخط واللون
  const style = document.createElement('style');
  style.textContent = '.kico{width:1.15em;height:1.15em;display:inline-block;vertical-align:-.2em;flex:none;overflow:visible}';
  (document.head || document.documentElement).appendChild(style);

  let queued = false;
  const observer = new MutationObserver(mutations => {
    if (queued) return;
    queued = true;
    Promise.resolve().then(() => {
      queued = false;
      mutations.forEach(mu => {
        if (mu.type === 'characterData') convert(mu.target);
        mu.addedNodes.forEach(n => convert(n));
      });
    });
  });

  function start() {
    convert(document.body);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
