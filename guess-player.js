
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORAGE_STATS = "koraChallengeStats";
  const STORAGE_STREAK = "koraChallengeStreak";
  const STORAGE_THEME = "koraChallengeTheme";
  const STORAGE_LANGUAGE = "koraChallengeLanguage";
  const STORAGE_FAVORITE = "koraFavoriteTeam";

  const translations = {
    ar: {
      easy: "المستوى السهل",
      medium: "المستوى المتوسط",
      hard: "المستوى الصعب",
      impossible: "المستوى المستحيل",
      question: "السؤال",
      points: "النقاط",
      correct: "إجابة صحيحة! برافو يا نجم ⚽",
      wrong: "مش دي الإجابة، جرّب تاني!",
      revealed: "الإجابة الصحيحة:",
      hint: "💡 أظهر التلميح التالي",
      noHints: "مفيش تلميحات إضافية",
      answerPlaceholder: "اكتب اسم اللاعب...",
      streak: "أيام متتالية",
      quitTitle: "عايز تنسحب من التحدي؟",
      quitText: "تقدمك في الجولة دي مش هيتحسب كنتيجة نهائية.",
      continue: "كمّل التحدي",
      quit: "انسحب",
      continueTitle: "🔥 خلصت",
      continueText: "تحب تكمل وتزود المضاعف؟",
      result: "خلصت الجولة!",
      again: "العب تاني بنفس المستوى",
      levels: "اختيار مستوى تاني"
    },
    en: {
      easy: "Easy level",
      medium: "Medium level",
      hard: "Hard level",
      impossible: "Impossible level",
      question: "Question",
      points: "Points",
      correct: "Correct answer! Well done ⚽",
      wrong: "Not quite. Try again!",
      revealed: "Correct answer:",
      hint: "💡 Show next hint",
      noHints: "No more hints",
      answerPlaceholder: "Enter the player's name...",
      streak: "day streak",
      quitTitle: "Leave the challenge?",
      quitText: "Your current round won't be saved as a final result.",
      continue: "Keep playing",
      quit: "Leave",
      continueTitle: "🔥 Checkpoint reached",
      continueText: "Continue to increase your multiplier?",
      result: "Round complete!",
      again: "Play this level again",
      levels: "Choose another level"
    },
    fr: {
      easy: "Niveau facile",
      medium: "Niveau moyen",
      hard: "Niveau difficile",
      impossible: "Niveau impossible",
      question: "Question",
      points: "Points",
      correct: "Bonne réponse ! Bravo ⚽",
      wrong: "Pas tout à fait. Réessaie !",
      revealed: "Bonne réponse :",
      hint: "💡 Afficher l'indice suivant",
      noHints: "Plus d'indices",
      answerPlaceholder: "Écris le nom du joueur...",
      streak: "jours consécutifs",
      quitTitle: "Quitter le défi ?",
      quitText: "Cette manche ne sera pas enregistrée comme résultat final.",
      continue: "Continuer",
      quit: "Quitter",
      continueTitle: "🔥 Étape terminée",
      continueText: "Continuer pour augmenter le multiplicateur ?",
      result: "Manche terminée !",
      again: "Rejouer ce niveau",
      levels: "Choisir un autre niveau"
    },
    es: {
      easy: "Nivel fácil",
      medium: "Nivel medio",
      hard: "Nivel difícil",
      impossible: "Nivel imposible",
      question: "Pregunta",
      points: "Puntos",
      correct: "¡Respuesta correcta! ⚽",
      wrong: "No es esa. ¡Inténtalo otra vez!",
      revealed: "Respuesta correcta:",
      hint: "💡 Mostrar siguiente pista",
      noHints: "No hay más pistas",
      answerPlaceholder: "Escribe el nombre del jugador...",
      streak: "días seguidos",
      quitTitle: "¿Salir del desafío?",
      quitText: "Esta ronda no se guardará como resultado final.",
      continue: "Seguir jugando",
      quit: "Salir",
      continueTitle: "🔥 Etapa completada",
      continueText: "¿Continuar para aumentar el multiplicador?",
      result: "¡Ronda terminada!",
      again: "Jugar este nivel otra vez",
      levels: "Elegir otro nivel"
    },
    de: {
      easy: "Leicht",
      medium: "Mittel",
      hard: "Schwer",
      impossible: "Unmöglich",
      question: "Frage",
      points: "Punkte",
      correct: "Richtige Antwort! ⚽",
      wrong: "Leider falsch. Versuch es noch einmal!",
      revealed: "Richtige Antwort:",
      hint: "💡 Nächsten Hinweis zeigen",
      noHints: "Keine weiteren Hinweise",
      answerPlaceholder: "Spielernamen eingeben...",
      streak: "Tage in Folge",
      quitTitle: "Herausforderung verlassen?",
      quitText: "Diese Runde wird nicht als Endergebnis gespeichert.",
      continue: "Weiterspielen",
      quit: "Verlassen",
      continueTitle: "🔥 Etappe geschafft",
      continueText: "Weiter für einen höheren Multiplikator?",
      result: "Runde beendet!",
      again: "Diese Stufe erneut spielen",
      levels: "Andere Stufe wählen"
    },
    ru: {
      easy: "Лёгкий уровень",
      medium: "Средний уровень",
      hard: "Сложный уровень",
      impossible: "Невозможный уровень",
      question: "Вопрос",
      points: "Очки",
      correct: "Правильный ответ! ⚽",
      wrong: "Неправильно. Попробуй ещё!",
      revealed: "Правильный ответ:",
      hint: "💡 Следующая подсказка",
      noHints: "Подсказок больше нет",
      answerPlaceholder: "Введите имя игрока...",
      streak: "дней подряд",
      quitTitle: "Выйти из испытания?",
      quitText: "Текущий раунд не будет сохранён как итоговый результат.",
      continue: "Продолжить",
      quit: "Выйти",
      continueTitle: "🔥 Этап завершён",
      continueText: "Продолжить ради увеличения множителя?",
      result: "Раунд завершён!",
      again: "Играть снова",
      levels: "Выбрать другой уровень"
    },
    ku: {
      easy: "ئاستی ئاسان",
      medium: "ئاستی مامناوەند",
      hard: "ئاستی قورس",
      impossible: "ئاستی مەحاڵ",
      question: "پرسیار",
      points: "خاڵ",
      correct: "وەڵامی ڕاستە! ⚽",
      wrong: "هەوڵێکی تر بدە!",
      revealed: "وەڵامی ڕاست:",
      hint: "💡 ئاماژەی داهاتوو",
      noHints: "ئاماژەی زیاتر نییە",
      answerPlaceholder: "ناوی یاریزان بنووسە...",
      streak: "ڕۆژ بەردەوام",
      quitTitle: "دەرچوون لە یارییەکە؟",
      quitText: "ئەم خولە وەک ئەنجامی کۆتایی پاشەکەوت ناکرێت.",
      continue: "بەردەوام بە",
      quit: "دەرچوون",
      continueTitle: "🔥 قۆناغ تەواو بوو",
      continueText: "بەردەوام بیت بۆ زیادکردنی لێکدەر؟",
      result: "خول تەواو بوو!",
      again: "هەمان ئاست دووبارە بکەوە",
      levels: "ئاستێکی تر هەڵبژێرە"
    }
  };

  const originalPlayers = [
    {
      name: "Franck Ribéry",
      aliases: ["فرانك ريبيري", "ريبيري", "Ribery"],
      nationality: "فرنسي",
      position: "جناح",
      age: "42",
      status: "معتزل",
      image: "",
      hints: [
        "لاعب فرنسي سابق",
        "اشتهر بسرعته ومهاراته في المراوغة",
        "لعب مع بايرن ميونخ",
        "فاز بدوري أبطال أوروبا عام 2013"
      ]
    },
    {
      name: "Alisson Becker",
      aliases: ["أليسون", "أليسون بيكر", "Alisson"],
      nationality: "برازيلي",
      position: "حارس مرمى",
      age: "33",
      status: "ليفربول",
      image: "",
      hints: [
        "حارس مرمى برازيلي",
        "لعب في الدوري الإيطالي",
        "انتقل إلى ليفربول",
        "فاز بدوري أبطال أوروبا مع ليفربول"
      ]
    },
    {
      name: "Lionel Messi",
      aliases: ["ليونيل ميسي", "ميسي", "Messi"],
      nationality: "أرجنتيني",
      position: "مهاجم",
      age: "39",
      status: "إنتر ميامي",
      image: "",
      hints: [
        "بدأ مسيرته الأوروبية مع برشلونة",
        "فاز بكأس العالم 2022",
        "اشتهر بقدمه اليسرى ومراوغاته",
        "فاز بالكرة الذهبية عدة مرات"
      ]
    },
    {
      name: "Cristiano Ronaldo",
      aliases: ["كريستيانو رونالدو", "رونالدو", "CR7"],
      nationality: "برتغالي",
      position: "مهاجم",
      age: "41",
      status: "النصر السعودي",
      image: "",
      hints: [
        "بدأ مشواره مع سبورتينغ لشبونة",
        "تألق مع ريال مدريد ومانشستر يونايتد",
        "يرتدي الرقم 7 غالبًا",
        "فاز ببطولة أمم أوروبا مع البرتغال"
      ]
    },
    {
      name: "Ronaldo Nazário",
      aliases: ["رونالدو نازاريو", "الظاهرة", "Ronaldo"],
      nationality: "برازيلي",
      position: "مهاجم",
      age: "50",
      status: "معتزل",
      image: "",
      hints: [
        "لقبه الظاهرة",
        "لعب مع برشلونة وريال مدريد",
        "فاز بكأس العالم مرتين",
        "اشتهر بسرعته ومهاراته أمام المرمى"
      ]
    },
    {
      name: "Kylian Mbappé",
      aliases: ["كيليان مبابي", "مبابي", "Mbappe"],
      nationality: "فرنسي",
      position: "مهاجم",
      age: "27",
      status: "ريال مدريد",
      image: "",
      hints: [
        "لاعب فرنسي سريع جدًا",
        "تألق مع باريس سان جيرمان",
        "فاز بكأس العالم 2018",
        "انتقل إلى ريال مدريد"
      ]
    },
    {
      name: "Mohamed Salah",
      aliases: ["محمد صلاح", "صلاح", "Mo Salah"],
      nationality: "مصري",
      position: "جناح أيمن",
      age: "34",
      status: "ليفربول",
      image: "",
      hints: [
        "لاعب مصري من نجوم كرة القدم",
        "لعب مع تشيلسي وروما",
        "حقق دوري أبطال أوروبا مع ليفربول",
        "لقبه الشائع هو الملك المصري"
      ]
    }
  ];

  const easyExtraPlayers = [
    {
      name: "Karim Benzema",
      aliases: ["كريم بنزيما", "بنزيما", "Benzema"],
      nationality: "فرنسي",
      position: "مهاجم",
      age: "38",
      status: "الاتحاد",
      image: "",
      hints: ["مهاجم فرنسي", "تألق لسنوات مع ريال مدريد", "فاز بالكرة الذهبية 2022", "لعب في الدوري السعودي"]
    },
    {
      name: "N'Golo Kanté",
      aliases: ["كانتي", "نغولو كانتي", "Kante"],
      nationality: "فرنسي",
      position: "وسط",
      age: "35",
      status: "الاتحاد",
      image: "",
      hints: ["لاعب وسط فرنسي", "اشتهر بقدرته على افتكاك الكرة", "فاز بالدوري الإنجليزي مع ليستر وتشيلسي", "فاز بكأس العالم 2018"]
    },
    {
      name: "Diego Maradona",
      aliases: ["دييغو مارادونا", "مارادونا", "Maradona"],
      nationality: "أرجنتيني",
      position: "صانع ألعاب",
      age: "متوفى",
      status: "معتزل",
      image: "",
      hints: ["أسطورة أرجنتينية", "قاد بلاده للفوز بكأس العالم 1986", "لعب لنابولي", "اشتهر بهدف يد السماء"]
    },
    {
      name: "Omar Marmoush",
      aliases: ["عمر مرموش", "مرموش", "Marmoush"],
      nationality: "مصري",
      position: "مهاجم",
      age: "27",
      status: "مانشستر سيتي",
      image: "",
      hints: ["لاعب مصري", "لعب في الدوري الألماني", "اشتهر بسرعته وتحركاته الهجومية", "انضم إلى مانشستر سيتي"]
    },
    {
      name: "Achraf Hakimi",
      aliases: ["أشرف حكيمي", "حكيمي", "Hakimi"],
      nationality: "مغربي",
      position: "ظهير أيمن",
      age: "27",
      status: "باريس سان جيرمان",
      image: "",
      hints: ["لاعب مغربي", "لعب لريال مدريد وإنتر ميلان", "ظهير سريع ويميل للهجوم", "يلعب مع باريس سان جيرمان"]
    },
    {
      name: "Marcelo",
      aliases: ["مارسيلو", "Marcelo"],
      nationality: "برازيلي",
      position: "ظهير أيسر",
      age: "38",
      status: "معتزل",
      image: "",
      hints: ["لاعب برازيلي", "اشتهر بشعره الطويل ومهاراته", "قضى سنوات طويلة مع ريال مدريد", "فاز بدوري أبطال أوروبا عدة مرات"]
    },
    {
      name: "Sergio Ramos",
      aliases: ["سيرخيو راموس", "راموس", "Ramos"],
      nationality: "إسباني",
      position: "قلب دفاع",
      age: "40",
      status: "حسب بيانات التحدي",
      image: "",
      hints: ["مدافع إسباني", "قائد سابق لريال مدريد", "اشتهر بأهدافه بالرأس", "فاز بكأس العالم مع إسبانيا"]
    },
    {
      name: "Gianluigi Buffon",
      aliases: ["جانلويجي بوفون", "بوفون", "Buffon"],
      nationality: "إيطالي",
      position: "حارس مرمى",
      age: "48",
      status: "معتزل",
      image: "",
      hints: ["حارس إيطالي أسطوري", "لعب ليوفنتوس وبارما", "فاز بكأس العالم 2006", "من أشهر حراس المرمى في التاريخ"]
    },
    {
      name: "Lamine Yamal",
      aliases: ["لامين يامال", "يامال", "Yamal"],
      nationality: "إسباني",
      position: "جناح",
      age: "19",
      status: "برشلونة",
      image: "",
      hints: ["جناح إسباني شاب", "تألق في أكاديمية برشلونة", "يلعب غالبًا على الجهة اليمنى", "فاز ببطولة أمم أوروبا 2024"]
    },
    {
      name: "Ousmane Dembélé",
      aliases: ["عثمان ديمبيلي", "ديمبيلي", "Dembele"],
      nationality: "فرنسي",
      position: "جناح",
      age: "29",
      status: "باريس سان جيرمان",
      image: "",
      hints: ["لاعب فرنسي", "يجيد اللعب بكلتا القدمين", "لعب لبرشلونة", "انضم إلى باريس سان جيرمان"]
    },
    {
      name: "Thierry Henry",
      aliases: ["تييري هنري", "هنري", "Henry"],
      nationality: "فرنسي",
      position: "مهاجم",
      age: "49",
      status: "معتزل",
      image: "",
      hints: ["أسطورة فرنسية", "تألق مع أرسنال", "لعب لبرشلونة أيضًا", "كان من أبرز مهاجمي جيله"]
    },
    {
      name: "Harry Kane",
      aliases: ["هاري كين", "كين", "Kane"],
      nationality: "إنجليزي",
      position: "مهاجم",
      age: "33",
      status: "بايرن ميونخ",
      image: "",
      hints: ["مهاجم إنجليزي", "كان قائد منتخب إنجلترا", "اشتهر بالتسجيل من داخل وخارج المنطقة", "يلعب مع بايرن ميونخ"]
    },
    {
      name: "Zinedine Zidane",
      aliases: ["زين الدين زيدان", "زيدان", "Zidane"],
      nationality: "فرنسي",
      position: "وسط هجومي",
      age: "54",
      status: "معتزل",
      image: "",
      hints: ["أسطورة فرنسية من أصول جزائرية", "لعب ليوفنتوس وريال مدريد", "فاز بكأس العالم 1998", "اشتهر بمهاراته ولمساته الفنية"]
    },
    {
      name: "Thibaut Courtois",
      aliases: ["تيبو كورتوا", "كورتوا", "Courtois"],
      nationality: "بلجيكي",
      position: "حارس مرمى",
      age: "34",
      status: "ريال مدريد",
      image: "",
      hints: ["حارس مرمى بلجيكي", "لعب لتشيلسي وأتلتيكو مدريد", "تألق في نهائي دوري أبطال أوروبا 2022", "يلعب مع ريال مدريد"]
    }
  ];

  const mediumPlayers = [
    {
      name: "Antony",
      aliases: ["أنتوني", "Antony"],
      nationality: "برازيلي",
      position: "جناح",
      age: "26",
      status: "حسب بيانات التحدي",
      image: "",
      hints: ["لاعب برازيلي", "لعب لمانشستر يونايتد", "لعب لريال بيتيس", "اشتهر باللعب على الجناح"]
    },
    {
      name: "Bernardo Silva",
      aliases: ["برناردو سيلفا", "Bernardo"],
      nationality: "برتغالي",
      position: "وسط هجومي",
      age: "32",
      status: "مانشستر سيتي",
      image: "",
      hints: ["لاعب برتغالي", "لعب لموناكو", "تألق تحت قيادة بيب غوارديولا", "يجيد اللعب في أكثر من مركز"]
    },
    {
      name: "Jude Bellingham",
      aliases: ["جود بيلينغهام", "بيلينغهام", "Bellingham"],
      nationality: "إنجليزي",
      position: "وسط",
      age: "23",
      status: "ريال مدريد",
      image: "",
      hints: ["لاعب وسط إنجليزي", "بدأ مسيرته مع برمنغهام سيتي", "تألق مع بوروسيا دورتموند", "انتقل إلى ريال مدريد"]
    },
    {
      name: "Bradley Barcola",
      aliases: ["برادلي باركولا", "باركولا", "Barcola"],
      nationality: "فرنسي",
      position: "جناح",
      age: "24",
      status: "ليفربول حسب بيانات التحدي",
      image: "",
      hints: ["لاعب فرنسي", "لعب في الدوري الفرنسي", "يلعب في مركز الجناح", "حسب بيانات التحدي: ليفربول"]
    },
    {
      name: "Ronald Araújo",
      aliases: ["رونالد أراوخو", "أراوخو", "Araujo"],
      nationality: "أوروغواياني",
      position: "قلب دفاع",
      age: "27",
      status: "برشلونة",
      image: "",
      hints: ["مدافع أوروغواياني", "يلعب في قلب الدفاع", "اشتهر بالقوة البدنية", "يلعب مع برشلونة"]
    },
    {
      name: "Hakim Ziyech",
      aliases: ["حكيم زياش", "زياش", "Ziyech"],
      nationality: "مغربي",
      position: "جناح هجومي",
      age: "33",
      status: "حسب بيانات التحدي",
      image: "",
      hints: ["لاعب مغربي", "اشتهر بقدمه اليسرى", "لعب لأياكس وتشيلسي", "يجيد الكرات الثابتة والتمريرات الطويلة"]
    },
    {
      name: "Petr Čech",
      aliases: ["بيتر تشيك", "تشيك", "Cech"],
      nationality: "تشيكي",
      position: "حارس مرمى",
      age: "44",
      status: "معتزل",
      image: "",
      hints: ["حارس مرمى تشيكي", "لعب لتشيلسي وأرسنال", "اشتهر بارتداء واقي الرأس", "فاز بدوري أبطال أوروبا مع تشيلسي"]
    },
    {
      name: "Dani Carvajal",
      aliases: ["داني كارفاخال", "كارفاخال", "Carvajal"],
      nationality: "إسباني",
      position: "ظهير أيمن",
      age: "34",
      status: "ريال مدريد",
      image: "",
      hints: ["مدافع إسباني", "خريج أكاديمية ريال مدريد", "لعب فترة مع باير ليفركوزن", "فاز بدوري أبطال أوروبا عدة مرات"]
    },
    {
      name: "Sadio Mané",
      aliases: ["ساديو ماني", "ماني", "Mane"],
      nationality: "سنغالي",
      position: "جناح",
      age: "34",
      status: "حسب بيانات التحدي",
      image: "",
      hints: ["لاعب سنغالي", "تألق مع ليفربول", "لعب لبايرن ميونخ", "فاز بكأس أمم أفريقيا مع السنغال"]
    },
    {
      name: "Fabinho",
      aliases: ["فابينيو", "Fabinho"],
      nationality: "برازيلي",
      position: "وسط دفاعي",
      age: "32",
      status: "حسب بيانات التحدي",
      image: "",
      hints: ["لاعب برازيلي", "لعب لموناكو", "تألق مع ليفربول", "يجيد اللعب في الوسط الدفاعي"]
    },
    {
      name: "Roberto Firmino",
      aliases: ["روبرتو فيرمينو", "فيرمينو", "Firmino"],
      nationality: "برازيلي",
      position: "مهاجم",
      age: "35",
      status: "حسب بيانات التحدي",
      image: "",
      hints: ["مهاجم برازيلي", "تألق مع ليفربول", "اشتهر بضغطه على المدافعين", "كان جزءًا من الثلاثي الهجومي مع صلاح وماني"]
    },
    {
      name: "Peter Schmeichel",
      aliases: ["بيتر شمايكل", "شمايكل", "Schmeichel"],
      nationality: "دنماركي",
      position: "حارس مرمى",
      age: "63",
      status: "معتزل",
      image: "",
      hints: ["حارس دنماركي أسطوري", "لعب لمانشستر يونايتد", "فاز بدوري أبطال أوروبا 1999", "فاز ببطولة أمم أوروبا مع الدنمارك"]
    },
    {
      name: "Bruno Fernandes",
      aliases: ["برونو فيرنانديز", "برونو", "Fernandes"],
      nationality: "برتغالي",
      position: "وسط هجومي",
      age: "32",
      status: "مانشستر يونايتد",
      image: "",
      hints: ["لاعب برتغالي", "تألق مع سبورتينغ لشبونة", "يشتهر بصناعة الفرص والتسديد", "يلعب مع مانشستر يونايتد"]
    }
  ];

  const playersByLevel = {
    easy: [...originalPlayers, ...easyExtraPlayers],
    medium: mediumPlayers,
    hard: [...originalPlayers],
    impossible: [...originalPlayers]
  };

  const levelSettings = {
    easy: { hintPenalty: 10, wrongPenalty: 5 },
    medium: { hintPenalty: 15, wrongPenalty: 10 },
    hard: { hintPenalty: 20, wrongPenalty: 15 },
    impossible: { hintPenalty: 25, wrongPenalty: 20 }
  };

  const teamColors = {
    "Real Madrid": ["#ffffff", "#173b8f", "#d5b45b"],
    "Liverpool": ["#c8102e", "#ffffff", "#8b0019"],
    "Barcelona": ["#a50044", "#004d98", "#edbb00"],
    "Manchester City": ["#6cabdd", "#ffffff", "#1c2c5b"],
    "Manchester United": ["#da291c", "#ffffff", "#fbe122"],
    "Arsenal": ["#ef0107", "#ffffff", "#063672"],
    "Chelsea": ["#034694", "#ffffff", "#dba111"],
    "Bayern Munich": ["#dc052d", "#ffffff", "#0066b2"],
    "Paris Saint-Germain": ["#004170", "#ffffff", "#da291c"],
    "Juventus": ["#000000", "#ffffff", "#d7b56d"],
    "Inter Miami": ["#f7b5cd", "#231f20", "#ffffff"],
    "Al Ahly": ["#c8102e", "#ffffff", "#b99a43"],
    "Zamalek": ["#ffffff", "#c8102e", "#111111"]
  };

  let currentLevel = "easy";
  let roundPlayers = [];
  let playerIndex = 0;
  let currentHints = 0;
  let wrongAttempts = 0;
  let roundPoints = 0;
  let roundCorrect = 0;
  let roundPerfect = true;
  let waiting = false;
  let roundTimer = null;
  let continuationCount = 0;
  let pointMultiplier = 1;
  let roundFinished = false;
  let attemptedCount = 0;
  let quitModalOpen = false;
  let continueModalOpen = false;

  function getLanguage() {
    return localStorage.getItem(STORAGE_LANGUAGE) || "ar";
  }

  function tr(key) {
    const lang = getLanguage();
    return (translations[lang] && translations[lang][key]) ||
      translations.ar[key] || key;
  }

  function readStats() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_STATS)) || {};
    } catch {
      return {};
    }
  }

  function saveStats(stats) {
    localStorage.setItem(STORAGE_STATS, JSON.stringify(stats));
  }

  function showToast(message) {
    const toast = $("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function updateHomeStats() {
    const stats = readStats();
    if ($("bestScore")) $("bestScore").textContent = stats.bestScore || 0;
    if ($("totalPoints")) $("totalPoints").textContent = stats.totalPoints || 0;
    if ($("roundsPlayed")) $("roundsPlayed").textContent = stats.gamesPlayed || 0;
  }

  function todayKey() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function recordDailyStreak() {
    const today = todayKey();
    let data;

    try {
      data = JSON.parse(localStorage.getItem(STORAGE_STREAK)) || { days: 0, lastDate: "" };
    } catch {
      data = { days: 0, lastDate: "" };
    }

    if (data.lastDate === today) {
      updateStreakBadge(data.days);
      return data.days;
    }

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;

    data.days = data.lastDate === yesterday ? (data.days || 0) + 1 : 1;
    data.lastDate = today;
    localStorage.setItem(STORAGE_STREAK, JSON.stringify(data));
    updateStreakBadge(data.days);
    return data.days;
  }

  function updateStreakBadge(days) {
    const header = document.querySelector(".header-actions");
    if (!header) return;

    let badge = $("streakBadge");
    if (!badge) {
      badge = document.createElement("button");
      badge.id = "streakBadge";
      badge.type = "button";
      badge.className = "streak-button";
      badge.style.cssText = [
        "border:1px solid rgba(255,140,0,.35)",
        "background:rgba(255,140,0,.10)",
        "color:inherit",
        "border-radius:12px",
        "padding:8px 10px",
        "font-weight:800",
        "cursor:pointer"
      ].join(";");
      header.prepend(badge);
    }

    badge.textContent = `🔥 ${days}`;
    badge.title = `${days} ${tr("streak")}`;
    badge.setAttribute("aria-label", `${days} ${tr("streak")}`);
    badge.onclick = () => showToast(`🔥 ${days} ${tr("streak")}`);
  }

  function loadStreakBadge() {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_STREAK)) || { days: 0 };
      updateStreakBadge(data.days || 0);
    } catch {
      updateStreakBadge(0);
    }
  }

  function applyFavoriteTeamTheme() {
    const team = localStorage.getItem(STORAGE_FAVORITE);
    const colors = teamColors[team];
    if (!colors) return;

    const root = document.documentElement;
    root.style.setProperty("--club-primary", colors[0]);
    root.style.setProperty("--club-secondary", colors[1]);
    root.style.setProperty("--club-accent", colors[2]);

    if (!document.getElementById("club-theme-style")) {
      const style = document.createElement("style");
      style.id = "club-theme-style";
      style.textContent = `
        .primary, .hint-btn {
          background: linear-gradient(135deg, var(--club-primary), var(--club-secondary));
          border-color: var(--club-accent);
        }
        .green, .eyebrow {
          color: var(--club-accent);
        }
        .panel {
          border-color: color-mix(in srgb, var(--club-primary) 45%, transparent);
        }
      `;
      document.head.appendChild(style);
    }
  }

  function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.toggle("active", screen.id === screenId);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startGame() {
    clearTimeout(roundTimer);
    roundPlayers = shuffle(playersByLevel[currentLevel] || playersByLevel.easy);
    playerIndex = 0;
    currentHints = 0;
    wrongAttempts = 0;
    roundPoints = 0;
    roundCorrect = 0;
    roundPerfect = true;
    waiting = false;
    continuationCount = 0;
    pointMultiplier = 1;
    roundFinished = false;
    attemptedCount = 0;
    quitModalOpen = false;
    continueModalOpen = false;

    const impossibleBtn = $("impossibleBtn");
    if (impossibleBtn && currentLevel === "impossible") {
      impossibleBtn.disabled = false;
    }

    showScreen("gameScreen");
    loadPlayer();
  }

  function normalizeAnswer(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ى/g, "ي")
      .replace(/ة/g, "ه")
      .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "")
      .toLowerCase()
      .trim();
  }

  function answerMatches(input, player) {
    const answer = normalizeAnswer(input);
    if (!answer) return false;

    const possible = [player.name, ...(player.aliases || [])]
      .map(normalizeAnswer);

    return possible.some((name) => name === answer || (answer.length >= 4 && name.includes(answer)));
  }

  function loadPlayer() {
    if (playerIndex >= roundPlayers.length) {
      finishGame();
      return;
    }

    waiting = false;
    currentHints = 0;
    wrongAttempts = 0;

    const player = roundPlayers[playerIndex];
    const total = roundPlayers.length;

    if ($("levelName")) $("levelName").textContent = tr(currentLevel);
    if ($("questionCount")) {
      $("questionCount").textContent = `${tr("question")} ${playerIndex + 1} / ${total}`;
    }
    if ($("scoreNow")) $("scoreNow").textContent = `${tr("points")}: ${roundPoints}`;
    if ($("progressBar")) $("progressBar").style.width = `${(playerIndex / total) * 100}%`;

    const image = $("playerImage");
    const photoBox = $("photoBox");

    if (image) {
      image.onerror = () => {
        image.style.display = "none";
      };

      if (player.image) {
        image.src = player.image;
        image.style.display = "block";
      } else {
        image.removeAttribute("src");
        image.style.display = "none";
      }
    }

    if (photoBox) photoBox.classList.remove("revealed");
    if ($("photoLabel")) $("photoLabel").textContent = "هوية اللاعب مخفية 🕵️";
    if ($("nationality")) $("nationality").textContent = player.nationality || "غير معروف";
if ($("position")) $("position").textContent = player.position || "غير معروف";
if ($("age")) $("age").textContent = player.age || "غير معروف";
if ($("status")) $("status").textContent = player.status || "غير معروف";
    if ($("questionText")) $("questionText").textContent = "تقدر تعرفني؟";
    if ($("hintList")) $("hintList").innerHTML = "";
    if ($("hintsCount")) $("hintsCount").textContent = "استخدمت 0 من 4";
    if ($("hintBtn")) $("hintBtn").disabled = false;
    if ($("answerInput")) {
      $("answerInput").value = "";
      $("answerInput").disabled = false;
      $("answerInput").placeholder = tr("answerPlaceholder");
    }
    if ($("suggestions")) {
      $("suggestions").innerHTML = "";
      $("suggestions").hidden = true;
    }
    if ($("submitBtn")) $("submitBtn").disabled = false;
    if ($("giveUpBtn")) $("giveUpBtn").disabled = false;
    if ($("message")) $("message").textContent = "";

    updateHomeStats();
  }

  function revealPlayer() {
    const player = roundPlayers[playerIndex];
    if (!player) return;

    if ($("photoBox")) $("photoBox").classList.add("revealed");
    if ($("playerImage") && player.image) {
      $("playerImage").src = player.image;
      $("playerImage").style.display = "block";
    }
    if ($("photoLabel")) $("photoLabel").textContent = player.name;
    if ($("nationality")) $("nationality").textContent = player.nationality;
    if ($("position")) $("position").textContent = player.position;
    if ($("age")) $("age").textContent = player.age;
    if ($("status")) $("status").textContent = player.status;
  }

  function showHint() {
    if (waiting || roundFinished) return;

    const player = roundPlayers[playerIndex];
    if (!player) return;

    const hints = player.hints || [];
    if (currentHints >= hints.length) {
      if ($("hintBtn")) $("hintBtn").disabled = true;
      showToast(tr("noHints"));
      return;
    }

    const hint = document.createElement("div");
    hint.className = "hint-item";
    hint.textContent = `${currentHints + 1}. ${hints[currentHints]}`;
    if ($("hintList")) $("hintList").appendChild(hint);

    currentHints++;

    const penalty = levelSettings[currentLevel].hintPenalty;
    roundPoints = Math.max(0, roundPoints - (currentHints === 1 ? 0 : penalty));

    if ($("hintsCount")) {
      $("hintsCount").textContent = `استخدمت ${currentHints} من ${hints.length}`;
    }
    if (currentHints >= hints.length && $("hintBtn")) {
      $("hintBtn").disabled = true;
    }
    if ($("scoreNow")) $("scoreNow").textContent = `${tr("points")}: ${roundPoints}`;
  }

  function setMessage(message, type) {
    const element = $("message");
    if (!element) return;
    element.textContent = message;
    element.className = `message ${type || ""}`;
  }

  function lockAnswerControls() {
    if ($("answerInput")) $("answerInput").disabled = true;
    if ($("submitBtn")) $("submitBtn").disabled = true;
    if ($("hintBtn")) $("hintBtn").disabled = true;
    if ($("giveUpBtn")) $("giveUpBtn").disabled = true;
  }

  function submitAnswer() {
    if (waiting || roundFinished) return;

    const input = $("answerInput")?.value || "";
    const player = roundPlayers[playerIndex];
    if (!player) return;

    if (answerMatches(input, player)) {
      waiting = true;
      const basePoints = Math.max(
        5,
        100 - currentHints * levelSettings[currentLevel].hintPenalty -
        wrongAttempts * levelSettings[currentLevel].wrongPenalty
      );

      const earned = Math.round(basePoints * pointMultiplier);
      roundPoints += earned;
      roundCorrect++;

      setMessage(`${tr("correct")} +${earned}`, "success");
      revealPlayer();
      lockAnswerControls();
      endQuestion();
      return;
    }

    wrongAttempts++;
    roundPerfect = false;

    if (wrongAttempts >= 3) {
      waiting = true;
      setMessage(`${tr("revealed")} ${player.name}`, "error");
      revealPlayer();
      lockAnswerControls();
      endQuestion();
    } else {
      setMessage(`${tr("wrong")} (${3 - wrongAttempts})`, "error");
    }
  }

  function giveUp() {
    if (waiting || roundFinished) return;

    const player = roundPlayers[playerIndex];
    if (!player) return;

    waiting = true;
    roundPerfect = false;
    setMessage(`${tr("revealed")} ${player.name}`, "error");
    revealPlayer();
    lockAnswerControls();
    endQuestion();
  }

  function ensureModalStyles() {
    if ($("koraModalStyles")) return;

    const style = document.createElement("style");
    style.id = "koraModalStyles";
    style.textContent = `
      .kora-custom-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 18px;
        background: rgba(0,0,0,.78);
        backdrop-filter: blur(8px);
      }
      .kora-custom-overlay.open {
        display: flex;
        animation: koraFadeIn .2s ease;
      }
      .kora-custom-card {
        width: min(100%, 430px);
        padding: 26px;
        border-radius: 22px;
        border: 1px solid rgba(255,255,255,.12);
        background: #111714;
        color: #fff;
        text-align: center;
        box-shadow: 0 24px 90px rgba(0,0,0,.55);
        animation: koraPopIn .22s ease;
      }
      .kora-custom-card h2 {
        margin: 0 0 12px;
        font-size: 23px;
      }
      .kora-custom-card p {
        color: #c4cec7;
        line-height: 1.8;
        margin: 0 0 22px;
      }
      .kora-modal-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .kora-modal-actions button {
        flex: 1;
        min-width: 120px;
        padding: 12px 16px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.12);
        cursor: pointer;
        font: inherit;
        font-weight: 800;
        transition: transform .15s ease, filter .15s ease;
      }
      .kora-modal-actions button:hover {
        transform: translateY(-2px);
        filter: brightness(1.1);
      }
      .kora-modal-primary {
        background: #16a34a;
        color: white;
      }
      .kora-modal-danger {
        background: #3a1c20;
        color: #ffb8bf;
      }
      .kora-modal-secondary {
        background: #242c27;
        color: white;
      }
      .kora-multiplier {
        display: inline-block;
        margin: 0 auto 18px;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(34,197,94,.13);
        color: #86efac;
        font-weight: 900;
      }
      @keyframes koraFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes koraPopIn {
        from { opacity: 0; transform: translateY(12px) scale(.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @media (prefers-reduced-motion: reduce) {
        .kora-custom-overlay, .kora-custom-card { animation: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function createModal(id, title, text, buttons, extra = "") {
    ensureModalStyles();

    let modal = $(id);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = id;
      modal.className = "kora-custom-overlay";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="kora-custom-card">
        ${extra}
        <h2>${title}</h2>
        <p>${text}</p>
        <div class="kora-modal-actions">
          ${buttons.map((button) => `
            <button type="button"
              class="${button.className}"
              id="${button.id}">${button.label}</button>
          `).join("")}
        </div>
      </div>
    `;

    return modal;
  }

  function askToContinue() {
    if (continueModalOpen || roundFinished) return;

    continueModalOpen = true;
    const nextMultiplier = [1.2, 1.4, 1.6, 1.8][Math.min(continuationCount, 3)];

    const modal = createModal(
      "continueModal",
      `${tr("continueTitle")} ${playerIndex + 1} لاعبين`,
      `${tr("continueText")} وصلت لنقاط ${roundPoints}.`,
      [
        { id: "continueYes", label: `${tr("continue")} ×${nextMultiplier}`, className: "kora-modal-primary" },
        { id: "continueNo", label: "إنهاء الجولة وحفظ النتيجة", className: "kora-modal-secondary" }
      ],
      `<div class="kora-multiplier">المضاعف القادم ×${nextMultiplier}</div>`
    );

    modal.classList.add("open");

    $("continueYes").onclick = () => {
      modal.classList.remove("open");
      continueModalOpen = false;
      continuationCount++;
      pointMultiplier = [1, 1.2, 1.4, 1.6, 1.8][Math.min(continuationCount, 4)];
      playerIndex++;
      loadPlayer();
    };

    $("continueNo").onclick = () => {
      modal.classList.remove("open");
      continueModalOpen = false;
      finishGame();
    };
  }

  function endQuestion() {
    attemptedCount = Math.max(attemptedCount, playerIndex + 1);

    if ($("scoreNow")) $("scoreNow").textContent = `${tr("points")}: ${roundPoints}`;

    clearTimeout(roundTimer);
    roundTimer = setTimeout(() => {
      if (roundFinished) return;

      const completed = playerIndex + 1;

      if (completed >= roundPlayers.length) {
        playerIndex = roundPlayers.length;
        finishGame();
        return;
      }

      if (completed % 5 === 0) {
        askToContinue();
        return;
      }

      playerIndex++;
      loadPlayer();
    }, 1100);
  }

  function finishGame() {
    if (roundFinished) return;

    roundFinished = true;
    clearTimeout(roundTimer);

    const attempted = Math.max(
      1,
      Math.min(roundPlayers.length, attemptedCount || playerIndex + 1)
    );
    const percentage = Math.round((roundCorrect / attempted) * 100);
    const stats = readStats();

    stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
    stats.totalPoints = (stats.totalPoints || 0) + roundPoints;
    stats.bestScore = Math.max(stats.bestScore || 0, percentage);
    stats.perfectLevels = Array.isArray(stats.perfectLevels) ? stats.perfectLevels : [];

    if (
      attempted === roundPlayers.length &&
      roundCorrect === attempted &&
      roundPerfect &&
      !stats.perfectLevels.includes(currentLevel)
    ) {
      stats.perfectLevels.push(currentLevel);
    }

    saveStats(stats);
    recordDailyStreak();
    updateHomeStats();

    if ($("finalScore")) $("finalScore").textContent = `${percentage}%`;
    if ($("resultTitle")) $("resultTitle").textContent = tr("result");
    if ($("resultDetails")) {
      $("resultDetails").textContent =
        `جاوبت صح على ${roundCorrect} من ${attempted} لاعبين وجمعت ${roundPoints} نقطة.`;
    }
    if ($("resultComment")) {
      $("resultComment").textContent =
        percentage >= 90 ? "أسطورة! أداء عالمي 🏆" :
        percentage >= 70 ? "جامد يا نجم! كمل كده ⚽" :
        percentage >= 40 ? "أداء كويس، ومع التدريب هتتحسن 💪" :
        "متستسلمش، جرّب تاني وهتكسر رقمك!";
    }

    showScreen("resultScreen");
  }

  function askQuit() {
    if (quitModalOpen || roundFinished) return;

    quitModalOpen = true;
    const modal = createModal(
      "quitModal",
      tr("quitTitle"),
      tr("quitText"),
      [
        { id: "quitStay", label: tr("continue"), className: "kora-modal-primary" },
        { id: "quitConfirm", label: tr("quit"), className: "kora-modal-danger" }
      ]
    );

    modal.classList.add("open");

    $("quitStay").onclick = () => {
      modal.classList.remove("open");
      quitModalOpen = false;
    };

    $("quitConfirm").onclick = () => {
      modal.classList.remove("open");
      quitModalOpen = false;
      clearTimeout(roundTimer);
      waiting = false;

      const continueModal = $("continueModal");
      if (continueModal) continueModal.classList.remove("open");
      continueModalOpen = false;

      showScreen("levelScreen");
      updateHomeStats();
    };

    modal.onclick = (event) => {
      if (event.target === modal) {
        modal.classList.remove("open");
        quitModalOpen = false;
      }
    };
  }

  function setupAutocomplete() {
    const input = $("answerInput");
    const suggestions = $("suggestions");
    if (!input || !suggestions) return;

    input.addEventListener("input", () => {
      const value = input.value.trim();
      suggestions.innerHTML = "";

      if (value.length < 2 || waiting) {
        suggestions.hidden = true;
        return;
      }

      const query = normalizeAnswer(value);
      const matches = roundPlayers
        .filter((player) => [player.name, ...(player.aliases || [])]
          .some((name) => normalizeAnswer(name).includes(query)))
        .slice(0, 5);

      if (!matches.length) {
        suggestions.hidden = true;
        return;
      }

      matches.forEach((player) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "suggestion-item";
        button.textContent = player.name;
        button.addEventListener("click", () => {
          input.value = player.name;
          suggestions.hidden = true;
          input.focus();
        });
        suggestions.appendChild(button);
      });

      suggestions.hidden = false;
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitAnswer();
      }
      if (event.key === "Escape") {
        suggestions.hidden = true;
      }
    });

    document.addEventListener("click", (event) => {
      if (!suggestions.contains(event.target) && event.target !== input) {
        suggestions.hidden = true;
      }
    });
  }

  function setupSettings() {
    const toggle = $("settingsToggle");
    const close = $("settingsClose");
    const overlay = $("settingsOverlay");
    const panel = $("settingsPanel");
    const languageSelect = $("languageSelect");

    function openSettings() {
      if (!panel || !overlay) return;
      panel.classList.add("open");
      overlay.classList.add("open");
      panel.setAttribute("aria-hidden", "false");
      if (toggle) toggle.setAttribute("aria-expanded", "true");
    }

    function closeSettings() {
      if (!panel || !overlay) return;
      panel.classList.remove("open");
      overlay.classList.remove("open");
      panel.setAttribute("aria-hidden", "true");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }

    if (toggle) toggle.addEventListener("click", openSettings);
    if (close) close.addEventListener("click", closeSettings);
    if (overlay) overlay.addEventListener("click", closeSettings);

    function setTheme(theme) {
      document.documentElement.dataset.theme = theme;
      localStorage.setItem(STORAGE_THEME, theme);

      if ($("themeDark")) $("themeDark").setAttribute("aria-pressed", String(theme === "dark"));
      if ($("themeLight")) $("themeLight").setAttribute("aria-pressed", String(theme === "light"));
    }

    if ($("themeDark")) $("themeDark").addEventListener("click", () => setTheme("dark"));
    if ($("themeLight")) $("themeLight").addEventListener("click", () => setTheme("light"));

    const savedTheme = localStorage.getItem(STORAGE_THEME) || "dark";
    setTheme(savedTheme);

    if (languageSelect) {
      languageSelect.value = getLanguage();

      languageSelect.addEventListener("change", () => {
        localStorage.setItem(STORAGE_LANGUAGE, languageSelect.value);
        const lang = languageSelect.value;
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === "ar" || lang === "ku" ? "rtl" : "ltr";

        if (typeof window.koraTranslatePage === "function") {
          window.koraTranslatePage(lang);
        }

        updateHomeStats();
        loadStreakBadge();
      });
    }
  }

  function setupLevelButtons() {
    document.querySelectorAll("[data-level]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.disabled) return;
        currentLevel = button.dataset.level;

        document.querySelectorAll("[data-level]").forEach((item) => {
          item.classList.toggle("active", item === button);
        });
      });
    });
  }

  function setupEvents() {
    if ($("startBtn")) $("startBtn").addEventListener("click", startGame);
    if ($("hintBtn")) $("hintBtn").addEventListener("click", showHint);
    if ($("submitBtn")) $("submitBtn").addEventListener("click", submitAnswer);
    if ($("giveUpBtn")) $("giveUpBtn").addEventListener("click", giveUp);
    if ($("quitBtn")) $("quitBtn").addEventListener("click", askQuit);
    if ($("againBtn")) $("againBtn").addEventListener("click", startGame);

    if ($("levelsBtn")) {
      $("levelsBtn").addEventListener("click", () => showScreen("levelScreen"));
    }

    setupLevelButtons();
    setupAutocomplete();
    setupSettings();
  }

  function init() {
    const lang = getLanguage();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" || lang === "ku" ? "rtl" : "ltr";

    if ($("languageSelect")) $("languageSelect").value = lang;

    applyFavoriteTeamTheme();
    setupEvents();
    updateHomeStats();
    loadStreakBadge();

    const stats = readStats();
    if ($("impossibleBtn") && (stats.perfectLevels || []).length >= 3) {
      $("impossibleBtn").disabled = false;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
