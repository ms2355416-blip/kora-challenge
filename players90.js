// =====================================
// لعبة: تحدي ال 90: كام لاعب تقدر تجيب في 90 ثانية
// =====================================

(() => {
  'use strict';

  const GAME_SECONDS = 90;
  const POINTS_PER_PLAYER = 10; // كل لاعب صح = 10 نقاط
  const RING_LENGTH = 276.46;
  const QUEUE_AHEAD = 3;
  const MAX_FAILS_IN_ROW = 8;

  // صور اللاعبين بتتجاب من ويكيبيديا وقت اللعب
  const WIKI_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

  // [الاسم, عنوان صفحة ويكيبيديا (لو مختلف), أسماء بديلة مقبولة]
  const RAW_PLAYERS = [
    ['Lionel Messi', null, ['leo messi']],
    ['Cristiano Ronaldo', null, ['cristiano', 'cr7', 'ronaldo']],
    ['Neymar', null, ['neymar jr']],
    ['Kylian Mbappé'],
    ['Erling Haaland', null, ['haland']],
    ['Mohamed Salah', null, ['mo salah']],
    ['Kevin De Bruyne', null, ['de bruyne']],
    ['Robert Lewandowski'],
    ['Luka Modrić'],
    ['Karim Benzema'],
    ['Harry Kane'],
    ['Vinícius Júnior', null, ['vinicius', 'vini jr', 'vinicius jr']],
    ['Jude Bellingham'],
    ['Antoine Griezmann'],
    ['Sergio Ramos'],
    ['Virgil van Dijk', null, ['van dijk']],
    ['Manuel Neuer'],
    ['Thibaut Courtois'],
    ['Zinedine Zidane'],
    ['Ronaldinho'],
    ['Ronaldo Nazário', 'Ronaldo_(Brazilian_footballer)', ['r9', 'ronaldo']],
    ['Pelé'],
    ['Diego Maradona'],
    ['Johan Cruyff', null, ['cruijff']],
    ['Franz Beckenbauer'],
    ['Zlatan Ibrahimović', null, ['zlatan']],
    ['Thierry Henry'],
    ['David Beckham'],
    ['Wayne Rooney'],
    ['Steven Gerrard'],
    ['Frank Lampard'],
    ['Paul Scholes'],
    ['Ryan Giggs'],
    ['Xavi'],
    ['Andrés Iniesta'],
    ['Iker Casillas'],
    ['Carles Puyol'],
    ['Gerard Piqué'],
    ['Sergio Busquets'],
    ['Luis Suárez', null, ['suarez']],
    ['Edinson Cavani'],
    ['Sergio Agüero', null, ['kun aguero']],
    ['Ángel Di María', null, ['di maria']],
    ['Paulo Dybala'],
    ['Lautaro Martínez'],
    ['Julián Álvarez'],
    ['Rodri', 'Rodri_(footballer,_born_1996)'],
    ['Phil Foden'],
    ['Bukayo Saka'],
    ['Declan Rice'],
    ['Trent Alexander-Arnold', null, ['trent']],
    ['Marcus Rashford'],
    ['Bruno Fernandes'],
    ['Bernardo Silva'],
    ['Rúben Dias'],
    ['João Félix', null, ['joao felix']],
    ['Rafael Leão'],
    ['Son Heung-min', null, ['son', 'son heungmin']],
    ['Sadio Mané'],
    ['Riyad Mahrez'],
    ['Achraf Hakimi'],
    ['Hakim Ziyech'],
    ['Victor Osimhen'],
    ['Didier Drogba'],
    ["Samuel Eto'o", null, ['etoo', 'eto o']],
    ['George Weah'],
    ['Yaya Touré', null, ['yaya toure']],
    ['Mohamed Aboutrika', null, ['abou trika']],
    ['Omar Marmoush'],
    ['Kaká', null, ['kaka']],
    ['Roberto Carlos'],
    ['Cafu'],
    ['Rivaldo'],
    ['Romário', null, ['romario']],
    ['Gianluigi Buffon'],
    ['Paolo Maldini'],
    ['Andrea Pirlo'],
    ['Francesco Totti'],
    ['Alessandro Del Piero', null, ['del piero']],
    ['Fabio Cannavaro'],
    ['Roberto Baggio'],
    ['Marco van Basten', null, ['van basten']],
    ['Dennis Bergkamp'],
    ['Arjen Robben'],
    ['Robin van Persie', null, ['van persie']],
    ['Wesley Sneijder'],
    ['Michael Ballack'],
    ['Philipp Lahm'],
    ['Thomas Müller', null, ['muller']],
    ['Toni Kroos'],
    ['Mesut Özil', null, ['ozil']],
    ['Miroslav Klose'],
    ['Bastian Schweinsteiger'],
    ['Eden Hazard'],
    ['Romelu Lukaku'],
    ['Thiago Silva'],
    ['Dani Alves'],
    ['Gareth Bale'],
    ['Raheem Sterling'],
    ['Alisson', 'Alisson_Becker', ['alisson becker']],

    // ---- 100 لاعب إضافي ----
    ['Lamine Yamal', null, ['yamal']],
    ['Pedri'],
    ['Gavi', 'Gavi_(footballer)'],
    ['Frenkie de Jong', null, ['de jong', 'frenkie']],
    ['Martin Ødegaard', null, ['odegaard', 'martin odegaard']],
    ['Federico Valverde'],
    ['Aurélien Tchouaméni', null, ['tchouameni']],
    ['Eduardo Camavinga'],
    ['Florian Wirtz'],
    ['Jamal Musiala'],
    ['Joshua Kimmich'],
    ['Leroy Sané', null, ['sane']],
    ['Kai Havertz'],
    ['Serge Gnabry'],
    ['İlkay Gündoğan', '%C4%B0lkay_G%C3%BCndo%C4%9Fan', ['gundogan', 'ilkay gundogan']],
    ['Antonio Rüdiger', null, ['rudiger']],
    ['Marc-André ter Stegen', null, ['ter stegen']],
    ['Jan Oblak'],
    ['Gianluigi Donnarumma'],
    ['Mike Maignan'],
    ['William Saliba'],
    ['Joško Gvardiol', null, ['josko gvardiol']],
    ['Alphonso Davies'],
    ['Theo Hernandez'],
    ['Kyle Walker'],
    ['João Cancelo', null, ['joao cancelo']],
    ['Dani Carvajal'],
    ['Jordi Alba'],
    ['Álvaro Morata'],
    ['Raphinha'],
    ['Rodrygo'],
    ['Gabriel Jesus'],
    ['Casemiro'],
    ['Bruno Guimarães', null, ['bruno guimaraes']],
    ['Lucas Paquetá', null, ['paqueta']],
    ['Alexis Mac Allister', null, ['mac allister', 'macallister', 'alexis macallister']],
    ['Enzo Fernández', null, ['enzo fernandez', 'enzo']],
    ['Cole Palmer'],
    ['Alexander Isak'],
    ['Darwin Núñez', null, ['darwin nunez', 'nunez']],
    ['Khvicha Kvaratskhelia', null, ['kvara', 'kvaratskhelia']],
    ['Dominik Szoboszlai'],
    ['Kim Min-jae', null, ['kim min jae', 'min jae', 'minjae']],
    ['Alessandro Bastoni'],
    ['Ronald Araújo', null, ['ronald araujo']],
    ['Christian Pulisic'],
    ['Alexis Sánchez', null, ['alexis sanchez']],
    ['James Rodríguez', null, ['james rodriguez']],
    ['Radamel Falcao'],
    ['Pierre-Emerick Aubameyang', null, ['pierre emerick aubameyang']],
    ['Kalidou Koulibaly'],
    ['Thomas Partey'],
    ['Edouard Mendy'],
    ['Yassine Bounou', null, ['bono']],
    ['Takefusa Kubo'],
    ['Kaoru Mitoma'],
    ['Mohamed Elneny', null, ['el neny']],
    ['Essam El-Hadary', null, ['el hadary', 'elhadary', 'hadary']],
    ['Mido', 'Mido_(footballer)'],
    ['Mohamed Zidan'],
    ['Hossam Hassan'],
    ['Gerd Müller', null, ['gerd muller']],
    ['Eusébio'],
    ['Michel Platini'],
    ['Lothar Matthäus', null, ['matthaus', 'lothar matthaus']],
    ['Paul Gascoigne', null, ['gazza']],
    ['Alan Shearer'],
    ['Gary Lineker'],
    ['Peter Schmeichel'],
    ['Edwin van der Sar', null, ['van der sar']],
    ['Lev Yashin'],
    ['Gabriel Batistuta'],
    ['Juan Román Riquelme', null, ['riquelme', 'roman riquelme', 'juan riquelme']],
    ['Pavel Nedvěd', null, ['nedved']],
    ['Andriy Shevchenko', null, ['sheva']],
    ['Hristo Stoichkov'],
    ['Luís Figo'],
    ['Rui Costa'],
    ['Patrick Vieira'],
    ['Claude Makélélé', null, ['makelele']],
    ['Didier Deschamps'],
    ['Zico'],
    ['Garrincha'],
    ['George Best'],
    ['Bobby Charlton'],
    ['Roy Keane'],
    ['Eric Cantona'],
    ['Ruud van Nistelrooy', null, ['van nistelrooy']],
    ['Gianfranco Zola'],
    ['Alessandro Nesta'],
    ['Franco Baresi'],
    ['Gennaro Gattuso'],
    ['Clarence Seedorf'],
    ['Ruud Gullit'],
    ['Frank Rijkaard'],
    ['Michael Laudrup'],
    ['Kenny Dalglish'],
    ['Roger Milla'],
    ['Jay-Jay Okocha', null, ['jay jay okocha', 'okocha', 'jayjay okocha']],
    ['Michael Essien']
  ];


  // الأسماء العربي (كل اسم ممكن يتكتب بأكتر من طريقة)
  const ARABIC = {
    'Lionel Messi': ['ليونيل ميسي', 'ميسي', 'ليو ميسي'],
    'Cristiano Ronaldo': ['كريستيانو رونالدو', 'رونالدو', 'كريستيانو', 'كرستيانو رونالدو'],
    'Neymar': ['نيمار', 'نيمار جونيور'],
    'Kylian Mbappé': ['كيليان مبابي', 'مبابي', 'كيليان امبابي', 'امبابي'],
    'Erling Haaland': ['إيرلينج هالاند', 'هالاند', 'ايرلينج هالاند', 'هالند', 'إرلينغ هالاند'],
    'Mohamed Salah': ['محمد صلاح', 'صلاح', 'مو صلاح'],
    'Kevin De Bruyne': ['كيفين دي بروين', 'دي بروين', 'كيفن دي بروين', 'دى بروين'],
    'Robert Lewandowski': ['روبرت ليفاندوفسكي', 'ليفاندوفسكي', 'ليفا', 'ليفاندوسكي'],
    'Luka Modrić': ['لوكا مودريتش', 'مودريتش', 'مودريش'],
    'Karim Benzema': ['كريم بنزيما', 'بنزيما'],
    'Harry Kane': ['هاري كين', 'كين'],
    'Vinícius Júnior': ['فينيسيوس جونيور', 'فينيسيوس', 'فيني', 'فينسيوس'],
    'Jude Bellingham': ['جود بيلينجهام', 'بيلينجهام', 'جود بيلنغهام', 'بيلينغهام'],
    'Antoine Griezmann': ['أنطوان جريزمان', 'جريزمان', 'انطوان غريزمان', 'غريزمان'],
    'Sergio Ramos': ['سيرجيو راموس', 'راموس', 'سيرخيو راموس'],
    'Virgil van Dijk': ['فيرجيل فان دايك', 'فان دايك', 'فيرجل فان دايك'],
    'Manuel Neuer': ['مانويل نوير', 'نوير'],
    'Thibaut Courtois': ['تيبو كورتوا', 'كورتوا'],
    'Zinedine Zidane': ['زين الدين زيدان', 'زيدان', 'زيزو'],
    'Ronaldinho': ['رونالدينيو', 'رونالدينهو'],
    'Ronaldo Nazário': ['رونالدو نازاريو', 'رونالدو الظاهرة', 'الظاهرة', 'رونالدو', 'نازاريو'],
    'Pelé': ['بيليه', 'بيلي'],
    'Diego Maradona': ['دييجو مارادونا', 'مارادونا', 'دييغو مارادونا', 'ماردونا'],
    'Johan Cruyff': ['يوهان كرويف', 'كرويف', 'كرايف'],
    'Franz Beckenbauer': ['فرانز بيكنباور', 'بيكنباور', 'بكنباور'],
    'Zlatan Ibrahimović': ['زلاتان إبراهيموفيتش', 'زلاتان', 'ابراهيموفيتش'],
    'Thierry Henry': ['تييري هنري', 'هنري', 'تيري هنري'],
    'David Beckham': ['ديفيد بيكهام', 'بيكهام', 'بكهام'],
    'Wayne Rooney': ['واين روني', 'روني'],
    'Steven Gerrard': ['ستيفن جيرارد', 'جيرارد', 'ستيفين جيرارد'],
    'Frank Lampard': ['فرانك لامبارد', 'لامبارد'],
    'Paul Scholes': ['بول سكولز', 'سكولز'],
    'Ryan Giggs': ['ريان جيجز', 'جيجز', 'رايان جيجز', 'جيغز'],
    'Xavi': ['تشافي', 'تشافي هرنانديز', 'شافي'],
    'Andrés Iniesta': ['أندريس إنييستا', 'إنييستا', 'انييستا', 'إنيستا', 'انيستا'],
    'Iker Casillas': ['إيكر كاسياس', 'كاسياس', 'ايكر كاسياس'],
    'Carles Puyol': ['كارليس بويول', 'بويول', 'كارلوس بويول'],
    'Gerard Piqué': ['جيرارد بيكيه', 'بيكيه', 'بيكي'],
    'Sergio Busquets': ['سيرجيو بوسكتس', 'بوسكتس', 'بوسكيتس'],
    'Luis Suárez': ['لويس سواريز', 'سواريز', 'سوارز'],
    'Edinson Cavani': ['إدينسون كافاني', 'كافاني', 'ادينسون كافاني'],
    'Sergio Agüero': ['سيرجيو أجويرو', 'أجويرو', 'كون أجويرو', 'اغويرو'],
    'Ángel Di María': ['أنخيل دي ماريا', 'دي ماريا', 'دى ماريا'],
    'Paulo Dybala': ['باولو ديبالا', 'ديبالا'],
    'Lautaro Martínez': ['لاوتارو مارتينيز', 'لاوتارو', 'مارتينيز'],
    'Julián Álvarez': ['خوليان ألفاريز', 'ألفاريز', 'جوليان ألفاريز'],
    'Rodri': ['رودري'],
    'Phil Foden': ['فيل فودين', 'فودين'],
    'Bukayo Saka': ['بوكايو ساكا', 'ساكا'],
    'Declan Rice': ['ديكلان رايس', 'رايس'],
    'Trent Alexander-Arnold': ['ترينت ألكسندر أرنولد', 'ألكسندر أرنولد', 'ترينت', 'أرنولد'],
    'Marcus Rashford': ['ماركوس راشفورد', 'راشفورد'],
    'Bruno Fernandes': ['برونو فيرنانديز', 'برونو فرنانديز', 'فيرنانديز', 'فرنانديز'],
    'Bernardo Silva': ['برناردو سيلفا', 'برنادو سيلفا', 'برناردو', 'سيلفا'],
    'Rúben Dias': ['روبين دياز', 'دياز', 'روبن دياز'],
    'João Félix': ['جواو فيليكس', 'فيليكس', 'جاو فيليكس'],
    'Rafael Leão': ['رافاييل لياو', 'لياو', 'رافائيل لياو', 'ليو'],
    'Son Heung-min': ['سون هيونج مين', 'سون', 'هيونج مين سون', 'سون هيونغ مين'],
    'Sadio Mané': ['ساديو ماني', 'ماني'],
    'Riyad Mahrez': ['رياض محرز', 'محرز'],
    'Achraf Hakimi': ['أشرف حكيمي', 'حكيمي'],
    'Hakim Ziyech': ['حكيم زياش', 'زياش'],
    'Victor Osimhen': ['فيكتور أوسيمين', 'أوسيمين', 'اوسمين'],
    'Didier Drogba': ['ديدييه دروجبا', 'دروجبا', 'دروغبا', 'ديديه دروجبا'],
    "Samuel Eto'o": ['صامويل إيتو', 'إيتو', 'ايتو'],
    'George Weah': ['جورج ويا', 'ويا', 'وياه'],
    'Yaya Touré': ['يايا توريه', 'توريه', 'يحيى توريه'],
    'Mohamed Aboutrika': ['محمد أبوتريكة', 'أبو تريكة', 'أبوتريكة', 'تريكة', 'ابو تريكه'],
    'Omar Marmoush': ['عمر مرموش', 'مرموش'],
    'Kaká': ['كاكا', 'ريكاردو كاكا'],
    'Roberto Carlos': ['روبرتو كارلوس', 'روبيرتو كارلوس', 'كارلوس'],
    'Cafu': ['كافو'],
    'Rivaldo': ['ريفالدو'],
    'Romário': ['روماريو'],
    'Gianluigi Buffon': ['جانلويجي بوفون', 'بوفون', 'جيجي بوفون'],
    'Paolo Maldini': ['باولو مالديني', 'مالديني'],
    'Andrea Pirlo': ['أندريا بيرلو', 'بيرلو'],
    'Francesco Totti': ['فرانشيسكو توتي', 'توتي'],
    'Alessandro Del Piero': ['أليساندرو ديل بييرو', 'ديل بييرو', 'ديل بيرو'],
    'Fabio Cannavaro': ['فابيو كانافارو', 'كانافارو'],
    'Roberto Baggio': ['روبرتو باجيو', 'باجيو', 'روبيرتو باجيو'],
    'Marco van Basten': ['ماركو فان باستن', 'فان باستن'],
    'Dennis Bergkamp': ['دينيس بيركامب', 'بيركامب'],
    'Arjen Robben': ['آريين روبن', 'روبن', 'اريين روبن'],
    'Robin van Persie': ['روبين فان بيرسي', 'فان بيرسي'],
    'Wesley Sneijder': ['ويسلي سنايدر', 'سنايدر', 'شنايدر'],
    'Michael Ballack': ['مايكل بالاك', 'بالاك'],
    'Philipp Lahm': ['فيليب لام', 'لام'],
    'Thomas Müller': ['توماس مولر', 'مولر'],
    'Toni Kroos': ['توني كروس', 'كروس'],
    'Mesut Özil': ['مسعود أوزيل', 'أوزيل'],
    'Miroslav Klose': ['ميروسلاف كلوزه', 'كلوزه', 'كلوزي'],
    'Bastian Schweinsteiger': ['باستيان شفاينشتايجر', 'شفاينشتايجر', 'شفاينشتايغر'],
    'Eden Hazard': ['إيدين هازارد', 'هازارد', 'ايدن هازارد'],
    'Romelu Lukaku': ['روميلو لوكاكو', 'لوكاكو'],
    'Thiago Silva': ['تياجو سيلفا', 'تيجو سيلفا', 'تياغو سيلفا', 'سيلفا'],
    'Dani Alves': ['داني ألفيس', 'ألفيس', 'داني الفيس'],
    'Gareth Bale': ['جاريث بيل', 'بيل', 'غاريث بيل'],
    'Raheem Sterling': ['رحيم ستيرلينج', 'ستيرلينج', 'سترلينج'],
    'Alisson': ['أليسون', 'أليسون بيكر', 'اليسون'],

    'Lamine Yamal': ['لامين يامال', 'يامال', 'لامين جمال'],
    'Pedri': ['بيدري'],
    'Gavi': ['جافي', 'غافي'],
    'Frenkie de Jong': ['فرانكي دي يونج', 'دي يونج', 'فرينكي دي يونغ', 'دي يونغ'],
    'Martin Ødegaard': ['مارتن أوديجارد', 'أوديجارد', 'اوديغارد', 'مارتن اوديغارد'],
    'Federico Valverde': ['فيديريكو فالفيردي', 'فالفيردي', 'فالفيردى'],
    'Aurélien Tchouaméni': ['أوريليان تشواميني', 'تشواميني', 'تشوامينى'],
    'Eduardo Camavinga': ['إدواردو كامافينجا', 'كامافينجا', 'كامافينغا'],
    'Florian Wirtz': ['فلوريان فيرتز', 'فيرتز'],
    'Jamal Musiala': ['جمال موسيالا', 'موسيالا'],
    'Joshua Kimmich': ['جوشوا كيميتش', 'كيميتش', 'كيميش'],
    'Leroy Sané': ['ليروي ساني', 'ساني'],
    'Kai Havertz': ['كاي هافرتز', 'هافرتز'],
    'Serge Gnabry': ['سيرج نابري', 'نابري', 'غنابري'],
    'İlkay Gündoğan': ['إيلكاي جوندوجان', 'جوندوجان', 'غوندوغان', 'جندوغان'],
    'Antonio Rüdiger': ['أنطونيو روديجر', 'روديجر', 'روديغر'],
    'Marc-André ter Stegen': ['مارك أندريه تير شتيجن', 'تير شتيجن', 'تير شتيغن'],
    'Jan Oblak': ['يان أوبلاك', 'أوبلاك'],
    'Gianluigi Donnarumma': ['جانلويجي دوناروما', 'دوناروما', 'دونناروما'],
    'Mike Maignan': ['مايك ميينيان', 'ميينيان', 'مانيان'],
    'William Saliba': ['ويليام ساليبا', 'ساليبا'],
    'Joško Gvardiol': ['يوشكو جفارديول', 'جفارديول', 'غفارديول'],
    'Alphonso Davies': ['ألفونسو ديفيز', 'ديفيز'],
    'Theo Hernandez': ['ثيو هيرنانديز', 'ثيو هرنانديز', 'هيرنانديز'],
    'Kyle Walker': ['كايل ووكر', 'ووكر'],
    'João Cancelo': ['جواو كانسيلو', 'كانسيلو'],
    'Dani Carvajal': ['داني كارفاخال', 'كارفاخال', 'كارفاجال'],
    'Jordi Alba': ['جوردي ألبا', 'ألبا', 'البا'],
    'Álvaro Morata': ['ألفارو موراتا', 'موراتا'],
    'Raphinha': ['رافينيا', 'رافينها'],
    'Rodrygo': ['رودريجو', 'رودريغو'],
    'Gabriel Jesus': ['جابرييل جيسوس', 'جيسوس', 'غابرييل جيسوس'],
    'Casemiro': ['كاسيميرو'],
    'Bruno Guimarães': ['برونو جيمارايش', 'جيمارايس', 'برونو جيمارايس'],
    'Lucas Paquetá': ['لوكاس باكيتا', 'باكيتا'],
    'Alexis Mac Allister': ['أليكسيس ماك أليستر', 'ماك أليستر', 'ماكاليستر'],
    'Enzo Fernández': ['إنزو فرنانديز', 'إنزو', 'انزو فيرنانديز'],
    'Cole Palmer': ['كول بالمر', 'بالمر'],
    'Alexander Isak': ['ألكسندر إيزاك', 'إيزاك', 'اسحاق'],
    'Darwin Núñez': ['داروين نونيز', 'نونيز'],
    'Khvicha Kvaratskhelia': ['خفيتشا كفاراتسخيليا', 'كفاراتسخيليا', 'كفارادونا'],
    'Dominik Szoboszlai': ['دومينيك سوبوسلاي', 'سوبوسلاي'],
    'Kim Min-jae': ['كيم مين جاي', 'كيم مين جيه', 'كيم'],
    'Alessandro Bastoni': ['أليساندرو باستوني', 'باستوني'],
    'Ronald Araújo': ['رونالد أراوخو', 'أراوخو', 'اراوخو'],
    'Christian Pulisic': ['كريستيان بوليسيتش', 'بوليسيتش', 'بوليسيك'],
    'Alexis Sánchez': ['أليكسيس سانشيز', 'سانشيز', 'سانشيس'],
    'James Rodríguez': ['خاميس رودريجيز', 'خاميس', 'جيمس رودريجيز'],
    'Radamel Falcao': ['راداميل فالكاو', 'فالكاو'],
    'Pierre-Emerick Aubameyang': ['بيير إيمريك أوباميانج', 'أوباميانج', 'أوبامييانغ', 'أوباميانغ'],
    'Kalidou Koulibaly': ['كاليدو كوليبالي', 'كوليبالي'],
    'Thomas Partey': ['توماس بارتي', 'بارتي'],
    'Edouard Mendy': ['إدوارد مندي', 'مندي'],
    'Yassine Bounou': ['ياسين بونو', 'بونو'],
    'Takefusa Kubo': ['تاكيفوسا كوبو', 'كوبو'],
    'Kaoru Mitoma': ['كاورو ميتوما', 'ميتوما'],
    'Mohamed Elneny': ['محمد النني', 'النني'],
    'Essam El-Hadary': ['عصام الحضري', 'الحضري'],
    'Mido': ['ميدو', 'أحمد حسام ميدو', 'احمد حسام'],
    'Mohamed Zidan': ['محمد زيدان', 'زيدان'],
    'Hossam Hassan': ['حسام حسن', 'العميد حسام حسن'],
    'Gerd Müller': ['جيرد مولر', 'جرد مولر'],
    'Eusébio': ['أوزيبيو', 'يوزيبيو', 'اوزبيو'],
    'Michel Platini': ['ميشيل بلاتيني', 'بلاتيني'],
    'Lothar Matthäus': ['لوثار ماتيوس', 'ماتيوس'],
    'Paul Gascoigne': ['بول جاسكوين', 'جاسكوين', 'جازا'],
    'Alan Shearer': ['آلان شيرر', 'شيرر'],
    'Gary Lineker': ['جاري لينيكر', 'لينيكر'],
    'Peter Schmeichel': ['بيتر شمايكل', 'شمايكل'],
    'Edwin van der Sar': ['إدوين فان دير سار', 'فان دير سار'],
    'Lev Yashin': ['ليف ياشين', 'ياشين', 'العنكبوت الأسود'],
    'Gabriel Batistuta': ['جابرييل باتيستوتا', 'باتيستوتا', 'باتي جول'],
    'Juan Román Riquelme': ['خوان رومان ريكيلمي', 'ريكيلمي', 'ريكلمي'],
    'Pavel Nedvěd': ['بافل نيدفيد', 'نيدفيد'],
    'Andriy Shevchenko': ['أندريه شيفتشينكو', 'شيفشينكو', 'شيفتشينكو'],
    'Hristo Stoichkov': ['هريستو ستويتشكوف', 'ستويتشكوف'],
    'Luís Figo': ['لويس فيجو', 'فيجو', 'فيغو'],
    'Rui Costa': ['روي كوستا', 'كوستا'],
    'Patrick Vieira': ['باتريك فييرا', 'فييرا', 'فيرا'],
    'Claude Makélélé': ['كلود ماكيليلي', 'ماكيليلي', 'ماكلالي'],
    'Didier Deschamps': ['ديدييه ديشامب', 'ديشامب'],
    'Zico': ['زيكو'],
    'Garrincha': ['جارينشا', 'غارينشا'],
    'George Best': ['جورج بست', 'بست'],
    'Bobby Charlton': ['بوبي تشارلتون', 'تشارلتون'],
    'Roy Keane': ['روي كين'],
    'Eric Cantona': ['إريك كانتونا', 'كانتونا'],
    'Ruud van Nistelrooy': ['رود فان نيستلروي', 'فان نيستلروي', 'نيستلروي'],
    'Gianfranco Zola': ['جيانفرانكو زولا', 'زولا'],
    'Alessandro Nesta': ['أليساندرو نيستا', 'نيستا'],
    'Franco Baresi': ['فرانكو باريزي', 'باريزي', 'باريسي'],
    'Gennaro Gattuso': ['جينارو جاتوزو', 'جاتوزو', 'غاتوزو'],
    'Clarence Seedorf': ['كلارنس سيدورف', 'سيدورف'],
    'Ruud Gullit': ['رود خوليت', 'خوليت', 'جوليت'],
    'Frank Rijkaard': ['فرانك ريكارد', 'ريكارد'],
    'Michael Laudrup': ['مايكل لاودروب', 'لاودروب'],
    'Kenny Dalglish': ['كيني دالجليش', 'دالجليش'],
    'Roger Milla': ['روجيه ميلا', 'ميلا', 'روجر ميلا'],
    'Jay-Jay Okocha': ['جاي جاي أوكوشا', 'أوكوشا', 'اوكوتشا', 'جاي جاي اوكوتشا'],
    'Michael Essien': ['مايكل إيسيان', 'إيسيان', 'ايسين']
  };

  // تنضيف النص: حروف صغيرة، من غير تشكيل أو علامات (عربي وإنجليزي)
  function norm(text) {
    return String(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f\u064B-\u065F\u0670\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .toLowerCase()
      .replace(/[^a-z0-9ء-ي ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const PLAYERS = RAW_PLAYERS.map(([name, wiki, alias]) => {
    const key = norm(name);
    return {
      name,
      wiki: wiki || name.replace(/ /g, '_'),
      key,
      words: key.split(' '),
      alias: (alias || []).concat(ARABIC[name] || []).map(norm),
      accept: null,
      photo: undefined
    };
  });

  // الاسم الأخير بس بيتقبل لو مفيش لاعب تاني بنفس الاسم الأخير
  const lastWordCount = {};
  PLAYERS.forEach(p => {
    const last = p.words[p.words.length - 1];
    lastWordCount[last] = (lastWordCount[last] || 0) + 1;
  });

  PLAYERS.forEach(p => {
    const accept = new Set([p.key, ...p.alias]);
    const last = p.words[p.words.length - 1];
    if (lastWordCount[last] === 1) accept.add(last);
    p.accept = accept;
    p.search = [p.key, ...p.alias];
  });

  // ---------- عناصر الصفحة ----------

  const $ = id => document.getElementById(id);

  const introPanel = $('p90Intro');
  const playPanel = $('p90Play');
  const resultPanel = $('p90Result');

  const startBtn = $('p90Start');
  const againBtn = $('p90Again');
  const skipBtn = $('p90Skip');

  const photoBox = $('p90Photo');
  const imgEl = $('p90Img');
  const timerEl = $('p90Timer');
  const ringEl = $('p90Ring');
  const timeEl = $('p90Time');
  const scoreEl = $('p90Score');
  const feedbackEl = $('p90Feedback');
  const formEl = $('p90Form');
  const inputEl = $('p90Input');
  const suggestEl = $('p90Suggest');
  const confirmBtn = $('p90Confirm');

  const resultScoreEl = $('p90ResultScore');
  const resultLabelEl = $('p90ResultLabel');
  const resultKickerEl = $('p90ResultKicker');
  const bestEl = $('p90Best');
  const chipsEl = $('p90Chips');


  // ---------- صفارة الحكم ----------

  let audioCtx = null;

  // لازم يتفعّل بعد ضغطة من المستخدم (قيود المتصفحات)
  function unlockAudio() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (error) {}
  }

  // نفخة صفارة واحدة: نغمة عالية + ترعيش سريع زي صفارة الحكم
  function blast(start, duration) {
    const ctx = audioCtx;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, start);
    master.gain.exponentialRampToValueAtTime(0.5, start + 0.02);
    master.gain.setValueAtTime(0.5, start + duration - 0.06);
    master.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    master.connect(ctx.destination);

    // الترعيش (الـ trill) اللي بيميّز صفارة الحكم
    const trill = ctx.createGain();
    trill.gain.value = 0.6;
    trill.connect(master);

    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = 32;
    lfoDepth.gain.value = 0.4;
    lfo.connect(lfoDepth);
    lfoDepth.connect(trill.gain);

    // نغمتين قريبين من بعض + اهتزاز بسيط في الدرجة
    [2850, 3150].forEach(freq => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.linearRampToValueAtTime(freq * 1.03, start + duration);
      osc.connect(trill);
      osc.start(start);
      osc.stop(start + duration + 0.05);
    });

    lfo.start(start);
    lfo.stop(start + duration + 0.05);
  }

  // صفارة النهاية: نفختين قصار ونفخة طويلة
  function playWhistle() {
    unlockAudio();
    if (!audioCtx) return;

    const t = audioCtx.currentTime + 0.05;
    blast(t, 0.28);
    blast(t + 0.4, 0.28);
    blast(t + 0.8, 1.0);
  }

  // ---------- حالة اللعبة ----------

  let running = false;
  let loading = true;
  let remaining = GAME_SECONDS;
  let lastTs = 0;
  let tickId = null;

  let score = 0; // النقاط (10 لكل لاعب صح)
  let answered = [];
  let current = null;

  let deck = [];
  let deckIndex = 0;
  let ready = [];
  let pending = 0;
  let failedInRow = 0;
  let waitingForPlayer = false;
  let sessionId = 0;

  let suggestions = [];
  let activeIndex = -1;
  let feedbackTimer = null;

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function showPanel(panel) {
    [introPanel, playPanel, resultPanel].forEach(p => {
      p.hidden = p !== panel;
    });
  }

  // ---------- تحميل الصور ----------

  function preload(url) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  }

  async function fetchPhoto(player) {
    if (player.photo !== undefined) return player.photo;

    let url = null;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(
        WIKI_SUMMARY + encodeURIComponent(player.wiki),
        { signal: controller.signal }
      );

      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const source = data && data.thumbnail && data.thumbnail.source;
        if (source) url = await preload(source);
      }
    } catch (error) {
      url = null;
    }

    player.photo = url;
    return url;
  }

  function nextFromDeck() {
    if (deckIndex >= deck.length) {
      deck = shuffle(PLAYERS.filter(p => p.photo !== null));
      deckIndex = 0;
    }

    return deck[deckIndex++] || null;
  }

  // بيجهز كام لاعب قدام عشان الانتقال يبقى سريع
  function pump() {
    const id = sessionId;

    while (running && pending + ready.length < QUEUE_AHEAD) {
      const player = nextFromDeck();
      if (!player) break;

      pending++;

      fetchPhoto(player).then(url => {
        if (id !== sessionId) return;

        pending--;

        if (url) {
          failedInRow = 0;
          ready.push(player);

          if (waitingForPlayer) {
            waitingForPlayer = false;
            showNextPlayer();
          }
        } else {
          failedInRow++;

          if (failedInRow >= MAX_FAILS_IN_ROW && !current) {
            loadError();
            return;
          }
        }

        pump();
      });
    }
  }

  function loadError() {
    running = false;
    clearInterval(tickId);
    sessionId++;

    showPanel(resultPanel);
    resultKickerEl.textContent = 'في مشكلة';
    resultScoreEl.textContent = '😕';
    resultLabelEl.textContent = 'مقدرتش أحمّل صور اللاعبين';
    bestEl.textContent = 'اتأكد من الإنترنت وجرب تاني';
    chipsEl.innerHTML = '';
  }

  // ---------- عرض اللاعب ----------

  function showNextPlayer() {
    if (!running) return;

    if (!ready.length) {
      loading = true;
      waitingForPlayer = true;
      photoBox.classList.add('loading');
      pump();
      return;
    }

    current = ready.shift();
    loading = false;
    waitingForPlayer = false;

    imgEl.src = current.photo;
    photoBox.classList.remove('loading');

    inputEl.value = '';
    hideSuggestions();
    inputEl.focus({ preventScroll: true });

    pump();
  }

  // ---------- العداد ----------

  function renderTimer() {
    const seconds = Math.max(0, Math.ceil(remaining));
    timeEl.textContent = seconds;

    const used = 1 - remaining / GAME_SECONDS;
    ringEl.style.strokeDashoffset = String(RING_LENGTH * used);

    timerEl.classList.toggle('low', remaining <= 10);
  }

  function tick() {
    const now = performance.now();
    const dt = (now - lastTs) / 1000;
    lastTs = now;

    if (!running) return;

    // الوقت بيقف لو الصفحة مخفية أو الصورة لسه بتتحمل
    if (document.hidden || loading) return;

    remaining = Math.max(0, remaining - dt);
    renderTimer();

    if (remaining <= 0) endGame();
  }

  // ---------- الإجابات ----------

  function showFeedback(text, type) {
    clearTimeout(feedbackTimer);
    feedbackEl.textContent = text;
    feedbackEl.className = 'p90-feedback ' + type;

    feedbackTimer = setTimeout(() => {
      feedbackEl.textContent = '';
      feedbackEl.className = 'p90-feedback';
    }, 900);
  }

  // فرق حرف واحد بس (للأسماء الطويلة)
  function withinOneEdit(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;

    let i = 0;
    let j = 0;
    let edits = 0;

    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) {
        i++;
        j++;
        continue;
      }

      edits++;
      if (edits > 1) return false;

      if (a.length > b.length) i++;
      else if (a.length < b.length) j++;
      else {
        i++;
        j++;
      }
    }

    return edits + (a.length - i) + (b.length - j) <= 1;
  }

  function isCorrect(player, answer) {
    if (player.accept.has(answer)) return true;
    if (answer.length < 6) return false;

    for (const option of player.accept) {
      if (option.length >= 6 && withinOneEdit(answer, option)) return true;
    }

    return false;
  }

  function submitAnswer(value) {
    if (!running || loading || !current) return;

    const answer = norm(value);
    if (!answer) return;

    if (isCorrect(current, answer)) {
      score += POINTS_PER_PLAYER;
      answered.push(current.name);
      scoreEl.textContent = score;
      showFeedback('✔ ' + current.name + ' +' + POINTS_PER_PLAYER, 'ok');
      showNextPlayer();
    } else {
      showFeedback('✖ مش هو، جرب تاني', 'bad');

      formEl.classList.remove('shake');
      void formEl.offsetWidth;
      formEl.classList.add('shake');

      inputEl.value = '';
      hideSuggestions();
      inputEl.focus({ preventScroll: true });
    }
  }

  // ---------- الاقتراحات ----------

  // الاقتراحات دايمًا بالإنجليزي، حتى لو الكتابة بالعربي
  function findSuggestions(query) {
    const q = norm(query);
    if (q.length < 2) return [];

    const starts = [];
    const contains = [];

    PLAYERS.forEach(p => {
      let rank = 9;

      for (const text of p.search) {
        if (text.startsWith(q)) {
          rank = 0;
          break;
        }

        if (
          rank > 1 &&
          (text.split(' ').some(w => w.startsWith(q)) || text.includes(' ' + q))
        ) {
          rank = 1;
        }
      }

      if (rank === 0) starts.push(p);
      else if (rank === 1) contains.push(p);
    });

    return starts.concat(contains).slice(0, 8);
  }

  function updateConfirm() {
    if (confirmBtn) confirmBtn.disabled = !inputEl.value.trim();
  }

  // الضغط على اقتراح بيكتب الاسم في الخانة، وبعدها تدوس تأكيد
  function pickSuggestion(player) {
    inputEl.value = player.name;
    hideSuggestions();
    inputEl.focus({ preventScroll: true });
  }

  function hideSuggestions() {
    suggestions = [];
    activeIndex = -1;
    suggestEl.innerHTML = '';
    suggestEl.hidden = true;
    updateConfirm();
  }

  function renderSuggestions() {
    suggestEl.innerHTML = '';

    if (!suggestions.length) {
      suggestEl.hidden = true;
      return;
    }

    suggestions.forEach((player, index) => {
      const li = document.createElement('li');
      const button = document.createElement('button');

      button.type = 'button';
      button.textContent = player.name;
      button.className = index === activeIndex ? 'active' : '';
      button.setAttribute('role', 'option');

      // نمنع الزرار ياخد الفوكس عشان الكيبورد ما يقفلش
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('mousedown', event => event.preventDefault());

      button.addEventListener('click', () => {
        pickSuggestion(player);
      });

      li.appendChild(button);
      suggestEl.appendChild(li);
    });

    suggestEl.hidden = false;
  }

  inputEl.addEventListener('input', () => {
    updateConfirm();
    suggestions = findSuggestions(inputEl.value);
    activeIndex = -1;
    renderSuggestions();
  });

  inputEl.addEventListener('keydown', event => {
    if (!suggestions.length) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % suggestions.length;
      renderSuggestions();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + suggestions.length) % suggestions.length;
      renderSuggestions();
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      pickSuggestion(suggestions[activeIndex]);
    }
  });

  formEl.addEventListener('submit', event => {
    event.preventDefault();
    submitAnswer(inputEl.value);
  });

  skipBtn.addEventListener('click', () => {
    if (!running || loading) return;
    showNextPlayer();
  });

  // ---------- بداية ونهاية اللعبة ----------

  function startGame() {
    unlockAudio();
    sessionId++;

    running = true;
    loading = true;
    remaining = GAME_SECONDS;
    score = 0;
    answered = [];
    current = null;

    deck = shuffle(PLAYERS);
    deckIndex = 0;
    ready = [];
    pending = 0;
    failedInRow = 0;
    waitingForPlayer = true;

    scoreEl.textContent = '0';
    feedbackEl.textContent = '';
    feedbackEl.className = 'p90-feedback';
    inputEl.value = '';
    hideSuggestions();

    imgEl.removeAttribute('src');
    photoBox.classList.add('loading');
    renderTimer();

    showPanel(playPanel);

    lastTs = performance.now();
    clearInterval(tickId);
    tickId = setInterval(tick, 100);

    pump();
  }

  // النقاط بتتضاف لمجموع النقاط الكلي (نفس مفتاح باقي الألعاب)
  function saveStats() {
    let stats = {};

    try {
      stats = JSON.parse(localStorage.getItem('koraChallengeStats') || '{}');
    } catch (error) {
      stats = {};
    }

    stats.gamesPlayed = (Number(stats.gamesPlayed) || 0) + 1;
    stats.totalPoints = (Number(stats.totalPoints) || 0) + score;

    try {
      localStorage.setItem('koraChallengeStats', JSON.stringify(stats));
    } catch (error) {}
  }

  function endGame() {
    if (!running) return;

    running = false;
    sessionId++;
    clearInterval(tickId);
    inputEl.blur();
    hideSuggestions();

    let best = 0;

    try {
      best = Number(localStorage.getItem('koraPlayers90Best')) || 0;
    } catch (error) {}

    const isRecord = score > best;

    if (isRecord) {
      best = score;

      try {
        localStorage.setItem('koraPlayers90Best', String(best));
      } catch (error) {}
    }

    saveStats();

    playWhistle();

    const playersCount = answered.length;

    resultKickerEl.textContent = 'انتهى الوقت';
    resultScoreEl.textContent = score;
    resultLabelEl.textContent = 'نقطة (' + playersCount + ' لاعب) في 90 ثانية';
    bestEl.textContent = isRecord && score > 0
      ? '🔥 رقم قياسي جديد!'
      : 'أفضل نتيجة ليك: ' + best + ' نقطة';

    chipsEl.innerHTML = '';
    answered.forEach(name => {
      const chip = document.createElement('span');
      chip.textContent = name;
      chipsEl.appendChild(chip);
    });

    showPanel(resultPanel);
  }

  startBtn.addEventListener('click', startGame);
  againBtn.addEventListener('click', startGame);

  document.addEventListener('visibilitychange', () => {
    lastTs = performance.now();
  });
})();
