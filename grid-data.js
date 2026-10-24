/* Kora Challenge — بيانات لعبة شبكة الأندية (Football Grid)
   كل لاعب: الاسم EN | الاسم AR | الجنسية | المركز | الحقبة (o قديم = 90s/2000s, n حديث) | الأندية (من القايمة اللي فوق بس)
   تقدر تزود لاعبين براحتك: اتأكد إن الأندية المكتوبة صحيحة (لعب فعلاً للنادي) */
(function (root) {
  'use strict';

  var CR = 'https://crests.football-data.org/';
  var FL = 'https://flagcdn.com/w80/';

  var CLUBS = {
    rm:  { ar: 'ريال مدريد', crest: 86 },    bar: { ar: 'برشلونة', crest: 81 },
    atm: { ar: 'أتلتيكو مدريد', crest: 78 }, psg: { ar: 'باريس سان جيرمان', crest: 524 },
    bay: { ar: 'بايرن ميونخ', crest: 5 },    bvb: { ar: 'بوروسيا دورتموند', crest: 4 },
    juv: { ar: 'يوفنتوس', crest: 109 },      mil: { ar: 'ميلان', crest: 98 },
    int: { ar: 'إنتر ميلان', crest: 108 },   nap: { ar: 'نابولي', crest: 113 },
    rom: { ar: 'روما', crest: 100 },         mun: { ar: 'مانشستر يونايتد', crest: 66 },
    mci: { ar: 'مانشستر سيتي', crest: 65 },  che: { ar: 'تشيلسي', crest: 61 },
    liv: { ar: 'ليفربول', crest: 64 },       ars: { ar: 'أرسنال', crest: 57 },
    tot: { ar: 'توتنهام', crest: 73 },       aja: { ar: 'أياكس', crest: 678 },
    por: { ar: 'بورتو', crest: 503 },        ben: { ar: 'بنفيكا', crest: 1903 },
    wol: { ar: 'فولفسبورج', crest: 11 },     mon: { ar: 'موناكو', crest: 548 },
    val: { ar: 'فالنسيا', crest: 95 },       sev: { ar: 'إشبيلية', crest: 559 },
    new: { ar: 'نيوكاسل', crest: 67 },       eve: { ar: 'إيفرتون', crest: 62 },
    whu: { ar: 'وست هام', crest: 563 },      lev: { ar: 'باير ليفركوزن', crest: 3 },
    sch: { ar: 'شالكه', crest: 6 },          lei: { ar: 'ليستر سيتي', crest: 338 }
  };
  var BIG = ['rm', 'bar', 'atm', 'psg', 'bay', 'bvb', 'juv', 'mil', 'int', 'nap', 'rom', 'mun', 'mci', 'che', 'liv', 'ars', 'tot'];
  var UNDERDOG = ['aja', 'por', 'ben', 'wol', 'mon', 'val', 'sev', 'new', 'eve', 'whu', 'lev', 'sch', 'lei', 'rom', 'tot', 'nap', 'atm', 'bvb'];

  var NATIONS = {
    br: 'البرازيل', ar: 'الأرجنتين', fr: 'فرنسا', es: 'إسبانيا', pt: 'البرتغال', 'gb-eng': 'إنجلترا',
    de: 'ألمانيا', it: 'إيطاليا', nl: 'هولندا', be: 'بلجيكا', eg: 'مصر', hr: 'كرواتيا', uy: 'الأوروجواي'
  };
  var NAT_AR = Object.assign({
    sn: 'السنغال', ma: 'المغرب', ci: 'ساحل العاج', cm: 'الكاميرون', cl: 'تشيلي', co: 'كولومبيا', pl: 'بولندا',
    no: 'النرويج', dk: 'الدنمارك', cz: 'التشيك', se: 'السويد', ua: 'أوكرانيا', bg: 'بلغاريا', ro: 'رومانيا',
    'gb-wls': 'ويلز', gh: 'غانا', dz: 'الجزائر', ga: 'الجابون'
  }, NATIONS);
  var POS_AR = { GK: 'حارس مرمى', DF: 'مدافع', MF: 'وسط', FW: 'مهاجم' };

  var RAW = [
'Lionel Messi|ليونيل ميسي|ar|FW|n|bar,psg',
'Cristiano Ronaldo|كريستيانو رونالدو|pt|FW|n|mun,rm,juv',
'Neymar|نيمار|br|FW|n|bar,psg',
'Kylian Mbappe|كيليان مبابي|fr|FW|n|mon,psg,rm',
'Karim Benzema|كريم بنزيما|fr|FW|n|rm',
'Zlatan Ibrahimovic|زلاتان إبراهيموفيتش|se|FW|o|aja,juv,int,bar,mil,psg,mun',
'Thierry Henry|تييري هنري|fr|FW|o|mon,juv,ars,bar',
'David Beckham|ديفيد بيكهام|gb-eng|MF|o|mun,rm,mil,psg',
'Zinedine Zidane|زين الدين زيدان|fr|MF|o|juv,rm',
'Ronaldo Nazario|رونالدو الظاهرة|br|FW|o|bar,int,rm,mil',
'Ronaldinho|رونالدينيو|br|MF|o|psg,bar,mil',
'Kaka|كاكا|br|MF|o|mil,rm',
'Luis Figo|لويس فيغو|pt|MF|o|bar,rm,int',
'Andriy Shevchenko|أندري شيفتشينكو|ua|FW|o|mil,che',
'Samuel Eto\'o|صامويل إيتو|cm|FW|o|rm,bar,int,che,eve',
'Didier Drogba|ديدييه دروجبا|ci|FW|o|che',
'Wayne Rooney|واين روني|gb-eng|FW|o|eve,mun',
'Steven Gerrard|ستيفن جيرارد|gb-eng|MF|o|liv',
'Frank Lampard|فرانك لامبارد|gb-eng|MF|o|whu,che,mci',
'Cesc Fabregas|سيسك فابريغاس|es|MF|o|ars,bar,che,mon',
'Sergio Ramos|سيرجيو راموس|es|DF|n|sev,rm,psg',
'Gerard Pique|جيرارد بيكيه|es|DF|n|mun,bar',
'Gianluigi Buffon|جيجي بوفون|it|GK|o|juv,psg',
'Manuel Neuer|مانويل نوير|de|GK|n|sch,bay',
'Thibaut Courtois|تيبو كورتوا|be|GK|n|che,atm,rm',
'Petr Cech|بيتر تشيك|cz|GK|o|che,ars',
'Edwin van der Sar|إدوين فان در سار|nl|GK|o|aja,juv,mun',
'Roberto Carlos|روبرتو كارلوس|br|DF|o|int,rm',
'Dani Alves|داني ألفيش|br|DF|n|sev,bar,juv,psg',
'Thiago Silva|تياغو سيلفا|br|DF|n|mil,psg,che',
'David Luiz|ديفيد لويز|br|DF|n|ben,che,psg,ars',
'Robert Lewandowski|روبرت ليفاندوفسكي|pl|FW|n|bvb,bay,bar',
'Mario Gotze|ماريو غوتزه|de|MF|n|bvb,bay',
'Mats Hummels|ماتس هوميلس|de|DF|n|bvb,bay',
'Erling Haaland|إرلينج هالاند|no|FW|n|bvb,mci',
'Jadon Sancho|جادون سانشو|gb-eng|FW|n|mci,bvb,mun,che',
'Ousmane Dembele|عثمان ديمبلي|fr|FW|n|bvb,bar,psg',
'Pierre-Emerick Aubameyang|بيير إيميريك أوباميانغ|ga|FW|n|mil,bvb,ars,bar,che',
'Robin van Persie|روبن فان بيرسي|nl|FW|o|ars,mun',
'Arjen Robben|أريين روبن|nl|FW|o|che,rm,bay',
'Wesley Sneijder|ويسلي سنايدر|nl|MF|o|aja,rm,int',
'Clarence Seedorf|كلارنس سيدورف|nl|MF|o|aja,rm,int,mil',
'Patrick Kluivert|باتريك كلويفرت|nl|FW|o|aja,mil,bar,new,val',
'Dennis Bergkamp|دينيس بيركامب|nl|FW|o|aja,int,ars',
'Edgar Davids|إدغار دايفيدز|nl|MF|o|aja,mil,juv,bar,int,tot',
'Ruud van Nistelrooy|رود فان نيستلروي|nl|FW|o|mun,rm',
'Gabriel Batistuta|غابرييل باتيستوتا|ar|FW|o|rom,int',
'Hernan Crespo|هرنان كريسبو|ar|FW|o|int,che,mil',
'Carlos Tevez|كارلوس تيفيز|ar|FW|o|whu,mun,mci,juv',
'Sergio Aguero|سيرجيو أغويرو|ar|FW|n|atm,mci,bar',
'Gonzalo Higuain|غونزالو هيغواين|ar|FW|n|rm,nap,juv,mil,che',
'Angel Di Maria|أنخيل دي ماريا|ar|MF|n|ben,rm,mun,psg,juv',
'Javier Mascherano|خافيير ماسكيرانو|ar|MF|n|whu,liv,bar',
'Mauro Icardi|ماورو إيكاردي|ar|FW|n|int,psg',
'Paulo Dybala|باولو ديبالا|ar|FW|n|juv,rom',
'Juan Sebastian Veron|خوان سيباستيان فيرون|ar|MF|o|mun,che,int',
'Esteban Cambiasso|إستيبان كامبياسو|ar|MF|o|rm,int',
'Walter Samuel|والتر صامويل|ar|DF|o|rom,rm,int',
'Ezequiel Lavezzi|إزيكيل لافيتسي|ar|FW|n|nap,psg',
'Diego Forlan|دييغو فورلان|uy|FW|o|mun,atm,int',
'Luis Suarez|لويس سواريز|uy|FW|n|aja,liv,bar,atm',
'Edinson Cavani|إدينسون كافاني|uy|FW|n|nap,psg,mun,val',
'Diego Godin|دييغو غودين|uy|DF|n|atm,int',
'Fernando Torres|فرناندو توريس|es|FW|o|atm,liv,che,mil',
'David Villa|ديفيد فيا|es|FW|o|val,bar,atm',
'David Silva|ديفيد سيلفا|es|MF|n|val,mci',
'Juan Mata|خوان ماتا|es|MF|n|val,che,mun',
'Alvaro Morata|ألفارو موراتا|es|FW|n|rm,juv,che,atm,mil',
'Pedro|بيدرو|es|FW|n|bar,che',
'Diego Costa|دييغو كوستا|es|FW|n|atm,che',
'Thiago Alcantara|تياغو ألكانتارا|es|MF|n|bar,bay,liv',
'Xabi Alonso|تشابي ألونسو|es|MF|o|liv,rm,bay',
'Raul|راؤول غونزاليس|es|FW|o|rm,sch',
'Alvaro Arbeloa|ألفارو أربيلوا|es|DF|o|liv,rm',
'Pepe Reina|بيبي رينا|es|GK|o|liv,bay,nap,mil',
'Isco|إيسكو|es|MF|n|val,rm',
'Alexis Sanchez|أليكسيس سانشيز|cl|FW|n|bar,ars,mun,int',
'Arturo Vidal|أرتورو فيدال|cl|MF|n|juv,bay,bar,int',
'Gareth Bale|غاريث بيل|gb-wls|FW|n|tot,rm',
'Luka Modric|لوكا مودريتش|hr|MF|n|tot,rm',
'Ivan Rakitic|إيفان راكيتيتش|hr|MF|n|sch,sev,bar',
'Mario Mandzukic|ماريو ماندزوكيتش|hr|FW|n|wol,bay,atm,juv,mil',
'Ivan Perisic|إيفان بيريسيتش|hr|MF|n|bvb,wol,bay,int,tot',
'Mateo Kovacic|ماتيو كوفاتشيتش|hr|MF|n|int,rm,che,mci',
'Eden Hazard|إدين هازارد|be|FW|n|che,rm',
'Kevin De Bruyne|كيفين دي بروين|be|MF|n|che,wol,mci',
'Romelu Lukaku|روميلو لوكاكو|be|FW|n|che,eve,mun,int,rom',
'Mohamed Salah|محمد صلاح|eg|FW|n|che,rom,liv',
'Mido|ميدو|eg|FW|o|aja,rom,tot,whu',
'Omar Marmoush|عمر مرموش|eg|FW|n|wol,mci',
'Mohamed Elneny|محمد النني|eg|MF|n|ars',
'Hossam Ghaly|حسام غالي|eg|MF|o|tot',
'Sadio Mane|ساديو ماني|sn|FW|n|liv,bay',
'Kalidou Koulibaly|كاليدو كوليبالي|sn|DF|n|nap,che',
'Riyad Mahrez|رياض محرز|dz|FW|n|lei,mci',
'Yaya Toure|يايا توريه|ci|MF|o|mon,bar,mci',
'Michael Essien|مايكل إيسيان|gh|MF|o|che,rm,mil',
'Achraf Hakimi|أشرف حكيمي|ma|DF|n|rm,bvb,int,psg',
'Hakim Ziyech|حكيم زياش|ma|MF|n|aja,che',
'Paul Pogba|بول بوغبا|fr|MF|n|mun,juv',
'N\'Golo Kante|نغولو كانتي|fr|MF|n|lei,che',
'Antoine Griezmann|أنطوان غريزمان|fr|FW|n|atm,bar',
'Raphael Varane|رافائيل فاران|fr|DF|n|rm,mun',
'Olivier Giroud|أوليفييه جيرو|fr|FW|n|ars,che,mil',
'Patrice Evra|باتريس إيفرا|fr|DF|o|mon,mun,juv',
'Claude Makelele|كلود ماكيليلي|fr|MF|o|rm,che',
'Patrick Vieira|باتريك فييرا|fr|MF|o|mil,ars,juv,int,mci',
'Nicolas Anelka|نيكولا أنيلكا|fr|FW|o|psg,ars,rm,liv,mci,che',
'Marcel Desailly|مارسيل ديسايي|fr|DF|o|mil,che',
'Lilian Thuram|ليليان تورام|fr|DF|o|mon,juv,bar',
'Emmanuel Petit|إيمانويل بوتي|fr|MF|o|mon,ars,bar,che',
'Christian Vieri|كريستيان فييري|it|FW|o|juv,atm,int,mil',
'Andrea Pirlo|أندريا بيرلو|it|MF|o|int,mil,juv',
'Gianluigi Donnarumma|جيجي دوناروما|it|GK|n|mil,psg,mci',
'Jorginho|جورجينيو|it|MF|n|nap,che,ars',
'Mario Balotelli|ماريو بالوتيلي|it|FW|o|int,mci,mil,liv',
'Leonardo Bonucci|ليوناردو بونوتشي|it|DF|n|int,juv,mil',
'Roberto Baggio|روبرتو باجيو|it|FW|o|juv,mil,int',
'Gianfranco Zola|جيانفرانكو زولا|it|FW|o|nap,che',
'Harry Kane|هاري كين|gb-eng|FW|n|tot,bay',
'Raheem Sterling|رحيم سترلينغ|gb-eng|FW|n|liv,mci,che,ars',
'Jude Bellingham|جود بيلينغهام|gb-eng|MF|n|bvb,rm',
'Kyle Walker|كايل ووكر|gb-eng|DF|n|tot,mci',
'Declan Rice|ديكلان رايس|gb-eng|MF|n|whu,ars',
'Michael Owen|مايكل أوين|gb-eng|FW|o|liv,rm,new,mun',
'Rio Ferdinand|ريو فرديناند|gb-eng|DF|o|whu,mun',
'Ashley Cole|آشلي كول|gb-eng|DF|o|ars,che,rom',
'Joe Cole|جو كول|gb-eng|MF|o|whu,che,liv',
'Owen Hargreaves|أوين هارغريفز|gb-eng|MF|o|bay,mun,mci',
'Jens Lehmann|ينس ليمان|de|GK|o|sch,mil,bvb,ars',
'Michael Ballack|مايكل بالاك|de|MF|o|lev,bay,che',
'Toni Kroos|توني كروس|de|MF|n|lev,bay,rm',
'Mesut Ozil|مسعود أوزيل|de|MF|n|sch,rm,ars',
'Sami Khedira|سامي خضيرة|de|MF|n|rm,juv',
'Leroy Sane|ليروي ساني|de|FW|n|sch,mci,bay',
'Kai Havertz|كاي هافرتز|de|MF|n|lev,che,ars',
'Ilkay Gundogan|إلكاي غوندوغان|de|MF|n|bvb,mci,bar',
'Julian Draxler|يوليان دراكسلر|de|MF|n|sch,wol,psg',
'Andre Schurrle|أندريه شورله|de|FW|n|lev,che,wol,bvb',
'Bernardo Silva|برناردو سيلفا|pt|MF|n|mon,mci',
'Joao Cancelo|جواو كانسيلو|pt|DF|n|val,int,juv,mci,bay,bar',
'Joao Felix|جواو فيليكس|pt|FW|n|ben,atm,che,bar,mil',
'Pepe|بيبي|pt|DF|o|por,rm',
'Ricardo Carvalho|ريكاردو كارفاليو|pt|DF|o|por,che,rm',
'Deco|ديكو|pt|MF|o|por,bar,che',
'Nani|ناني|pt|FW|n|mun,val',
'Rui Costa|روي كوستا|pt|MF|o|ben,mil',
'Casemiro|كاسيميرو|br|MF|n|rm,por,mun',
'Philippe Coutinho|فيليب كوتينيو|br|MF|n|int,liv,bar,bay',
'Rivaldo|ريفالدو|br|FW|o|bar,mil',
'Alisson Becker|أليسون بيكر|br|GK|n|rom,liv',
'Ederson|إيدرسون|br|GK|n|ben,mci',
'Gabriel Jesus|غابرييل جيزوس|br|FW|n|mci,ars',
'Willian|ويليان|br|FW|n|che,ars',
'Radamel Falcao|راداميل فالكاو|co|FW|n|atm,mon,mun,che',
'James Rodriguez|خاميس رودريغيز|co|MF|n|por,mon,rm,bay',
'Dimitar Berbatov|ديميتار برباتوف|bg|FW|o|lev,tot,mun',
'Gheorghe Hagi|جورجي هاجي|ro|MF|o|rm,bar',
'Christian Eriksen|كريستيان إريكسن|dk|MF|n|aja,tot,int,mun',
'Rafael van der Vaart|رافائيل فان دير فارت|nl|MF|o|aja,rm,tot',
'Memphis Depay|ممفيس ديباي|nl|FW|n|mun,bar,atm',
'Daley Blind|دالي بلايند|nl|DF|n|aja,mun',
'Matthijs de Ligt|ماتياس دي ليخت|nl|DF|n|aja,juv,bay,mun',
'Frenkie de Jong|فرينكي دي يونغ|nl|MF|n|aja,bar',
'Jaap Stam|ياب ستام|nl|DF|o|mun,mil',
'Marc Overmars|مارك أوفرمارس|nl|FW|o|aja,ars,bar',
'Tomas Rosicky|توماش روسيتسكي|cz|MF|o|bvb,ars',
'Henrik Larsson|هنريك لارسون|se|FW|o|bar,mun'
  ];

  var NORM_MAP = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي' };
  function norm(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[أإآىةؤئ]/g, function (c) { return NORM_MAP[c]; })
      .replace(/ø/g, 'o').replace(/ł/g, 'l').replace(/đ/g, 'd')
      .replace(/[^a-z0-9؀-ۿ ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  var PLAYERS = RAW.map(function (r, i) {
    var f = r.split('|');
    return { id: i, en: f[0], ar: f[1], nat: f[2], pos: f[3], old: f[4] === 'o', clubs: f[5].split(','), key: norm(f[0]) + ' ' + norm(f[1]) };
  });

  function header(kind, id) {
    if (kind === 'club') return { kind: 'club', id: id, ar: CLUBS[id].ar, img: CR + CLUBS[id].crest + '.png' };
    return { kind: 'nation', id: id, ar: NATIONS[id], img: FL + id + '.png' };
  }
  function has(p, h) { return h.kind === 'club' ? p.clubs.indexOf(h.id) > -1 : p.nat === h.id; }
  function valid(p, row, col) { return has(p, row) && has(p, col); }

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* expert: الكل مقبول، بس الخانات لازم يكون فيها لاعب قديم (90s/2000s) والأندية أصعب */
  function makeGrid(mode) {
    var expert = mode === 'expert';
    var clubPool = expert ? Object.keys(CLUBS) : BIG;
    var natIds = Object.keys(NATIONS);
    var tries = 0;
    while (tries < 1500) {
      tries++;
      var need = tries < 800 ? 2 : 1;
      var cols = shuffle(clubPool).slice(0, 3).map(function (id) { return header('club', id); });
      var colIds = cols.map(function (h) { return h.id; });
      var restClubs = shuffle(clubPool).filter(function (id) { return colIds.indexOf(id) < 0; });
      var rowSet = [];
      var nNat = Math.random() < 0.8 ? (Math.random() < 0.5 ? 1 : 2) : 0;
      shuffle(natIds).slice(0, nNat).forEach(function (n) { rowSet.push(header('nation', n)); });
      restClubs.slice(0, 3 - rowSet.length).forEach(function (id) { rowSet.push(header('club', id)); });
      var rows = shuffle(rowSet);
      var ok = true, counts = [], oldCells = 0;
      for (var r = 0; r < 3 && ok; r++) {
        for (var c = 0; c < 3; c++) {
          var pool = PLAYERS.filter(function (p) { return valid(p, rows[r], cols[c]); });
          if (pool.length < (expert ? 1 : need)) { ok = false; break; }
          if (pool.some(function (p) { return p.old; })) oldCells++;
          counts.push(pool.length);
        }
      }
      if (ok && expert) {
        var under = cols.concat(rows).filter(function (h) { return h.kind === 'club' && BIG.indexOf(h.id) < 0; }).length;
        if (oldCells < 4 || under < 2) ok = false;
      }
      if (ok) return { rows: rows, cols: cols, counts: counts };
    }
    return expert ? makeGrid('classic') : null;
  }

  var API = { PLAYERS: PLAYERS, CLUBS: CLUBS, NATIONS: NATIONS, NAT_AR: NAT_AR, POS_AR: POS_AR, norm: norm, valid: valid, makeGrid: makeGrid, shuffle: shuffle };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  root.KoraGridData = API;
})(typeof window !== 'undefined' ? window : globalThis);
