# NFC Defterim

Android için basit bir NFC kayıt uygulaması: okuttuğun etiket/kartı kaydeder,
listeden görmeni sağlar; eğer etiket kilitli değilse içeriğini boş bir
etikete yazabilir veya telefonunu o etiket gibi okutabilirsin.

## Nasıl çalışır

1. **Okut ve kaydet** — Ana ekrandaki büyük düğmeye basıp bir etiket/kart
   okutursun. Uygulama iki türden birini tespit eder:
   - **Yazılabilir NFC etiketi**: içeriği okunabildi, kaydedilir; istersen
     boş etikete yazabilir veya telefonunu bu etiket gibi "aktif" yapıp
     kullanabilirsin.
   - **Kilitli/özel kart** (kapı kartı, İstanbulkart gibi): sadece kimlik
     numarası (UID) kaydedilir. Bu kartlar şifreli olduğu için içerik
     okunamaz, klonlanamaz veya taklit edilemez — bu, Android'in ve bu
     kartların güvenlik tasarımının bir sınırıdır.
2. **Liste** — Tüm kayıtları görürsün, isim değiştirebilir veya silebilirsin.
3. **Boş etikete yaz** — Sadece "yazılabilir" kayıtlarda görünür. Boş bir
   NTAG/Mifare Ultralight etiketi okutup aynı içeriği yazarsın.
4. **Telefonla kullan** — Sadece "yazılabilir" kayıtlarda ve cihaz HCE
   (Host Card Emulation) destekliyorsa görünür. Aktif ettiğinde, telefonun
   o kayıttaki veriyle bir NFC etiketi gibi okutulabilir.
5. **QR kod oluştur** — Metin, bağlantı, Wi-Fi, kişi, telefon, SMS veya
   konum bilgisinden QR kod üretir (ana ekrandan erişilir).
6. **Kalıcı kilitleme** — Yazılabilir bir etiketi bir daha değiştirilemeyecek
   şekilde kilitler. **Bu işlem geri alınamaz.**
7. **Flipper Zero'ya aktarma (.nfc)** — Mifare Ultralight/NTAG ailesi
   etiketler için, etiketten gerçekten okunan ham sayfa verisiyle bir
   `.nfc` dosyası oluşturur ve paylaşır. Signature/Version/Counter gibi
   okunmayan alanlar dosyada yer almaz — bu yüzden "en iyi gayret" bir
   dışa aktarımdır, gerçek Flipper cihazında test edilmelidir.

## Önemli sınır

Kapı kartı ve İstanbulkart gibi kilitli/şifreli kartlar için "boş etikete
yaz" ve "telefonla kullan" seçenekleri **çalışmaz ve gösterilmez**. Bu
teknik bir sınırdır: Android'in kart öykünme özelliği bu tür şifreli
kartları taklit edemez, ayrıca bu kartlar kopyalanmaya karşı özellikle
korunur.

## APK nasıl alınır (bilgisayar gerekmez)

Bu depo, koda her gönderim yapıldığında GitHub Actions ile buluta otomatik
APK derler ve "Releases" sayfasına yükler:

1. GitHub'da bu depoya gir → sağ taraftaki **Releases** bağlantısına tıkla.
2. En üstteki (en yeni) sürümün altındaki `.apk` dosyasına dokun, indir.
3. Telefonunda indirilen dosyayı aç; "bilinmeyen kaynaklardan yükleme" izni
   istenirse ver ve kur.

Elle derlemek istersen: depodaki **Actions** sekmesine girip
"Android APK Derle" iş akışını seç, **Run workflow** düğmesine bas.

## Geliştirme (opsiyonel, teknik bilgi gerektirir)

```bash
npm install
npx expo install --fix
npx expo prebuild -p android
cd android && ./gradlew assembleDebug
```

NFC okuma/yazma gerçek bir cihazda test edilmelidir (emülatörde NFC yoktur).
