# الحماية في Kora Challenge

## اللي اتعمل في الكود
- **`kora-security.js`**: تنضيف أي نص (حروف تحكم وحروف عكس الاتجاه الخفية)، تحديد معدل الإرسال، التأكد من ملفات الصوت والصور.
- **Content-Security-Policy** و**Referrer-Policy** في كل الصفحات: بتمنع تحميل سكريبتات من أي مكان غير Google/Firebase وبتقفل `object` و`base`.
- كل النصوص الجاية من المستخدمين بتتعرض بـ`textContent` (مش `innerHTML`).
- الصور المرفوعة: أنواع محددة بس (png/jpeg/webp/gif)، والحجم محدود، وبتتعاد رسمها على canvas (بيشيل أي حاجة مخفية).
- الشات: حد أقصى 200 حرف، رسالة كل 2 ثانية، 8 رسايل كل 30 ثانية، والرسالة الصوتية 30 ثانية بحد أقصى.

## الخطوات اللي لازم تعملها إنت في Firebase Console (مهم جدًا)
1. **Realtime Database ← Rules**: الصق محتوى `database.rules.json` وانشر.
   - لو لعبة myteem بتتأثر، عدّل جزء `rooms` بس بحسب الحقول عندك.
2. **Authentication ← Settings ← Authorized domains**: سيب دومين موقعك بس.
3. **Google Cloud Console ← APIs & Services ← Credentials ← API key**:
   - Application restrictions: **HTTP referrers** وحط `https://ms2355416-blip.github.io/*`.
   - API restrictions: فعّل بس (Identity Toolkit, Token Service, Firebase Realtime Database).
4. **App Check** (reCAPTCHA v3) على Realtime Database: بيمنع أي سكريبت من برة الموقع يستخدم قاعدة بياناتك.
5. **Authentication ← Settings**: فعّل *Email enumeration protection*، وحدّد عدد التسجيلات من نفس الـIP.

## ملاحظات صريحة
- مفتاح Firebase (`apiKey`) في الكود **مش سر**، ده معرّف عام. الحماية الحقيقية هي القواعد (Rules) والقيود اللي فوق، مش إخفاء المفتاح.
- النقاط بتتحسب في المتصفح، فأي حد يعرف يعدّلها محليًا. القواعد بتحدد أقصى زيادة لكل كتابة (3000 نقطة، وبفاصل 1.5 ثانية) عشان تصعّب الغش، لكن المنع الكامل محتاج Cloud Function تحسب النقاط على السيرفر.
- الـCSP بيسمح بـ`'unsafe-inline'` عشان في سكريبتات داخل الصفحات. لو عايز تشددها لازم تنقل الكود ده لملفات خارجية.
