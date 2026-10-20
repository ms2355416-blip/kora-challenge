// =====================================
// لعبة: كام لاعب تقدر تجيب في 60 ثانية
// =====================================

(() => {
  'use strict';

  const GAME_SECONDS = 60;
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
    ['Alisson', 'Alisson_Becker', ['alisson becker']]
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
    'Alisson': ['أليسون', 'أليسون بيكر', 'اليسون']
  };

  // تنضيف النص: حروف صغيرة، من غير تشكيل أو علامات (عربي وإنجليزي)
  function norm(text) {
    return String(text)
      .normalize('NFD')
      .replace(/[̀-ًͯ-ٰٟـ]/g, '')
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

  const introPanel = $('p60Intro');
  const playPanel = $('p60Play');
  const resultPanel = $('p60Result');

  const startBtn = $('p60Start');
  const againBtn = $('p60Again');
  const skipBtn = $('p60Skip');

  const photoBox = $('p60Photo');
  const imgEl = $('p60Img');
  const timerEl = $('p60Timer');
  const ringEl = $('p60Ring');
  const timeEl = $('p60Time');
  const scoreEl = $('p60Score');
  const feedbackEl = $('p60Feedback');
  const formEl = $('p60Form');
  const inputEl = $('p60Input');
  const suggestEl = $('p60Suggest');
  const confirmBtn = $('p60Confirm');

  const resultScoreEl = $('p60ResultScore');
  const resultLabelEl = $('p60ResultLabel');
  const resultKickerEl = $('p60ResultKicker');
  const bestEl = $('p60Best');
  const chipsEl = $('p60Chips');

  // ---------- حالة اللعبة ----------

  let running = false;
  let loading = true;
  let remaining = GAME_SECONDS;
  let lastTs = 0;
  let tickId = null;

  let score = 0;
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
    feedbackEl.className = 'p60-feedback ' + type;

    feedbackTimer = setTimeout(() => {
      feedbackEl.textContent = '';
      feedbackEl.className = 'p60-feedback';
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
      score++;
      answered.push(current.name);
      scoreEl.textContent = score;
      showFeedback('✔ ' + current.name, 'ok');
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
    feedbackEl.className = 'p60-feedback';
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
      best = Number(localStorage.getItem('koraPlayers60Best')) || 0;
    } catch (error) {}

    const isRecord = score > best;

    if (isRecord) {
      best = score;

      try {
        localStorage.setItem('koraPlayers60Best', String(best));
      } catch (error) {}
    }

    saveStats();

    resultKickerEl.textContent = 'انتهى الوقت';
    resultScoreEl.textContent = score;
    resultLabelEl.textContent = 'لاعب في 60 ثانية';
    bestEl.textContent = isRecord && score > 0
      ? '🔥 رقم قياسي جديد!'
      : 'أفضل نتيجة ليك: ' + best;

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
