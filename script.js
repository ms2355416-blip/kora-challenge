
const toast = document.getElementById('toast');
const root = document.documentElement;

function showToast(message) {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2600);
}

// =====================================
// الإحصائيات
// =====================================

function loadStats() {
  let stats = {};

  try {
    stats = JSON.parse(
      localStorage.getItem('koraChallengeStats') || '{}'
    );
  } catch (error) {
    stats = {};
  }

  const gamesPlayed = document.getElementById('gamesPlayed');
  const bestScore = document.getElementById('bestScore');
  const totalPoints = document.getElementById('totalPoints');

  if (gamesPlayed) gamesPlayed.textContent = stats.gamesPlayed || 0;
  if (bestScore) bestScore.textContent = (stats.bestScore || 0) + '%';
  if (totalPoints) totalPoints.textContent = stats.totalPoints || 0;
}

// =====================================
// سلسلة الأيام
// =====================================

function getStreakData() {
  try {
    const data = JSON.parse(
      localStorage.getItem('koraChallengeStreak') || '{}'
    );

    return {
      days: Number(data.days) || 0,
      lastDate: data.lastDate || ''
    };
  } catch (error) {
    return { days: 0, lastDate: '' };
  }
}

const headerActions = document.querySelector('.header-actions');
let streakButton = document.getElementById('streakBadge');

if (headerActions && !streakButton) {
  streakButton = document.createElement('button');
  streakButton.id = 'streakBadge';
  streakButton.className = 'streak-button';
  streakButton.type = 'button';
  streakButton.title = 'سلسلة الأيام المتتالية';
  streakButton.setAttribute('aria-label', 'سلسلة الأيام المتتالية');
  headerActions.prepend(streakButton);
}

function updateStreakButton() {
  if (!streakButton) return;

  const streak = getStreakData();
  streakButton.textContent = '🔥 ' + streak.days;
  streakButton.title = 'سلسلة الأيام المتتالية: ' + streak.days + ' يوم';
  streakButton.setAttribute(
    'aria-label',
    'سلسلة الأيام المتتالية: ' + streak.days + ' يوم'
  );
}

updateStreakButton();

streakButton?.addEventListener('click', () => {
  const streak = getStreakData();

  showToast(
    streak.days
      ? '🔥 سلسلتك الحالية ' + streak.days + ' يوم!'
      : 'ابدأ تحدي خمن اللاعب علشان تبدأ سلسلتك! ⚽'
  );
});

// =====================================
// قائمة الإعدادات وزر الثلاث خطوط
// =====================================

const settingsToggle = document.getElementById('settingsToggle');
const menuToggle = document.getElementById('menuToggle');
const settingsPanel = document.getElementById('settingsPanel');
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsClose = document.getElementById('settingsClose');

const themeDark = document.getElementById('themeDark');
const themeLight = document.getElementById('themeLight');
const languageSelect = document.getElementById('languageSelect');

function openSettings() {
  if (!settingsPanel || !settingsOverlay) return;

  settingsPanel.classList.add('open');
  settingsOverlay.classList.add('open');
  settingsPanel.setAttribute('aria-hidden', 'false');

  settingsToggle?.setAttribute('aria-expanded', 'true');
  menuToggle?.setAttribute('aria-expanded', 'true');

  document.body.classList.add('settings-open');
}

function closeSettings() {
  if (!settingsPanel || !settingsOverlay) return;

  settingsPanel.classList.remove('open');
  settingsOverlay.classList.remove('open');
  settingsPanel.setAttribute('aria-hidden', 'true');

  settingsToggle?.setAttribute('aria-expanded', 'false');
  menuToggle?.setAttribute('aria-expanded', 'false');

  document.body.classList.remove('settings-open');
}

function toggleSettings() {
  if (settingsPanel?.classList.contains('open')) {
    closeSettings();
  } else {
    openSettings();
  }
}

settingsToggle?.addEventListener('click', toggleSettings);
menuToggle?.addEventListener('click', toggleSettings);
settingsClose?.addEventListener('click', closeSettings);
settingsOverlay?.addEventListener('click', closeSettings);

// =====================================
// المظهر الداكن والفاتح
// =====================================

function applyTheme(theme) {
  const selectedTheme = theme === 'light' ? 'light' : 'dark';

  root.dataset.theme = selectedTheme;

  try {
    localStorage.setItem('koraChallengeTheme', selectedTheme);
  } catch (error) {}

  if (themeDark) {
    const active = selectedTheme === 'dark';
    themeDark.classList.toggle('active', active);
    themeDark.setAttribute('aria-pressed', String(active));
  }

  if (themeLight) {
    const active = selectedTheme === 'light';
    themeLight.classList.toggle('active', active);
    themeLight.setAttribute('aria-pressed', String(active));
  }
}

