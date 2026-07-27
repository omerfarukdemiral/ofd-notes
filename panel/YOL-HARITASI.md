# Müzik Hackathon — Durum ve Yol Haritası

FAZ 1 dokümanı iki yarıdan oluşuyor: **admin paneli** (bölüm 5, 7-admin ve
1/4'ün yönetim tarafı) ve **halka açık site + üye alanı** (bölüm 2, 3, 4, 6,
7-üye ve kayıt/doğrulama akışı).

**Bu depoda panel yarısı yazıldı ve test edildi. Site yarısı henüz yazılmadı.**
Aşağıdaki matris her maddeyi tek tek gösteriyor.

Durum işaretleri: ✅ tam · ⚠️ kısmi (dış servis bekliyor) · ❌ yazılmadı ·
🗄️ yalnızca veri modeli hazır

---

## Bölüm 1 — Üyelik yapısı

| Madde | Durum | Not |
|---|---|---|
| Üç üyelik durumu (Ziyaretçi / Üye / Admin) | ⚠️ | `User.role` = MEMBER \| ADMIN; ziyaretçi = hesapsız. Panel tarafı uygulanıyor, site tarafı erişim kuralları yazılmadı |
| Kayıt formu: Ad Soyad, E-posta, Telefon, Şifre, Doğum Tarihi, Şehir, KVKK onayı | 🗄️ | 7 alanın tamamı `User` modelinde; kayıt ekranı site uygulamasında olacak |
| E-posta/SMS doğrulama kodu | 🗄️ | `VerificationCode` modeli hazır (kanal, hash, son kullanma, deneme sayacı); akış yazılmadı |
| Admin'in siteyi yönetmesi | ⚠️ | Başvuru/etkinlik/üye/kupon yönetimi ✅; içerik yönetimi (SSS, arşiv, hero) ekranları ❌ |

## Bölüm 2 — Genel sayfa düzeni (halka açık site)

| Madde | Durum | Not |
|---|---|---|
| Sabit üst menü, logo, gezinme, "Hemen Başvur" | ❌ | Site uygulaması |
| 1.1 Hackathon tanıtımı (42 saat / stüdyo-mentör / ödüller) | ❌ | Statik içerik |
| 1.2 Arşiv: yıl sekmeleri, fotoğraf, video, gruplar, dereceler, müzik çalar | 🗄️ | `ArchiveEntry` modeli tüm alanları taşıyor; arayüz ❌ |
| 1.3 Webinar listesi + kayıt ol | 🗄️ | `Event` modeli ✅, panelden yönetiliyor ✅, site listesi ❌ |
| 1.4 SSS açılır-kapanır kartlar | 🗄️ | `FaqItem` modeli ✅, arayüz ❌ |
| 2. Hero + geri sayım sayacı | 🗄️ | `SiteSetting.countdown_target` ✅, arayüz ❌ |
| 3. Footer: logolar, KVKK, sosyal medya | ❌ | Site uygulaması |

## Bölüm 3 — Ziyaretçi erişimi

| Madde | Durum |
|---|---|
| Ziyaretçinin görebileceği 10 bölüm | ❌ site |
| Göremeyeceği 5 madde (webinar, başvuru formu, kupon, profil) | ❌ site |

## Bölüm 4 — Üyenin yapabilecekleri

| Madde | Durum | Not |
|---|---|---|
| Başvuru yapabilir (grup formu, demo yükleme, onaylar) | ❌ | Site; panel bu verinin yönetimini yapıyor ✅ |
| Atölyeye kaydolabilir, kontenjan dolarsa bekleme listesi | 🗄️ | `Event.capacity` + `waitlistEnabled` + `EventRegistration.status=WAITLIST` modellendi |
| Webinara kayıt olabilir | 🗄️ | Aynı model |
| Kuponlarını görebilir | 🗄️ | `UserCoupon` ✅, panelden dağıtım ✅, üye ekranı ❌ |
| "Profilim" ekranı | ❌ | Site |
| E-posta/SMS bilgilendirme alır | ⚠️ | Akış ve kayıt ✅, gerçek gönderim sağlayıcısı ❌ |

## Bölüm 5 — Admin başvuru yönetimi  ← **panelin ana kapsamı**

