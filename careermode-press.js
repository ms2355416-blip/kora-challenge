/* Kora Challenge — "إجابة أخرى" في المؤتمر الصحفي.
   محلل كلام عربي (مصري) بيفهم: مين المقصود (مدرب/حكم/جمهور/فريق/إدارة/إعلام/خصم)،
   والموقف (اعتذار، مدح، لوم، غرور، تهديد بالرحيل، ولاء، هزار، شتيمة)، وبيطلّع رد فعل مناسب.
   ده نظام قواعد شغال على الجهاز من غير إنترنت، مش نموذج ذكاء اصطناعي خارجي. */
(function (root) {
  'use strict';
  function norm(t) {
    return String(t || '').toLowerCase()
      .replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
      .replace(/(.)\1{2,}/g, '$1$1').replace(/[^a-z0-9\u0600-\u06FF\u{1F300}-\u{1FAFF}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }
  var PRE = ['وال', 'بال', 'كال', 'فال', 'لل', 'ال', 'و', 'ب', 'ل', 'ف'];
  function forms(tok) {
    var f = [tok];
    PRE.forEach(function (p) { if (tok.indexOf(p) === 0 && tok.length - p.length >= 2) f.push(tok.slice(p.length)); });
    return f;
  }
  function make(text) {
    var n = norm(text), toks = n.split(' ').filter(Boolean), fs = toks.map(forms), padded = ' ' + n + ' ';
    return {
      n: n, toks: toks,
      word: function (list) { var c = 0; fs.forEach(function (f) { if (f.some(function (x) { return list.indexOf(x) > -1; })) c++; }); return c; },
      stem: function (list) { var c = 0; fs.forEach(function (f) { if (f.some(function (x) { return list.some(function (s) { return x.indexOf(s) === 0; }); })) c++; }); return c; },
      has: function (list) { return list.some(function (p) { return padded.indexOf(' ' + p + ' ') > -1 || (p.indexOf(' ') > -1 && n.indexOf(p) > -1); }); }
    };
  }

  /* شتايم صريحة (كلمات كاملة) + جذور */
  var BAD_W = ['كس', 'كسم', 'كسمك', 'كسك', 'شرموط', 'شرموطه', 'خول', 'متناك', 'منيوك', 'عرص', 'معرص', 'طيز', 'زب', 'ايري', 'امك', 'fuck', 'fck', 'shit', 'bitch', 'dick', 'asshole', 'wtf'];
  var BAD_S = ['شرمو', 'متنا', 'منيو', 'معرص', 'يلعن', 'لعن', 'fuck'];
  var BAD_P = ['ابن الكلب', 'ابن الوسخه', 'ابن ال', 'تف علي', 'روح في داهيه'];
  var MILD_S = ['حقير', 'واطي', 'زبال', 'قرف', 'تافه', 'غبي', 'حمار', 'كلب', 'حيوان', 'وسخ', 'قذر', 'فاسد', 'حرامي', 'نصاب', 'زفت', 'فاشل', 'جاهل', 'عبيط', 'اهبل', 'مغفل', 'خرا'];

  var T = {
    coach: ['مدرب', 'كابتن', 'تشكيل', 'خطه', 'خطط', 'تكتيك', 'تدريب'],
    ref: ['حكم', 'تحكيم', 'اتحاد', 'var'],
    fans: ['جمهور', 'جماهير', 'مشجع', 'فانز', 'روابط', 'اولتراس'],
    team: ['فريق', 'زمايل', 'زملاء', 'لاعيب', 'لاعبين', 'شباب', 'تيم'],
    mgmt: ['اداره', 'رئيس', 'نادي', 'مجلس', 'مسؤول'],
    media: ['صحاف', 'اعلام', 'صحفي', 'اعلامي', 'صحفيين'],
    opp: ['خصم', 'منافس', 'ضدنا', 'الفريق التاني', 'الفريق الاخر']
  };
  var L = {
    apology: ['اعتذر', 'اسف', 'معذره', 'سامح', 'اعذر', 'عذرا'],
    humble: ['هشتغل', 'هجتهد', 'هتحسن', 'هحسن', 'هتعلم', 'اتعلم', 'اجتهد', 'اشتغل', 'وعد', 'هعوض', 'اعوض', 'تقصير', 'مسووليتي', 'مسؤوليتي', 'غلطتي', 'غلطت', 'هرجع'],
    praise: ['شكر', 'احترم', 'فخور', 'فخر', 'ممتاز', 'رائع', 'كبير', 'عظيم', 'بطل', 'يستاهل', 'محترم', 'تعب', 'مجهود', 'جميل', 'احسن', 'سعيد', 'سعاده', 'حب', 'بحب', 'ممنون', 'تمام'],
    blame: ['ظلم', 'ظلمني', 'غلط', 'مش ذنبي', 'السبب', 'لوم', 'موامره', 'مؤامره', 'متعمد', 'ضدي', 'مظلوم', 'بيحاربوني', 'بيحاربني', 'ماليش ذنب', 'مش بيلعبوني', 'مش بيدوني'],
    accuse: ['فاسد', 'مرتشي', 'رشوه', 'مشتري', 'متعمد', 'مؤامره', 'موامره', 'ملعوب', 'مظبوطه', 'مفبركه'],
    arrogant: ['انا الافضل', 'انا الاحسن', 'انا اكبر', 'انا نجم', 'مفيش زيي', 'محدش زيي', 'لولايا', 'لولا انا', 'اكبر من الفريق', 'اكبر من النادي', 'مش محتاج حد', 'انا اللي بكسبهم', 'الفريق محتاجني', 'انا افضل لاعب'],
    leave: ['همشي', 'هسيب', 'عايز امشي', 'عاوز امشي', 'اسيب', 'ارحل', 'هرحل', 'مغادر', 'هنتقل', 'انتقال', 'اغادر', 'مش هكمل', 'مش هجدد', 'رحيل', 'ريال', 'برشلونه', 'بايرن', 'عرض'],
    loyal: ['هفضل', 'هكمل', 'مخلص', 'ولاء', 'ولائي', 'انتمي', 'بيتي', 'ناديي', 'عيلتي', 'اسرتي', 'هستمر', 'هبقي', 'هجدد', 'اكمل مسيرتي'],
    humor: ['ههه', '😂', '🤣', 'نكته', 'هزار', 'ضحك', 'مزحه', 'لول', 'lol'],
    nocomment: ['مفيش تعليق', 'لا تعليق', 'مش هعلق', 'بدون تعليق', 'مش هتكلم', 'مفيش كلام', 'no comment'],
    confident: ['هنكسر', 'هنفوز', 'هنهزم', 'هنسحق', 'جاهزين', 'هنكسب', 'هنوصل', 'واثق']
  };
  function pickOne(arr, rng) { return arr[Math.floor((rng || Math.random)() * arr.length)]; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function analyze(text, o) {
    o = o || {};
    var ctx = o.ctx || '', rng = o.rng || Math.random, coach = o.coach || 'المدرب', club = o.club || 'النادي', salary = o.salary || 0;
    var a = make(text), bad = ctx === 'bad' || ctx === 'derbyDown' || ctx === 'red', good = ctx === 'good' || ctx === 'derbyUp';
    var r = { fame: 0, favor: 0, fine: 0, susp: 0, lines: [], tone: 'neutral', tags: [] };
    function say(who, t, k) { r.lines.push({ who: who, x: t, k: k || 'neutral' }); }

    var prof = a.word(BAD_W) + a.stem(BAD_S) + (a.has(BAD_P) ? 1 : 0);
    var mild = a.stem(MILD_S);
    var tg = {};
    Object.keys(T).forEach(function (k) { tg[k] = a.stem(T[k]) > 0 || a.has(T[k]); });
    var anyTarget = Object.keys(tg).some(function (k) { return tg[k]; });
    var pos = a.stem(L.praise), hum = a.stem(L.humble), apo = a.stem(L.apology);
    var blame = a.stem(L.blame) + (a.has(L.blame) ? 1 : 0), accuse = a.stem(L.accuse);
    var arrog = a.has(L.arrogant), leave = a.has(L.leave) || a.stem(['همشي', 'هسيب', 'ارحل', 'هرحل']) > 0;
    var loyal = a.has(L.loyal) || a.stem(['هفضل', 'هكمل', 'مخلص', 'ولاء']) > 0;
    var humor = a.has(L.humor) || a.toks.some(function (t) { return /^ه{2,}$/.test(t); }), nocom = a.has(L.nocomment), conf = a.has(L.confident);

    if (a.n.length < 2 || (a.toks.length === 0)) { say('الصحافة', 'مفيش كلام اتقال، والمؤتمر عدّى بهدوء.'); return r; }

    /* 1) شتايم */
    if (prof > 0) {
      var lvl = Math.min(3, prof);
      r.fame -= 4 + lvl; r.favor -= 0.35 + 0.1 * (lvl - 1); r.tone = 'bad'; r.tags.push('profanity');
      r.fine = Math.round(salary * 0.04 * (1 + (lvl - 1) * 0.5));
      say('الصحافة', 'ألفاظك اتنشرت في كل المواقع، والموضوع بقى تريند سلبي.', 'down');
      if (tg.fans) { r.fame -= 3; say('الجمهور', 'جماهير ' + club + ' اتصدمت من الإهانة، وفي حملة مطالبة باعتذار علني.', 'down'); }
      else say('الجمهور', 'ناس كتير شايفة إن الألفاظ دي متليقش بلاعب في حجمك.', 'down');
      if (tg.coach) { r.favor -= 0.4; say(coach, 'سمع اللي قلته عنه قدام الإعلام، وقرر يستبعدك من حساباته فترة.', 'down'); }
      else say(coach, 'غضبان من تصرفك وهيحاسبك قدام الفريق.', 'down');
      if (tg.ref) { r.susp += 1; r.fine = Math.round(r.fine * 1.5); say('الاتحاد', 'فتح تحقيق في إهانة الحكام وقرر إيقافك مباراة واحدة وغرامة.', 'down'); }
      if (tg.mgmt) { r.fine = Math.round(r.fine * 1.3); say('الإدارة', 'اجتمعت بشكل طارئ وقررت توقيع عقوبة مالية عليك.', 'down'); }
      else say('الإدارة', 'وقّعت عليك غرامة مالية بسبب الألفاظ.', 'down');
      if (tg.opp) say('الخصم', 'ردّوا ببيان رسمي ضدك، والتوتر زاد قبل المواجهة الجاية.', 'down');
      if (!anyTarget) say('الصحافة', 'مش واضح كنت بتشتم مين، لكن الغضب باين عليك.', 'down');
    }
    /* 2) إهانة أخف */
    else if (mild > 0) {
      r.fame -= 2; r.favor -= 0.12; r.tone = 'bad'; r.tags.push('insult');
      if (tg.coach) { r.favor -= 0.18; say(coach, 'متضايق من وصفك له قدام الصحافة.', 'down'); }
      if (tg.fans) { r.fame -= 1.5; say('الجمهور', 'الجماهير زعلانة من كلامك عنها.', 'down'); }
      if (tg.ref) say('الاتحاد', 'سجّل ملاحظة على تصريحك ضد التحكيم، وممكن يتحول لغرامة لو اتكرر.', 'down');
      if (tg.team) { r.fame -= 0.5; say('زملاءك', 'مش مبسوطين إنك هاجمتهم قدام الإعلام.', 'down'); }
      if (!anyTarget) say('الصحافة', 'تصريحك كان حاد، وكتبوا عنه عناوين مش في صالحك.', 'down');
    }

    /* 3) لوم واتهام */
    if (blame > 0 && prof === 0) {
      var m = bad ? 1.3 : 1;
      r.tags.push('blame');
      if (tg.coach) { r.favor -= 0.3 * m; say(coach, 'حسّ إنك بتحمّله المسؤولية، وده هيأثر على ثقته فيك.', 'down'); }
      else if (tg.ref) { r.fame += 0.3; r.favor -= 0.05; if (accuse) { r.fine += Math.round(salary * 0.02); say('الاتحاد', 'اتهامك للتحكيم من غير دليل هيعرضك لغرامة.', 'down'); } else say('الصحافة', 'تصريحك عن التحكيم أثار جدل، ومعاك ناس كتير في رأيك.', 'neutral'); }
      else if (tg.team) { r.favor -= 0.12 * m; r.fame -= 1; say('زملاءك', 'اتضايقوا من إنك رمّيت الغلط عليهم.', 'down'); }
      else if (tg.mgmt) { r.favor -= 0.15; r.fame -= 0.5; say('الإدارة', 'مش مرتاحة لانتقادك العلني.', 'down'); }
      else { r.favor -= 0.1 * m; say('الصحافة', 'فسّروا كلامك إنك بتهرب من المسؤولية.', 'down'); }
      r.tone = 'bad';
    }

    /* 4) اعتذار وتواضع */
    if ((hum > 0 || apo > 0) && prof === 0 && mild === 0) {
      var k = bad ? 1.5 : 1;
      r.fame += 0.5 * k; r.favor += 0.12 * k; r.tags.push('humble');
      say('الجمهور', bad ? 'الجماهير قدّرت اعترافك واعتذارك، وكتير منها سامحتك.' : 'الجماهير حبّت تواضعك.', 'up');
      say(coach, 'ارتاح لروحك وإنك مسؤول، ومستعد يدّيك فرصة.', 'up');
      if (r.tone !== 'bad') r.tone = 'good';
    }

    /* 5) مدح وشكر */
    if (pos > 0 && prof === 0 && mild === 0 && blame === 0) {
      var kk = good ? 1.3 : 1; r.tags.push('praise');
      if (tg.fans) { r.fame += 2 * kk; say('الجمهور', 'الجماهير اتحمّست جدًا لشكرك ليها، والمدرجات هتغنيلك.', 'up'); }
      if (tg.coach) { r.favor += 0.15; r.fame += 0.5; say(coach, 'سعيد بكلامك الجميل عنه، وده هيقوّي علاقتكم.', 'up'); }
      if (tg.team) { r.favor += 0.1; r.fame += 1; say('زملاءك', 'حبّوا روح الفريق في تصريحك.', 'up'); }
      if (tg.mgmt) { r.favor += 0.05; say('الإدارة', 'مبسوطة بكلامك عن النادي.', 'up'); }
      if (tg.ref) { r.fame += 0.3; say('الصحافة', 'احترامك للتحكيم لفت نظر الناس.', 'up'); }
      if (!anyTarget) { r.fame += 0.8; say('الصحافة', 'تصريح إيجابي وهادي، وصورتك عند الإعلام اتحسنت.', 'up'); }
      if (r.tone !== 'bad') r.tone = 'good';
    }

    /* 6) غرور */
    if (arrog && prof === 0) {
      r.tags.push('arrogant');
      r.fame += good ? 1.5 : 0.5; r.favor -= bad ? 0.4 : good ? 0.1 : 0.2;
      say('الإعلام', good ? 'تصريحك الواثق جذب الأضواء، بس ناس شافته مبالغ فيه.' : 'كلامك اتفسّر إنه غرور، خاصة بعد أدائك.', bad ? 'down' : 'neutral');
      say(coach, 'مش بيحب لاعب يحط نفسه فوق الفريق.', 'down');
      if (bad) r.fame -= 1.5;
      r.tone = bad ? 'bad' : r.tone;
    }

    /* 7) رحيل وولاء */
    if (leave && prof === 0) {
      r.tags.push('leave'); r.favor -= 0.25; r.fame += 1.5;
      say('الإعلام', 'تلميحك بالرحيل ولّع شائعات الانتقالات وبقيت حديث الصحافة.', 'neutral');
      say('الجمهور', 'جماهير ' + club + ' منقسمة، ناس زعلانة وناس متفهمة.', 'down');
      say(coach, 'سمع كلامك عن الرحيل وبدأ يشك في التزامك.', 'down');
      if (r.tone !== 'bad') r.tone = 'bad';
    } else if (loyal && prof === 0) {
      r.tags.push('loyal'); r.favor += 0.1; r.fame += 1;
      say('الجمهور', 'كلامك عن البقاء في ' + club + ' كسب قلوب الجماهير.', 'up');
      say('الإدارة', 'مرتاحة لإنك مرتبط بالنادي.', 'up');
      if (r.tone !== 'bad') r.tone = 'good';
    }

    /* 8) هزار وثقة وبدون تعليق */
    if (humor && prof === 0 && mild === 0) {
      r.tags.push('humor');
      if (bad) { r.fame -= 1; say('الجمهور', 'ناس شافت الهزار في وقت صعب استخفاف بالنتيجة.', 'down'); }
      else { r.fame += 0.5; say('الصحافة', 'ردك الخفيف عجب الصحفيين وطلع عنوان مسلّي.', 'up'); }
    }
    if (conf && prof === 0 && mild === 0 && !arrog) {
      r.tags.push('confident'); r.favor += 0.03; r.fame += bad ? 0 : 0.5;
      say('الجمهور', 'ثقتك في الفوز رفعت معنويات المدرجات.', 'up');
    }
    if (nocom && !r.lines.length) { r.fame -= 0.2; say('الصحافة', 'تهرّبت من الأسئلة، ومفيش عناوين من كلامك.', 'neutral'); }

    /* 9) مفهمناش */
    if (!r.lines.length) {
      if (anyTarget) say('الصحافة', 'تكلمت في الموضوع ده بس من غير موقف واضح، فعدّى بهدوء.', 'neutral');
      else say('الصحافة', pickOne(['الصحفيين مش متأكدين تقصد إيه بالظبط، والكلام عدّى هادي.', 'إجابة غامضة، ومحدش اتحمس يكتب عنها.'], rng), 'neutral');
    }
    r.fame = Math.round(clamp(r.fame, -10, 6) * 10) / 10;
    r.favor = Math.round(clamp(r.favor, -0.8, 0.4) * 100) / 100;
    if (r.tone === 'neutral') r.tone = r.fame > 0.4 ? 'good' : r.fame < -0.4 ? 'bad' : 'neutral';
    return r;
  }

  root.KoraPressAI = { analyze: analyze, _norm: norm };
})(typeof window !== 'undefined' ? window : this);