themeDark?.addEventListener('click', () => applyTheme('dark'));
themeLight?.addEventListener('click', () => applyTheme('light'));

let savedTheme = 'dark';

try {
  savedTheme = localStorage.getItem('koraChallengeTheme') || 'dark';
} catch (error) {}

applyTheme(savedTheme);

// =====================================
// اللغة - الترجمة مؤجلة للمرحلة الأخيرة
// =====================================

function applyLanguage(language) {
  const supportedLanguages = ['ar', 'en', 'ru', 'de', 'ku', 'fr', 'es'];

  const selectedLanguage = supportedLanguages.includes(language)
    ? language
    : 'ar';

  root.lang = selectedLanguage;
  root.dir = ['ar', 'ku'].includes(selectedLanguage) ? 'rtl' : 'ltr';

  if (languageSelect) {
    languageSelect.value = selectedLanguage;
  }

  try {
    localStorage.setItem('koraChallengeLanguage', selectedLanguage);
  } catch (error) {}

  if (typeof window.koraTranslatePage === 'function') {
    window.koraTranslatePage(selectedLanguage);
  }
}

languageSelect?.addEventListener('change', () => {
  applyLanguage(languageSelect.value);
});

let savedLanguage = 'ar';

try {
  savedLanguage = localStorage.getItem('koraChallengeLanguage') || 'ar';
} catch (error) {}

applyLanguage(savedLanguage);

// =====================================
// الأندية الـ20
// =====================================

const clubs = [
  {
    name: 'برشلونة',
    country: 'إسبانيا',
    initials: 'BAR',
    logo: 'https://crests.football-data.org/81.png'
  },
  {
    name: 'ريال مدريد',
    country: 'إسبانيا',
    initials: 'RMA',
    logo: 'https://crests.football-data.org/86.png'
  },
  {
    name: 'ليفربول',
    country: 'إنجلترا',
    initials: 'LIV',
    logo: 'https://crests.football-data.org/64.png'
  },
  {
    name: 'مانشستر سيتي',
    country: 'إنجلترا',
    initials: 'MCI',
    logo: 'https://crests.football-data.org/65.png'
  },
  {
    name: 'مانشستر يونايتد',
    country: 'إنجلترا',
    initials: 'MUN',
    logo: 'https://crests.football-data.org/66.png'
  },
  {
    name: 'أرسنال',
    country: 'إنجلترا',
    initials: 'ARS',
    logo: 'https://crests.football-data.org/57.png'
  },
  {
    name: 'تشيلسي',
    country: 'إنجلترا',
    initials: 'CHE',
    logo: 'https://crests.football-data.org/61.png'
  },
  {
    name: 'توتنهام',
    country: 'إنجلترا',
    initials: 'TOT',
    logo: 'https://crests.football-data.org/73.png'
  },
  {
    name: 'إيه سي ميلان',
    country: 'إيطاليا',
    initials: 'ACM',
    logo: 'https://crests.football-data.org/98.png'
  },
  {
    name: 'إنتر ميلان',
    country: 'إيطاليا',
    initials: 'INT',
    logo: 'https://crests.football-data.org/108.png'
  },
  {
    name: 'يوفنتوس',
    country: 'إيطاليا',
    initials: 'JUV',
    logo: 'https://crests.football-data.org/109.png'
  },
  {
    name: 'بايرن ميونخ',
    country: 'ألمانيا',
    initials: 'BAY',
    logo: 'https://crests.football-data.org/5.png'
  },
  {
    name: 'بوروسيا دورتموند',
    country: 'ألمانيا',
    initials: 'BVB',
    logo: 'https://crests.football-data.org/4.png'
  },
  {
    name: 'باريس سان جيرمان',
    country: 'فرنسا',
    initials: 'PSG',
    logo: 'https://crests.football-data.org/524.png'
  },
  {
    name: 'أتلتيكو مدريد',
    country: 'إسبانيا',
    initials: 'ATM',
    logo: 'https://crests.football-data.org/78.png'
  },
  {
    name: 'نابولي',
    country: 'إيطاليا',
    initials: 'NAP',
    logo: 'https://crests.football-data.org/113.png'
  },
  {
    name: 'الأهلي المصري',
    country: 'مصر',
    initials: 'AHL',
    logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Al_Ahly_SC_logo.svg'
  },
  {
    name: 'الزمالك',
    country: 'مصر',
    initials: 'ZSC',
    logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Zamalek_SC_logo.svg'
  },
  {
    name: 'الهلال',
    country: 'السعودية',
    initials: 'HIL',
    logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Al-Hilal_SFC_Logo.svg'
  },
  {
    name: 'النصر',
    country: 'السعودية',
    initials: 'NAS',
    logo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Al-Nassr_FC_Logo.svg'
  }
];

