/* Kora Challenge — توسيع عالم كارير مود: 15 دوري، كؤوس، تشكيلات حقيقية، منتخبات، ممتلكات ورعاة (موسم 2026/27)
   لازم يتحمّل بعد careermode-data.js و coach-data.js و coach-squads-*.js و careermode-rosters.js */
(function (root) {
  'use strict';
  var isNode = typeof require !== 'undefined' && typeof module !== 'undefined';
  var D = isNode ? require('./careermode-data.js') : root.KoraCMData;
  var CD = isNode ? require('./coach-data.js') : root.KoraCoachData;
  var ROS = isNode ? (global.KoraCMRosters || {}) : (root.KoraCMRosters || {});

  /* ---- دمج دوريات وكؤوس وأندية المدرب ---- */
  Object.keys(CD.LEAGUES).forEach(function (lk) {
    if (D.LEAGUES[lk]) return;
    var l = CD.LEAGUES[lk], big = ['ger', 'fra'].indexOf(l.country) > -1;
    D.LEAGUES[lk] = { ar: l.ar, country: l.country, tier: l.tier, diff: l.tier === 1 ? (big ? 2 : 1) : 1, size: l.size, up: l.up, down: l.down };
    D.CLUBS[lk] = CD.CLUBS[lk].map(function (c) { return c.slice(0, 4); });
  });
  Object.keys(CD.COUNTRIES).forEach(function (ck) {
    var c = CD.COUNTRIES[ck];
    if (!D.COUNTRIES[ck]) D.COUNTRIES[ck] = { ar: c.ar, cur: c.cur, leagues: c.leagues.slice() };
    D.COUNTRIES[ck].cups = c.cups;
    if (!D.POOL[ck] && CD.POOLS[ck] && CD.POOLS[ck].length) D.POOL[ck] = CD.POOLS[ck];
  });
  Object.assign(D.MEANS, { ger1: 72, ger2: 62, fra1: 70, fra2: 58, usa1: 66, bel1: 64, tur1: 65, tur2: 54, mar1: 57, por1: 68, ned1: 69, bra1: 71, arg1: 67 });

  /* MLS بيتحاكى بـ20 نادي بدل 30 (جدول واحد) */
  D.CLUBS.usa1 = D.CLUBS.usa1.slice(0, 20); D.LEAGUES.usa1.size = 20; D.LEAGUES.usa1.noRel = true;
  D.COUNTRIES.usa.cur = '$';

  /* ---- 4 دوريات جديدة: البرتغال، هولندا، البرازيل، الأرجنتين ---- */
  function add(lk, ck, ar, cup, cupAr, arr, pool, cur) {
    D.LEAGUES[lk] = { ar: ar, country: ck, tier: 1, diff: 1, size: arr.length, up: null, down: null };
    D.CLUBS[lk] = arr.map(function (c) { return [lk + '_' + c[0], c[1], c[2], null]; });
    D.COUNTRIES[ck] = { ar: { por: 'البرتغال', ned: 'هولندا', bra: 'البرازيل', arg: 'الأرجنتين' }[ck], cur: cur || '€', leagues: [lk], cups: [{ id: cup, ar: cupAr, n: 16, from: [lk] }] };
    D.POOL[ck] = pool.map(function (c, i) { return [ck + '_p' + i, c[0], c[1]]; });
  }
  add('por1', 'por', 'الدوري البرتغالي', 'ctp', 'كأس البرتغال', [
    ['scp', 'سبورتينج لشبونة', 81], ['slb', 'بنفيكا', 80], ['fcp', 'بورتو', 79], ['scb', 'براجا', 74], ['vit', 'فيتوريا جيماريش', 67], ['gil', 'جيل فيسنتي', 65],
    ['est', 'إستوريل', 64], ['fam', 'فاماليكاو', 64], ['cas', 'كازا بيا', 62], ['mor', 'موريرينسي', 62], ['rio', 'ريو آفي', 61], ['sta', 'سانتا كلارا', 62],
    ['nac', 'ناسيونال', 61], ['aro', 'أروكا', 60], ['alv', 'ألفيركا', 58], ['ton', 'تونديلا', 58], ['eam', 'إستريلا أمادورا', 59], ['avs', 'إيه في إس', 58]
  ], [['بوافيشتا', 52], ['فارنسي', 52], ['تروفينسي', 51], ['فيلا ريال', 51]]);
  add('ned1', 'ned', 'الدوري الهولندي', 'knvb', 'كأس هولندا', [
    ['psv', 'بي إس في', 78], ['fey', 'فاينورد', 76], ['ajx', 'أياكس', 74], ['az', 'إيه زد ألكمار', 72], ['twe', 'توينتي', 70], ['utr', 'أوتريخت', 69],
    ['goa', 'جو أهيد إيجلز', 66], ['spa', 'سبارتا روتردام', 65], ['nec', 'نايميخن', 66], ['hee', 'هيرينفين', 65], ['for', 'فورتونا سيتارد', 62], ['zwo', 'زفولله', 61],
    ['her', 'هيراكليس', 60], ['gro', 'خرونينجن', 62], ['nac', 'نات بريدا', 61], ['exc', 'إكسلسيور', 59], ['vol', 'فولندام', 58], ['tel', 'تيلستار', 58]
  ], [['ويليم الثاني', 56], ['روده', 56], ['ألميري سيتي', 55], ['دن بوش', 55]]);
  add('bra1', 'bra', 'الدوري البرازيلي', 'cdb', 'كأس البرازيل', [
    ['fla', 'فلامينجو', 77], ['pal', 'بالميراس', 77], ['bot', 'بوتافوجو', 72], ['flu', 'فلومينينسي', 70], ['cor', 'كورينثيانز', 70], ['sao', 'ساو باولو', 69],
    ['cam', 'أتلتيكو مينيرو', 70], ['cru', 'كروزيرو', 70], ['gre', 'جريميو', 68], ['int', 'إنترناسيونال', 68], ['bah', 'باهيا', 67], ['for', 'فورتاليزا', 67],
    ['vas', 'فاسكو دا جاما', 66], ['san', 'سانتوس', 66], ['bra', 'براجانتينو', 65], ['cap', 'أتلتيكو باراناينسي', 65], ['vit', 'فيتوريا', 62], ['mir', 'ميراسول', 62],
    ['cea', 'سيارا', 62], ['juv', 'جوفنتودي', 60]
  ], [['سبورت ريسيفي', 54], ['كوريتيبا', 54], ['جوياس', 55], ['أمريكا مينيرو', 54]], '€');
  add('arg1', 'arg', 'الدوري الأرجنتيني', 'cdarg', 'كأس الأرجنتين', [
    ['riv', 'ريفر بليت', 73], ['boc', 'بوكا جونيورز', 72], ['rac', 'راسينج كلوب', 68], ['est', 'إستوديانتيس', 69], ['vel', 'فيليز سارسفيلد', 68], ['ind', 'إندبندينتي', 66],
    ['slo', 'سان لورنزو', 66], ['tal', 'تاليريس', 66], ['ros', 'روساريو سنترال', 65], ['lan', 'لانوس', 65], ['arj', 'أرخنتينوس جونيورز', 64], ['hur', 'أوراكان', 63],
    ['bel', 'بلجرانو', 64], ['dyj', 'ديفينسا إي خوستيسيا', 62], ['god', 'جودوي كروز', 62], ['new', 'نيولز أولد بويز', 62], ['ccd', 'سنترال قرطبة', 60], ['ins', 'إنستيتوتو', 60],
    ['bar', 'باراكاس سنترال', 58], ['tig', 'تيجري', 60]
  ], [['أتلتيكو تاكومان', 54], ['ديبورتيفو ريستا', 53], ['سان مارتن', 53], ['كيلمز', 52]]);
  Object.assign(D.MEANS, { por1: 68, ned1: 69, bra1: 70, arg1: 66 });

  /* لازم نتأكد إن اسم الأندية الأرجنتينية/البرازيلية مش بيتكرر الـid بين دوريين (الاسم الأول + بادئة الدوري بتضمن ده) */
  D.EURO = [];

  /* ---- الـ15 دوري الكبار ---- */
  D.TOP15 = ['eng1', 'esp1', 'ita1', 'ger1', 'fra1', 'por1', 'ned1', 'bel1', 'tur1', 'sau1', 'egy1', 'usa1', 'mar1', 'bra1', 'arg1'];
  D.UEFA = ['eng1', 'esp1', 'ita1', 'ger1', 'fra1', 'por1', 'ned1', 'bel1', 'tur1'];
  D.EUROQ = { eng1: 4, esp1: 4, ita1: 4, ger1: 4, fra1: 4, por1: 2, ned1: 2, bel1: 1, tur1: 1 };
  D.LEAGUE_PRIZE = { eng1: 3.0, esp1: 3.0, ita1: 2.5, ger1: 2.5, fra1: 2.2, por1: 1.0, ned1: 1.0, bel1: 0.6, tur1: 0.8, sau1: 1.5, usa1: 1.0, egy1: 0.35, mar1: 0.3, bra1: 0.9, arg1: 0.7 };

  /* ---- بدايات المسيرة: كل الدوريات ---- */
  D.STARTS = Object.keys(D.LEAGUES).filter(function (k) { return D.LEAGUES[k].size >= 16; }).map(function (k) {
    var l = D.LEAGUES[k];
    return { id: k, ar: l.ar, note: l.tier === 1 ? 'الدرجة الأولى' : l.tier === 2 ? 'الدرجة التانية' : 'الدرجة التالتة' };
  });

  /* ---- التشكيلات الحقيقية (من وضع المدرب + الإضافية) ---- */
  var R = {}; var base = (CD.SQUADS && CD.SQUADS.map) || {};
  Object.keys(base).forEach(function (k) { R[k] = base[k]; });
  Object.keys(ROS).forEach(function (k) { if (!R[k]) R[k] = ROS[k]; });
  D.ROSTERS = R;

  /* ---- المنتخبات ---- */
  /* منتخبات آسيوية إضافية عشان كأس آسيا يبقى 16 فريق */
  var AFC_EXTRA = [['الإمارات', 'ae', 57, 'AFC'], ['الأردن', 'jo', 58, 'AFC'], ['عُمان', 'om', 55, 'AFC'], ['البحرين', 'bh', 53, 'AFC'], ['سوريا', 'sy', 54, 'AFC'], ['الصين', 'cn', 56, 'AFC'], ['الكويت', 'kw', 52, 'AFC'], ['إندونيسيا', 'id', 54, 'AFC']];
  D.NATIONAL = CD.NATIONAL.concat(AFC_EXTRA.filter(function (x) { return !CD.NATIONAL.some(function (n) { return n[1] === x[1]; }); }));
  D.NATIONS = [['مصر', 'eg'], ['السعودية', 'sa'], ['المغرب', 'ma'], ['العراق', 'iq'], ['إنجلترا', 'gb-eng'], ['فرنسا', 'fr'], ['ألمانيا', 'de'], ['البرازيل', 'br'], ['الأرجنتين', 'ar'], ['البرتغال', 'pt'], ['أمريكا', 'us']];

  /* ---- الممتلكات (الأسعار باليورو) ---- */
  D.ASSETS = {
    house: [
      { id: 'h1', n: 'شقة استوديو صغيرة', p: 45000, k: 0, c: '#c9b79c' }, { id: 'h2', n: 'شقة عائلية', p: 140000, k: 1, c: '#d7a86e' },
      { id: 'h3', n: 'تاون هاوس', p: 380000, k: 2, c: '#b65d4a' }, { id: 'h4', n: 'بيت عائلي بحديقة', p: 950000, k: 3, c: '#7aa6c9' },
      { id: 'h5', n: 'فيلا مودرن', p: 3800000, k: 4, c: '#e8e4dc' }, { id: 'h6', n: 'قصر بمسبح', p: 14000000, k: 5, c: '#f1d9a8' }, { id: 'h7', n: 'قصر ملكي ضخم', p: 55000000, k: 6, c: '#e9e2cf' }
    ],
    car: [
      { id: 'c1', n: 'تويوتا ياريس', p: 12000, t: 'hatch', c: '#e8453c' }, { id: 'c2', n: 'هيونداي إلنترا', p: 22000, t: 'sedan', c: '#8d99a6' },
      { id: 'c3', n: 'كيا سبورتاج', p: 30000, t: 'suv', c: '#2f7cf6' }, { id: 'c4', n: 'فولكس فاجن جولف', p: 34000, t: 'hatch', c: '#f5f5f5' },
      { id: 'c5', n: 'تويوتا كامري', p: 38000, t: 'sedan', c: '#24344d' }, { id: 'c6', n: 'فورد ماستانج', p: 58000, t: 'coupe', c: '#f6c445' },
      { id: 'c7', n: 'فورد إف-150', p: 60000, t: 'pickup', c: '#3b4a3b' }, { id: 'c8', n: 'بي إم دبليو M3', p: 85000, t: 'sedan', c: '#2f7cf6' },
      { id: 'c9', n: 'أودي Q7', p: 95000, t: 'suv', c: '#1c1c22' }, { id: 'c10', n: 'مرسيدس C63', p: 110000, t: 'sedan', c: '#b9c2cc' },
      { id: 'c11', n: 'تويوتا لاند كروزر', p: 130000, t: 'suv', c: '#e9e4d8' }, { id: 'c12', n: 'رينج روفر', p: 190000, t: 'suv', c: '#2b5a3a' },
      { id: 'c13', n: 'بورش 911', p: 210000, t: 'coupe', c: '#d9342b' }, { id: 'c14', n: 'مرسيدس G63', p: 260000, t: 'suv', c: '#111' },
      { id: 'c15', n: 'أستون مارتن DB12', p: 250000, t: 'coupe', c: '#1f6f55' }, { id: 'c16', n: 'رولز رويس كولينان', p: 400000, t: 'suv', c: '#3b2f5c' },
      { id: 'c17', n: 'لامبورجيني أوراكان', p: 280000, t: 'super', c: '#7ed321' }, { id: 'c18', n: 'ماكلارين 720S', p: 330000, t: 'super', c: '#f28b1c' },
      { id: 'c19', n: 'فيراري SF90', p: 560000, t: 'super', c: '#e10600' }, { id: 'c20', n: 'بوجاتي شيرون', p: 3200000, t: 'super', c: '#1b4fa6' }
    ],
    moto: [
      { id: 'm1', n: 'فيسبا بريمافيرا', p: 6000, t: 'scooter', c: '#8fd3c0' }, { id: 'm2', n: 'ياماها MT-07', p: 8000, t: 'naked', c: '#2f7cf6' },
      { id: 'm3', n: 'كاواساكي نينجا', p: 9500, t: 'sport', c: '#3fbf3f' }, { id: 'm4', n: 'هارلي ديفيدسون', p: 22000, t: 'cruiser', c: '#222' },
      { id: 'm5', n: 'بي إم دبليو GS', p: 24000, t: 'adv', c: '#e9e4d8' }, { id: 'm6', n: 'دوكاتي بانيجالي', p: 28000, t: 'sport', c: '#e10600' },
      { id: 'm7', n: 'إم في أجوستا', p: 40000, t: 'naked', c: '#b9c2cc' }
    ],
    bike: [
      { id: 'b1', n: 'دراجة مدينة', p: 150, t: 'city', c: '#e8453c' }, { id: 'b2', n: 'دراجة جبلية', p: 900, t: 'mtb', c: '#24b36b' }, { id: 'b3', n: 'دراجة سباق كربون', p: 4500, t: 'road', c: '#f6c445' }
    ]
  };

  /* ---- شركات الرعاية (قيمة العقد الأساسية بالمليون) ---- */
  D.SPONSORS = [
    ['نايكي', 'ملابس رياضية', 3.0], ['أديداس', 'ملابس رياضية', 2.8], ['بوما', 'ملابس رياضية', 1.6], ['نيو بالانس', 'أحذية', 1.0],
    ['ريد بول', 'مشروبات طاقة', 1.4], ['بيبسي', 'مشروبات', 1.2], ['جيليت', 'عناية شخصية', 0.9], ['إي إيه سبورتس', 'ألعاب فيديو', 1.1],
    ['أوبو', 'هواتف', 0.7], ['فودافون', 'اتصالات', 0.6], ['إس تي سي', 'اتصالات', 0.6], ['جاتوريد', 'مشروبات رياضية', 0.8],
    ['هوبلو', 'ساعات', 1.5], ['طيران الإمارات', 'طيران', 1.8]
  ];

  /* ---- مكافآت البطولات (مليون €) ---- */
  D.PRIZE = { cl: 6, caf: 1.5, afc: 1.5, cwc: 4, wc: 8, euro: 4, afcon: 2, copa: 4, asian: 2, cupBase: 0.4 };

  if (isNode) module.exports = D;
})(typeof window !== 'undefined' ? window : globalThis);
