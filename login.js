/* Kora Challenge — صفحة تسجيل الدخول (Firebase Auth) */
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

  const $ = id => document.getElementById(id);
  const els = {
    form: $('authForm'), name: $('authName'), nameField: $('authNameField'),
    email: $('authEmail'), pass: $('authPass'), error: $('authError'),
    submit: $('authSubmit'), google: $('authGoogle'), forgot: $('authForgot'),
    title: $('authTitle'), sub: $('authSub'),
    tabs: Array.from(document.querySelectorAll('.auth-tab'))
  };

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

  const setMsg = (msg, type) => { els.error.textContent = msg; els.error.dataset.type = type || ''; };
  const fail = msg => setMsg(msg, 'error');
  const clear = () => setMsg('', '');

  // ---------- Firebase ----------
  let auth = null;
  try {
    if (typeof firebase === 'undefined') throw new Error('Firebase SDK not loaded');
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
  } catch (e) {
    console.error(e);
    fail('تعذّر تحميل نظام تسجيل الدخول. اتأكد من النت وجرّب تاني.');
  }

  // ---------- الوجهة بعد الدخول ----------
  function destination() {
    const n = new URLSearchParams(location.search).get('next');
    return n && /^[A-Za-z0-9_-]+\.html$/.test(n) && n !== 'login.html' ? n : 'index.html';
  }

  let holding = false; // أثناء إنشاء حساب جديد نستنى حفظ الاسم قبل التحويل
  if (auth) {
    auth.onAuthStateChanged(user => {
      if (user && !holding) location.replace(destination());
    });
  }

  // ---------- التبويبات ----------
  let tab = 'login';
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
    clear();
  }
  els.tabs.forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  function setBusy(busy) {
    els.submit.disabled = busy;
    els.google.disabled = busy;
  }

  function showAuthError(e) {
    console.error(e);
    if (SILENT.includes(e.code)) return;
    fail(ERRORS[e.code] || 'حصل خطأ غير متوقع. جرّب تاني.');
  }

  // ---------- دخول / تسجيل ----------
  els.form.addEventListener('submit', async ev => {
    ev.preventDefault();
    if (!auth) return fail('نظام تسجيل الدخول مش متاح دلوقتي.');
    clear();

    const email = els.email.value.trim();
    const pass = els.pass.value;
    const name = els.name.value.trim();
    const signup = tab === 'signup';

    if (!email) return fail(ERRORS['auth/missing-email']);
    if (!pass) return fail(ERRORS['auth/missing-password']);
    if (signup && name.length < 2) return fail('اكتب اسمك (حرفين على الأقل).');
    if (signup && pass.length < 6) return fail(ERRORS['auth/weak-password']);

    setBusy(true);
    try {
      if (signup) {
        holding = true;
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        try { await cred.user.updateProfile({ displayName: name }); } catch (e) { console.error(e); }
        location.replace(destination());
      } else {
        await auth.signInWithEmailAndPassword(email, pass);
      }
    } catch (e) {
      holding = false;
      showAuthError(e);
      setBusy(false);
    }
  });

  // ---------- جوجل ----------
  els.google.addEventListener('click', async () => {
    if (!auth) return fail('نظام تسجيل الدخول مش متاح دلوقتي.');
    clear();
    setBusy(true);
    try {
      await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    } catch (e) {
      showAuthError(e);
      setBusy(false);
    }
  });

  // ---------- نسيت كلمة المرور ----------
  els.forgot.addEventListener('click', async () => {
    if (!auth) return;
    const email = els.email.value.trim();
    if (!email) return fail('اكتب بريدك الأول وبعدين اضغط "نسيت كلمة المرور".');
    try {
      await auth.sendPasswordResetEmail(email);
      setMsg('بعتنا لك رابط إعادة تعيين كلمة المرور على بريدك.', 'info');
    } catch (e) {
      showAuthError(e);
    }
  });
})();
