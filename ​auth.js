/* =========================================================
   Kora Challenge — نظام تسجيل الدخول (Firebase Auth)
   الاستخدام:
   - index.html:        <script src="auth.js" data-mode="gate">   (يعرض شاشة الدخول)
   - باقي صفحات الألعاب: <script src="auth.js">                   (حارس: يرجّع للرئيسية لو مش مسجّل)
   ========================================================= */
(() => {
  'use strict';

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyDEDLvC4wKI9_HX7WUG6th4zuUOwxxB54k",
    authDomain: "kora-e220c.firebaseapp.com",
    databaseURL: "https://kora-e220c-default-rtdb.firebaseio.com",
    projectId: "kora-e220c",
    storageBucket: "kora-e220c.firebasestorage.app",
    messagingSenderId: "535044321885",
    appId: "1:535044321885:web:b89615d5eb01a93e1613b4"
  };

  const HOME = 'index.html';
  const MODE = document.currentScript && document.currentScript.dataset.mode === 'gate' ? 'gate' : 'guard';
  const root = document.documentElement;

  // ---------- حالة الصفحة: pending | in | out ----------
  function setState(state) {
    root.classList.remove('auth-pending', 'auth-in', 'auth-out');
    root.classList.add('auth-' + state);
  }

  function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }

  // ---------- تهيئة Firebase ----------
  let auth = null;
  let initError = null;
  try {
    if (typeof firebase === 'undefined') throw new Error('Firebase SDK not loaded');
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
  } catch (e) {
    initError = e;
    console.error('[auth]', e);
  }

  // ---------- واجهة عامة ----------
  let ready = false;
  const listeners = [];
  const KoraAuth = {
    user: null,
    get name() {
      const u = this.user;
      if (!u) return '';
      return u.displayName || (u.email ? u.email.split('@')[0] : '') || 'لاعب';
    },
    onChange(cb) { listeners.push(cb); if (ready) cb(this.user); },
    signOut() { return auth ? auth.signOut() : Promise.resolve(); }
  };
  window.KoraAuth = KoraAuth;

  function safeNext() {
    const n = new URLSearchParams(location.search).get('next');
    return n && /^[A-Za-z0-9_-]+\.html$/.test(n) && n !== HOME ? n : null;
  }

  function toLogin() {
    const page = location.pathname.split('/').pop();
    location.replace(HOME + (page && page !== HOME ? '?next=' + encodeURIComponent(page) : ''));
  }

  // ---------- مهلة أمان لو Firebase ما ردّش ----------
  const timer = setTimeout(() => {
    if (ready) return;
    if (MODE === 'gate') {
      setState('out');
      whenReady(() => gateError('تعذّر الاتصال بالخادم. اتأكد من النت وجرّب تاني.'));
    } else {
      toLogin();
    }
  }, 10000);

  // ---------- مراقبة حالة الدخول ----------
  let holding = false; // بنوقف المعالجة أثناء إنشاء حساب جديد لحد ما الاسم يتحفظ

  function handleUser(user) {
    ready = true;
    clearTimeout(timer);
    KoraAuth.user = user;

    if (!user) {
      if (MODE === 'gate') { setState('out'); whenReady(resetGate); }
      else { toLogin(); return; }
    } else if (MODE === 'gate') {
      const next = safeNext();
      if (next) { location.replace(next); return; }
      setState('in');
      whenReady(renderUser);
    } else {
      setState('in');
    }
    listeners.forEach(cb => cb(user));
  }

  if (auth) {
    auth.onAuthStateChanged(user => { if (!holding) handleUser(user); });
  } else if (MODE === 'gate') {
    setState('out');
    whenReady(() => gateError('تعذّر تحميل نظام تسجيل الدخول. اتأكد من النت وافتح الموقع من استضافة (مش file://).'));
  } else {
    toLogin();
  }

  if (MODE !== 'gate') return;

  /* =====================================================
     من هنا فصاعدًا: خاص بصفحة index.html (شاشة الدخول)
     ===================================================== */

  const ERRORS = {
    'auth/invalid-email': 'البريد الإلكتروني مش مكتوب صح.',
    'auth/missing-email': 'اكتب بريدك الإلكتروني.',
    'auth/missing-password': 'اكتب كلمة المرور.',
    'auth/user-not-found': 'البريد أو كلمة المرور غلط.',
    'auth/wrong-password': 'البريد أو كلمة المرور غلط.',
    'auth/invalid-credential': 'البريد أو كلمة المرور غلط.',
    'auth/invalid-login-credentials': 'البريد أو كلمة المرور غلط.',
    'auth/email-already-in-use': 'البريد ده مسجّل قبل كده. جرّب تسجّل دخول.',
    'auth/weak-password': 'كلمة المرور ضعيفة. لازم 6 حروف على الأقل.',
    'auth/too-many-requests': 'محاولات كتير. استنى شوية وجرّب تاني.',
    'auth/network-request-failed': 'مشكلة في الاتصال بالنت. جرّب تاني.',
    'auth/user-disabled': 'الحساب ده متوقف.',
    'auth/popup-blocked': 'المتصفح منع نافذة جوجل. اسمح بالنوافذ المنبثقة وجرّب تاني.',
    'auth/operation-not-allowed': 'طريقة الدخول دي مش مفعّلة في Firebase (Authentication ← Sign-in method).',
    'auth/unauthorized-domain': 'دومين الموقع مش مضاف في Firebase (Authentication ← Settings ← Authorized domains).'
  };
  const SILENT = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];

  let tab = 'login';
  let els = {};

  function gateError(msg) { if (els.error) { els.error.textContent = msg; els.error.dataset.type = 'error'; } }
  function gateInfo(msg) { if (els.error) { els.error.textContent = msg; els.error.dataset.type = 'info'; } }
  function gateClear() { if (els.error) { els.error.textContent = ''; els.error.dataset.type = ''; } }

  function showAuthError(e) {
    console.error('[auth]', e);
    if (SILENT.includes(e.code)) return;
    gateError(ERRORS[e.code] || 'حصل خطأ غير متوقع. جرّب تاني.');
  }

  function setBusy(busy) {
    els.submit.disabled = busy;
    els.google.disabled = busy;
    els.submit.classList.toggle('loading', busy);
  }

  function setTab(next) {
    tab = next;
    const signup = tab === 'signup';
    els.tabs.forEach(b => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    els.nameField.hidden = !signup;
    els.forgot.hidden = signup;
    els.submit.textContent = signup ? 'إنشاء الحساب' : 'دخول';
    els.title.textContent = signup ? 'أنشئ حسابك' : 'أهلاً بيك تاني';
    els.sub.textContent = signup ? 'سجّل بياناتك وابدأ التحدي' : 'سجّل دخولك علشان تدخل الألعاب';
    els.pass.autocomplete = signup ? 'new-password' : 'current-password';
    gateClear();
  }

  function resetGate() {
    if (!els.form) return;
    els.form.reset();
    setTab('login');
    setBusy(false);
  }

  function renderUser() {
    document.querySelectorAll('[data-user-name]').forEach(el => { el.textContent = KoraAuth.name; });
  }

  whenReady(() => {
    els = {
      form: document.getElementById('authForm'),
      name: document.getElementById('authName'),
      nameField: document.getElementById('authNameField'),
      email: document.getElementById('authEmail'),
      pass: document.getElementById('authPass'),
      error: document.getElementById('authError'),
      submit: document.getElementById('authSubmit'),
      google: document.getElementById('authGoogle'),
      forgot: document.getElementById('authForgot'),
      title: document.getElementById('authTitle'),
      sub: document.getElementById('authSub'),
      tabs: Array.from(document.querySelectorAll('.auth-tab'))
    };
    if (!els.form) return;

    if (initError) gateError('تعذّر تحميل نظام تسجيل الدخول. اتأكد من النت وافتح الموقع من استضافة (مش file://).');

    els.tabs.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

    els.form.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (!auth) return gateError('نظام تسجيل الدخول مش متاح دلوقتي.');
      gateClear();

      const email = els.email.value.trim();
      const pass = els.pass.value;
      const name = els.name.value.trim();
      const signup = tab === 'signup';

      if (!email) return gateError(ERRORS['auth/missing-email']);
      if (!pass) return gateError(ERRORS['auth/missing-password']);
      if (signup && name.length < 2) return gateError('اكتب اسمك (حرفين على الأقل).');
      if (signup && pass.length < 6) return gateError(ERRORS['auth/weak-password']);

      setBusy(true);
      try {
        if (signup) {
          holding = true;
          const cred = await auth.createUserWithEmailAndPassword(email, pass);
          try { await cred.user.updateProfile({ displayName: name }); } catch (e) { console.error(e); }
          holding = false;
          handleUser(auth.currentUser);
        } else {
          await auth.signInWithEmailAndPassword(email, pass);
        }
      } catch (e) {
        holding = false;
        showAuthError(e);
      } finally {
        setBusy(false);
      }
    });

    els.google.addEventListener('click', async () => {
      if (!auth) return gateError('نظام تسجيل الدخول مش متاح دلوقتي.');
      gateClear();
      setBusy(true);
      try {
        await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      } catch (e) {
        showAuthError(e);
      } finally {
        setBusy(false);
      }
    });

    els.forgot.addEventListener('click', async () => {
      if (!auth) return;
      const email = els.email.value.trim();
      if (!email) return gateError('اكتب بريدك الأول وبعدين اضغط "نسيت كلمة المرور".');
      try {
        await auth.sendPasswordResetEmail(email);
        gateInfo('بعتنا لك رابط إعادة تعيين كلمة المرور على بريدك.');
      } catch (e) {
        showAuthError(e);
      }
    });

    document.querySelectorAll('[data-logout]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await KoraAuth.signOut();
          if (typeof window.showToast === 'function') window.showToast('تم تسجيل الخروج 👋');
        } catch (e) { console.error(e); }
      });
    });

    setTab('login');
    if (ready) renderUser();
  });
})();
