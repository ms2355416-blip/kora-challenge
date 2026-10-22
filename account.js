/* Kora Challenge — حساب المستخدم (صورة البروفايل + تغيير الاسم)
   بيتحمّل في كل صفحة فيها لوحة إعدادات (#settingsPanel) */
(() => {
  'use strict';

  const NAME_MIN = 2;
  const NAME_MAX = 20;
  const PHOTO_SIZE = 256;
  const MAX_FILE_MB = 10;

  let user = null;
  let photo = '';
  const els = {};

  const $ = (selector, root = document) => root.querySelector(selector);

  const ICONS = {
    camera: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.6-2.5h6.8L17 8h3v11H4Z"/><circle cx="12" cy="13" r="3.6"/></svg>',
    pencil: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19Z"/><path d="m14.5 6.5 3 3"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5"/><path d="M15 8l4 4-4 4M19 12H9"/></svg>'
  };

  // ---------- رسالة صغيرة ----------
  let toastEl = null;
  function toast(message, isError) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'acc-toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.toggle('error', !!isError);
    toastEl.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  // ---------- اسم المستخدم ----------
  function currentName() {
    if (!user) return '';
    return user.displayName || (user.email ? user.email.split('@')[0] : '') || 'لاعب';
  }

  function initial(name) {
    return (Array.from(name.trim())[0] || '⚽').toUpperCase();
  }

  // ---------- الصورة ----------
  const photoKey = () => 'koraProfilePhoto:' + user.uid;

  function isValidPhoto(value) {
    return typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(value) && value.length < 400000;
  }

  function fillAvatar(box, name) {
    box.textContent = '';
    if (photo) {
      const img = document.createElement('img');
      img.alt = '';
      img.src = photo;
      box.appendChild(img);
    } else {
      box.textContent = initial(name);
    }
  }

  function render() {
    if (!user) return;
    const name = currentName();
    fillAvatar(els.avatar, name);
    if (els.headBtn) fillAvatar(els.headBtn, name);
    els.nameText.textContent = name;
    els.email.textContent = user.email || '';
    els.remove.hidden = !photo;
    document.querySelectorAll('[data-user-name]').forEach(el => { el.textContent = name; });
  }

  function dbRef(path) {
    try {
      if (typeof firebase !== 'undefined' && firebase.database) {
        return firebase.database().ref('users/' + user.uid + '/' + path);
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function loadRemotePhoto() {
    const ref = dbRef('photo');
    if (!ref) return;
    ref.once('value').then(snap => {
      const value = snap.val();
      if (isValidPhoto(value) && value !== photo) {
        photo = value;
        try { localStorage.setItem(photoKey(), photo); } catch (e) { /* ignore */ }
        render();
      }
    }).catch(() => { /* القواعد ممكن تمنع القراءة، نكمل بالنسخة المحلية */ });
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = PHOTO_SIZE;
        canvas.getContext('2d').drawImage(
          img,
          (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,
          0, 0, PHOTO_SIZE, PHOTO_SIZE
        );
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('bad image')); };
      img.src = url;
    });
  }

  async function onPickPhoto() {
    const file = els.file.files && els.file.files[0];
    els.file.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) return toast('اختار ملف صورة بس', true);
    if (file.size > MAX_FILE_MB * 1024 * 1024) return toast('الصورة كبيرة، اختار صورة أقل من ' + MAX_FILE_MB + ' ميجا', true);

    try {
      photo = await resizeImage(file);
    } catch (e) {
      return toast('تعذّر قراءة الصورة، جرّب صورة تانية', true);
    }

    try { localStorage.setItem(photoKey(), photo); } catch (e) { /* ignore */ }
    render();

    const ref = dbRef('photo');
    if (!ref) return toast('اتحفظت الصورة على جهازك');
    ref.set(photo).then(
      () => toast('تم تحديث صورتك ✅'),
      () => toast('اتحفظت الصورة على الجهاز ده بس', true)
    );
  }

  function removePhoto() {
    photo = '';
    try { localStorage.removeItem(photoKey()); } catch (e) { /* ignore */ }
    render();
    const ref = dbRef('photo');
    if (ref) ref.remove().catch(() => {});
    toast('تم حذف الصورة');
  }

  // ---------- تعديل الاسم ----------
  function openNameEdit() {
    els.nameRow.hidden = true;
    els.form.hidden = false;
    els.input.value = currentName();
    els.input.focus();
    els.input.select();
  }

  function closeNameEdit() {
    els.form.hidden = true;
    els.nameRow.hidden = false;
  }

  async function saveName(event) {
    event.preventDefault();
    const name = els.input.value.replace(/\s+/g, ' ').trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      return toast('الاسم لازم يكون من ' + NAME_MIN + ' إلى ' + NAME_MAX + ' حرف', true);
    }
    if (name === currentName()) return closeNameEdit();

    els.save.disabled = true;
    try {
      await user.updateProfile({ displayName: name });
      const ref = dbRef('name');
      if (ref) ref.set(name).catch(() => {});
      closeNameEdit();
      render();
      toast('تم تحديث اسمك ✅');
    } catch (e) {
      toast('تعذّر حفظ الاسم، جرّب تاني', true);
    } finally {
      els.save.disabled = false;
    }
  }

  // ---------- فتح لوحة الإعدادات ----------
  function openPanel() {
    const panel = $('#settingsPanel');
    const overlay = $('#settingsOverlay');
    if (!panel || !overlay) return;
    panel.classList.add('open');
    overlay.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    document.body.classList.add('settings-open');
  }

  // ---------- بناء الواجهة ----------
  function build() {
    const panel = $('#settingsPanel');
    if (!panel) return;

    // نشيل صندوق الحساب القديم (موجود في الرئيسية بس)
    const oldBox = $('.account-box', panel);
    if (oldBox) (oldBox.closest('.setting-group') || oldBox).remove();

    const card = document.createElement('section');
    card.className = 'acc-card';
    card.setAttribute('aria-label', 'حسابك');
    card.innerHTML =
      '<div class="acc-avatar-wrap">' +
        '<div class="acc-avatar" id="accAvatar"></div>' +
        '<button class="acc-cam" type="button" title="تغيير الصورة" aria-label="تغيير الصورة">' + ICONS.camera + '</button>' +
        '<input type="file" id="accFile" accept="image/*" hidden>' +
      '</div>' +
      '<div class="acc-name-row">' +
        '<strong class="acc-name" id="accName"></strong>' +
        '<button class="acc-edit" type="button" title="تعديل الاسم" aria-label="تعديل الاسم">' + ICONS.pencil + '</button>' +
      '</div>' +
      '<form class="acc-name-edit" hidden>' +
        '<input type="text" id="accInput" maxlength="' + NAME_MAX + '" autocomplete="nickname" placeholder="اسم المستخدم" aria-label="اسم المستخدم">' +
        '<button class="acc-save" type="submit">حفظ</button>' +
        '<button class="acc-cancel" type="button">إلغاء</button>' +
      '</form>' +
      '<small class="acc-email"></small>' +
      '<button class="acc-remove" type="button" hidden>حذف الصورة</button>';

    const heading = $('.settings-heading', panel);
    if (heading) heading.after(card); else panel.prepend(card);

    els.avatar = $('#accAvatar', card);
    els.file = $('#accFile', card);
    els.nameRow = $('.acc-name-row', card);
    els.nameText = $('#accName', card);
    els.form = $('.acc-name-edit', card);
    els.input = $('#accInput', card);
    els.save = $('.acc-save', card);
    els.email = $('.acc-email', card);
    els.remove = $('.acc-remove', card);

    $('.acc-cam', card).addEventListener('click', () => els.file.click());
    els.avatar.addEventListener('click', () => els.file.click());
    els.avatar.style.cursor = 'pointer';
    els.file.addEventListener('change', onPickPhoto);
    $('.acc-edit', card).addEventListener('click', openNameEdit);
    $('.acc-cancel', card).addEventListener('click', closeNameEdit);
    els.form.addEventListener('submit', saveName);
    els.remove.addEventListener('click', removePhoto);

    // تسجيل الخروج في آخر اللوحة
    const logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'acc-logout';
    logout.innerHTML = ICONS.logout + '<span>تسجيل الخروج</span>';
    logout.addEventListener('click', () => firebase.auth().signOut());
    const note = $('.settings-note', panel);
    if (note) note.before(logout); else panel.appendChild(logout);

    // صورة الحساب في الهيدر
    const actions = $('.header-actions');
    if (actions) {
      els.headBtn = document.createElement('button');
      els.headBtn.type = 'button';
      els.headBtn.className = 'acc-head-btn';
      els.headBtn.title = 'حسابي';
      els.headBtn.setAttribute('aria-label', 'حسابي');
      els.headBtn.setAttribute('aria-controls', 'settingsPanel');
      els.headBtn.addEventListener('click', openPanel);
      actions.prepend(els.headBtn);
    }
  }

  // ---------- تشغيل ----------
  function start() {
    // نظبط اللغة القديمة (الكردية اتشالت)
    try {
      if (localStorage.getItem('koraChallengeLanguage') === 'ku') {
        localStorage.setItem('koraChallengeLanguage', 'ar');
      }
    } catch (e) { /* ignore */ }

    if (typeof firebase === 'undefined' || !$('#settingsPanel')) return;

    let started = false;
    firebase.auth().onAuthStateChanged(u => {
      if (!u) return;
      user = u;
      if (!started) {
        started = true;
        build();
      }
      try { photo = localStorage.getItem(photoKey()) || ''; } catch (e) { photo = ''; }
      if (!isValidPhoto(photo)) photo = '';
      render();
      loadRemotePhoto();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
