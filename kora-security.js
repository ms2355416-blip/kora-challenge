/* Kora Challenge — أدوات الحماية المشتركة
   - تنضيف أي نص جاي من المستخدم (حروف تحكم، حروف عكس الاتجاه الخفية، مسافات زيادة)
   - تحديد معدل الإرسال (يفضل بعد إعادة تحميل الصفحة)
   - التأكد إن ملفات الصوت/الصور الجاية من الداتابيز آمنة
   ملحوظة مهمة: الحماية الحقيقية لازم تكون كمان في قواعد Firebase (database.rules.json) لأن أي كود في المتصفح ممكن يتعدّل. */
(function (root) {
  'use strict';
  var BAD = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF\uFFF9-\uFFFB]/g;
  var TAGS = /[<>`]/g;

  function clean(str, max) {
    var s = String(str == null ? '' : str);
    try { s = s.normalize('NFC'); } catch (e) { /* ignore */ }
    s = s.replace(BAD, ' ').replace(/\s+/g, ' ').trim();
    return max ? s.slice(0, max) : s;
  }
  /* اسم: من غير رموز HTML */
  function name(str, max) { return clean(String(str == null ? '' : str).replace(TAGS, ''), max || 30); }

  function store() { try { return root.localStorage; } catch (e) { return null; } }
  /* يسمح مرة كل ms. بيرجّع true لو مسموح (ويسجّل الوقت) */
  function throttle(key, ms) {
    var ls = store(), k = 'ks:t:' + key, now = Date.now();
    var last = 0; try { last = ls ? Number(ls.getItem(k)) || 0 : 0; } catch (e) { /* ignore */ }
    if (now - last < ms) return false;
    try { if (ls) ls.setItem(k, String(now)); } catch (e) { /* ignore */ }
    return true;
  }
  /* نافذة منزلقة: max طلبات في windowMs. بترجّع الوقت المتبقي بالمللي ثانية لو اتعدّى الحد، أو 0 لو مسموح */
  function limit(key, max, windowMs) {
    var ls = store(), k = 'ks:w:' + key, now = Date.now(), arr = [];
    try { arr = ls ? JSON.parse(ls.getItem(k) || '[]') : []; } catch (e) { arr = []; }
    arr = (Array.isArray(arr) ? arr : []).filter(function (t) { return typeof t === 'number' && now - t < windowMs; });
    if (arr.length >= max) return Math.max(1, windowMs - (now - arr[0]));
    arr.push(now);
    try { if (ls) ls.setItem(k, JSON.stringify(arr.slice(-50))); } catch (e) { /* ignore */ }
    return 0;
  }
  function isAudioDataUrl(s, maxLen) { return typeof s === 'string' && s.length <= (maxLen || 160000) && /^data:audio\/(webm|ogg|mp4|mpeg|wav|x-m4a|aac)(;codecs=[a-z0-9.,]+)?;base64,[A-Za-z0-9+/=]+$/i.test(s); }
  function isImageDataUrl(s, maxLen) { return typeof s === 'string' && s.length <= (maxLen || 400000) && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(s); }
  /* كود غرفة: 5 حروف/أرقام كبيرة */
  function roomCode(s) { var c = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return c.length === 5 ? c : ''; }

  root.KoraSec = Object.freeze({ clean: clean, name: name, throttle: throttle, limit: limit, isAudioDataUrl: isAudioDataUrl, isImageDataUrl: isImageDataUrl, roomCode: roomCode });
})(typeof window !== 'undefined' ? window : globalThis);
