# مسار 3D — خرائط وملاحة GPS ثلاثية الأبعاد (PWA)

كل الملفات في المجلد الرئيسي مباشرة (بدون مجلدات فرعية) لتعمل على GitHub Pages.

## النشر على GitHub Pages
1. أنشئ مستودعاً جديداً وارفع **محتويات** الـ ZIP (الملفات نفسها وليس مجلداً يحتويها).
2. Settings ← Pages ← Branch: `main` / root ← Save.
3. افتح الرابط من الهاتف عبر HTTPS (مطلوب لـ GPS والتثبيت).

## صورة QR
ضع صورتك باسم `qr.png` بجانب `index.html`. إن لم توجد، يولّد التطبيق رمزاً تلقائياً لرابط الصفحة.

## الملفات
index.html · style.css · app.js (محرك التطبيق) · manifest.json · sw.js · icon.png (512) · icon-192.png · icon-maskable.png · maplibre-gl.js/css (مكتبة الخرائط، محلية للعمل دون إنترنت)

## المصادر
MapLibre GL JS · OpenFreeMap (OpenMapTiles) · Terrarium DEM · OSRM · Overpass API · Nominatim · خط Cairo (Google Fonts) — © مساهمو OpenStreetMap.

## ملاحظات
- خوادم OSRM وOverpass وNominatim العامة للاستخدام الخفيف؛ للإنتاج الكثيف استخدم خادمك الخاص.
- يعمل التوجيه الصوتي بصوت عربي إن كان متوفراً في الجهاز.
- وضع «محاكاة» يجرّب التوجيه دون الحاجة للتحرك فعلياً.