| Madde | Durum | Nerede |
|---|---|---|
| Başvuruları aç/kapat | ✅ | `/panel/form-ayarlari` |
| Belirli tarihte otomatik kapanma | ✅ | `ApplicationSettings.closesAt` + `isApplicationWindowOpen()` |
| Form alanlarını admin ekleyip çıkarabilir | ✅ | `ApplicationFormField` CRUD; sistem alanları korunuyor |
| Yeni müzikal rol ekleme | ✅ | `MusicalRole` ekle/pasife al |
| Min/maks grup üyesi belirleme | ✅ | Doğrulamalı (maks < min reddediliyor) |
| Başvuru listesi: grup adı, üyeler (isim/yaş/şehir/rol), demo | ✅ | `/panel/basvurular` + detay |
| Demo şarkıyı panelden dinleme/indirme | ⚠️ | Oynatıcı ve indirme bağlantısı hazır; dosya depolama bağlanmadı, demo **linki** çalışıyor |
| Filtreleme: şehir, üye sayısı, rol | ✅ | Ayrıca durum ve serbest metin araması |
| Durum atama: Beklemede / Onaylandı / Elendi / Finale Kaldı | ✅ | Değişiklikler `ApplicationStatusLog`'a düşüyor |
| Durum değişince gruba otomatik bildirim | ✅ | Tüm kayıtlı üyeler veya yalnızca iletişim sorumlusu seçilebiliyor |
| Toplu mesaj (ör. finale kalan tüm gruplara) | ✅ | `/panel/bildirimler` |
| Gerçek e-posta/SMS gönderimi | ⚠️ | Sağlayıcı arayüzü hazır, uygulama log'a yazıyor |
| KVKK/FSEK onayı ve zaman damgası görüntüleme | ✅ | Başvuru detayında |
| Dashboard sayıları | ✅ | `/panel` ve `/panel/raporlar` |
| Excel indirme | ✅ | `Gruplar` + `Üyeler` sayfalı `.xlsx`, aktif filtreyi uyguluyor |

## Bölüm 6 — Başvuru sayfası erişimi

| Madde | Durum | Not |
|---|---|---|
| Ziyaretçiye önce "Üye Ol / Giriş Yap" ekranı | ❌ | Site; panelde aynı desen `/giris?next=…` ile uygulanmış durumda |
| Form içeriği ziyaretçiye hiç gösterilmez | ❌ | Site |
| Giriş sonrası otomatik forma yönlendirme | ❌ | Site |

## Bölüm 7 — Webinar modülü

**Admin tarafı — tamamı yazıldı:**

| Madde | Durum |
|---|---|
| Yeni etkinlik oluşturma | ✅ |
| Ad, açıklama, eğitmen, tarih/saat, kapak görseli | ✅ |
| Düzenleme ve silme | ✅ |
| Kim, ne zaman kayıt oldu listesi | ✅ (+ kayıt durumu değiştirme) |

**Üye tarafı — yazılmadı:** kart listesi, "Katıl" butonu, otomatik kayıt,
"Profilim"den takip. Veri modeli hepsini destekliyor.

---

## Özet

| Kapsam | Durum |
|---|---|
| Bölüm 5 (admin başvuru yönetimi) | 15 maddenin 13'ü tam, 2'si dış servis bekliyor |
| Bölüm 7 admin | 4/4 tam |
| Bölüm 1/4'ün yönetim tarafı | Tam (üye listesi, doğrulama durumu, kupon dağıtımı) |
| Bölüm 2, 3, 6, 7-üye ve kayıt akışı | Yazılmadı — ayrı site uygulaması |
| İçerik yönetimi ekranları (SSS, arşiv, hero) | Model var, panel arayüzü yok |

Panelin doğrulaması: `npm run e2e` — 126 kontrol, tamamı geçiyor
(kimlik/yetki, tüm filtreler, Excel içeriği, her server action, sayfalama,
mobil/tablet taşma, koyu tema).

---

## Kalan iş

### Paneli tamamlayan işler

1. **Dosya yükleme** — demo şarkı için depolama (S3 uyumlu veya yerel disk),
   `Application.demoFileUrl` doldurulacak, oynatıcı aktifleşecek.
2. **E-posta/SMS sağlayıcısı** — `src/lib/notify/provider.ts` içine SMTP
   (Resend/Postmark) ve SMS (Netgsm/İleti Merkezi) uygulaması.
3. **Gönderim kuyruğu** — alıcı sayısı birkaç yüzü aşınca istek içinde
   gönderim yetmez; `NotificationRecipient` satırlarını tüketen arka plan
   işçisi. Veri modeli hazır.
4. **İçerik yönetimi ekranları** — `FaqItem`, `ArchiveEntry`, `SiteSetting`
   için CRUD arayüzleri.
5. **Denetim kaydı ekranı** — `AuditLog` yazılıyor ama görüntülenmiyor.
6. **Kupon tetikleyicilerinin otomatik çalışması** — tanımlar hazır; üye
   tarafı başvuru/kayıt akışları yazılınca devreye girecek.

### Ziyaretçi + üye tarafı (ayrı uygulama)

Panel ile aynı veritabanını ve Prisma şemasını kullanacak ikinci bir Next.js
uygulaması: bölüm 2, 3, 4, 6 ve 7-üye. Paylaşılan şemayı iki uygulamanın da
kullanabilmesi için monorepo'ya (`apps/panel`, `apps/site`, `packages/db`)
geçmek mantıklı olur.

---

## Üretime alma kontrol listesi

- [ ] `SESSION_SECRET` üretimde rastgele üretilmiş bir değere ayarlandı
- [ ] `DATABASE_URL` PostgreSQL'e çevrildi, `db:deploy` çalıştırıldı
- [ ] Seed'in oluşturduğu örnek admin ve `uye*@example.com` hesapları silindi
- [ ] E-posta/SMS sağlayıcısı bağlandı ve test gönderimi yapıldı
- [ ] Dosya depolama bağlandı, yükleme boyut/tip sınırları konuldu
- [ ] Panel giriş ekranına hız sınırı (rate limit) eklendi
- [ ] Yedekleme ve KVKK saklama süresi politikası tanımlandı