// =====================================
// إنشاء نافذة اختيار النادي
// =====================================

let selectedClub = '';

try {
  selectedClub = localStorage.getItem('koraSelectedClub') || '';
} catch (error) {}

const clubModal = document.createElement('div');
clubModal.id = 'clubModal';
clubModal.className = 'club-modal-overlay';

clubModal.innerHTML = `
  <section class="club-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="clubModalTitle">

    <div class="club-modal-header">
      <h2 id="clubModalTitle">اختار ناديك المفضل ⚽</h2>
      <button type="button"
        class="club-modal-close"
        id="clubModalClose"
        aria-label="إغلاق">×</button>
    </div>

    <p>اختار ناديًا واحدًا. هنضيف أسئلة كل نادي في المرحلة القادمة.</p>

    <div class="club-grid" id="clubGrid"></div>

    <button type="button"
      class="club-confirm"
      id="clubConfirm"
      disabled>تأكيد اختيار النادي</button>
  </section>
`;

document.body.appendChild(clubModal);

const clubGrid = document.getElementById('clubGrid');
const clubConfirm = document.getElementById('clubConfirm');

function renderClubs() {
  if (!clubGrid) return;

  clubGrid.innerHTML = '';

  clubs.forEach(club => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'club-option';
    button.dataset.club = club.name;

    if (club.name === selectedClub) {
      button.classList.add('selected');
    }

    const logoWrap = document.createElement('span');
    logoWrap.className = 'club-logo-wrap';

    const fallback = document.createElement('span');
    fallback.className = 'club-logo-fallback';
    fallback.textContent = club.initials;

    const logo = document.createElement('img');
    logo.className = 'club-logo';
    logo.src = club.logo;
    logo.alt = 'شعار ' + club.name;
    logo.loading = 'lazy';

    logo.addEventListener('error', () => {
      logo.remove();
      if (!logoWrap.contains(fallback)) {
        logoWrap.appendChild(fallback);
      }
    }, { once: true });

    logoWrap.appendChild(logo);

    const name = document.createElement('span');
    name.className = 'club-name';
    name.textContent = club.name;

    const country = document.createElement('span');
    country.className = 'club-country';
    country.textContent = club.country;

    button.append(logoWrap, name, country);

    button.addEventListener('click', () => {
      selectedClub = club.name;

      clubGrid.querySelectorAll('.club-option').forEach(option => {
        option.classList.toggle(
          'selected',
          option.dataset.club === selectedClub
        );
      });

      clubConfirm.disabled = false;
    });

    clubGrid.appendChild(button);
  });

  clubConfirm.disabled = !selectedClub;
}

function openClubModal() {
  renderClubs();
  clubModal.classList.add('open');
  document.body.classList.add('settings-open');
}

function closeClubModal() {
  clubModal.classList.remove('open');
  document.body.classList.remove('settings-open');
}

document.getElementById('clubModalClose')
  ?.addEventListener('click', closeClubModal);

clubModal.addEventListener('click', event => {
  if (event.target === clubModal) {
    closeClubModal();
  }
});

clubConfirm.addEventListener('click', () => {
  if (!selectedClub) return;

  try {
    localStorage.setItem('koraSelectedClub', selectedClub);
  } catch (error) {
    showToast('تعذر حفظ النادي على الجهاز');
    return;
  }

  closeClubModal();
  showToast('تم اختيار ' + selectedClub + ' ❤️ الأسئلة هنضيفها قريبًا');
});

// =====================================
// الانتقال إلى الألعاب
// =====================================

document.querySelectorAll('[data-game]').forEach(button => {
  button.addEventListener('click', () => {
    const game = button.dataset.game;

    if (game === 'player') {
      window.location.href = 'guess-player.html';
    } else if (game === 'country') {
      showToast('تحدي خمن المنتخب هيكون متاح قريبًا 🌍');
    } else if (game === 'team') {
      showToast('لعبة تكوين الفريق هنعملها في الخطوات الجاية ⚽');
    } else if (game === 'favorite-club') {
      openClubModal();
    } else if (game === 'players60') {
      window.location.href = 'players-60.html';
    }
  });
});

// =====================================
// إغلاق النوافذ بزر Escape
// =====================================

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    closeSettings();
    closeClubModal();
  }
});

// =====================================
// تشغيل الموقع
// =====================================

loadStats();
