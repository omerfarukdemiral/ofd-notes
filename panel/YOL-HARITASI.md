# Müzik Hackathon — Yol Haritası

FAZ 1 dokümanının panele düşen kısmı bu depoda çalışır durumda. Bu belge,
dokümandaki her maddenin nerede karşılandığını ve kalan işi gösteriyor.

## 1. Gereksinim eşlemesi

### Bölüm 5 — Başvuru sayfasının admin tarafından yönetilmesi

| Doküman maddesi | Durum | Nerede |
|---|---|---|
| Başvuruları aç/kapat | ✅ | `/panel/form-ayarlari` |
| Belirli tarihte otomatik kapanma | ✅ | `ApplicationSettings.closesAt` + `isApplicationWindowOpen()` |
| Form alanlarını ekle/çıkar | ✅ | `ApplicationFormField` CRUD |
| Yeni müzikal rol ekleme | ✅ | `MusicalRole` CRUD |
| Min/maks grup üyesi | ✅ | `ApplicationSettings.minMembers/maxMembers` |
| Grup başvuru listesi (ad, üyeler, demo) | ✅ | `/panel/basvurular` |
| Demoyu panelden dinleme/indirme | ⚠️ | Arayüz hazır, dosya depolama bağlı değil |
| Filtreleme (şehir, üye sayısı, rol) | ✅ | `parseApplicationFilters()` |
| Durum atama (Beklemede/Onaylandı/Elendi/Finale) | ✅ | `updateApplicationStatusAction` |
| Durum değişince otomatik bildirim | ✅ | Aynı action; sağlayıcı takılınca gerçek gönderim |
| Toplu mesaj | ✅ | `/panel/bildirimler` |
| KVKK/FSEK onay kayıtları | ✅ | Başvuru detayında zaman damgalı |
| Dashboard sayıları | ✅ | `/panel` ve `/panel/raporlar` |
| Excel indirme | ✅ | `/api/disa-aktar/basvurular` |

### Bölüm 7 — Webinar modülü (admin tarafı)

| Doküman maddesi | Durum | Nerede |
|---|---|---|
| Yeni etkinlik oluşturma | ✅ | `/panel/etkinlikler/yeni` |
| Ad, açıklama, eğitmen, tarih/saat, kapak görseli | ✅ | `EventForm` |
| Düzenleme ve silme | ✅ | `/panel/etkinlikler/[id]` |
| Kim, ne zaman kayıt oldu listesi | ✅ | Etkinlik detayı |

### Bölüm 1 ve 4 — Üyelik ve üye yetenekleri (panele düşen kısım)

| Doküman maddesi | Durum | Nerede |
|---|---|---|
| Üye listesi ve profil | ✅ | `/panel/uyeler` |
| Doğrulama durumu izleme | ✅ | `emailVerifiedAt` / `phoneVerifiedAt` |
| Kupon tanımlama ve dağıtım | ✅ | `/panel/kuponlar` |
| Kayıt formu alanları (ad, e-posta, telefon, doğum tarihi, şehir, KVKK) | ✅ | `User` modeli |
| Doğrulama kodu altyapısı | ⚠️ | `VerificationCode` modeli hazır, akış üye tarafında yazılacak |

## 2. Kalan iş

### FAZ 1'i tamamlayan panel işleri

1. **Dosya yükleme** — demo şarkı için depolama (S3 uyumlu ya da yerel disk),
   `Application.demoFileUrl` doldurulacak, panelde oynatıcı aktifleşecek.
2. **E-posta/SMS sağlayıcısı** — `src/lib/notify/provider.ts` içine SMTP
   (Resend/Postmark) ve SMS (Netgsm/İleti Merkezi) uygulaması.
3. **Gönderim kuyruğu** — alıcı sayısı birkaç yüzü aştığında istek içinde
   gönderim yetmez; `NotificationRecipient` satırlarını tüketen arka plan
   işçisi.
4. **İçerik yönetimi ekranları** — `FaqItem`, `ArchiveEntry`, `SiteSetting`
   modelleri şemada var, panel arayüzleri henüz yok (SSS düzenleme, arşiv
   yılları, geri sayım hedefi).
5. **Denetim kaydı ekranı** — `AuditLog` yazılıyor ama görüntülenmiyor.

### Ziyaretçi + üye tarafı (ayrı uygulama)

Panel ile aynı veritabanını ve Prisma şemasını kullanacak ikinci bir Next.js
uygulaması. Dokümanın 2, 3, 4 ve 6. bölümleri:

- Hero, geri sayım, "Nedir bu hackathon", Fırsatlar, Arşiv, SSS, Footer
- Üyelik: kayıt formu + e-posta/SMS doğrulama akışı
- Başvuru sayfası — ziyaretçiye form hiç gösterilmez, giriş sonrası
  otomatik yönlendirme (doküman bölüm 6)
- Grup başvuru formu — panelden tanımlanan dinamik alanları okur
- Webinar/atölye kartları ve "Katıl" butonu, kontenjan + bekleme listesi
- "Profilim": başvuru durumu, kayıtlı etkinlikler, kuponlar

Paylaşılan Prisma şemasını iki uygulamanın da kullanabilmesi için
monorepo'ya (`apps/panel`, `apps/site`, `packages/db`) geçmek mantıklı olur.

## 3. Üretime alma kontrol listesi

- [ ] `SESSION_SECRET` üretimde rastgele üretilmiş bir değere ayarlandı
- [ ] `DATABASE_URL` PostgreSQL'e çevrildi, `db:deploy` çalıştırıldı
- [ ] Seed'in oluşturduğu örnek admin ve `uye*@example.com` hesapları silindi
- [ ] E-posta/SMS sağlayıcısı bağlandı ve test gönderimi yapıldı
- [ ] Dosya depolama bağlandı, yükleme boyut/tip sınırları konuldu
- [ ] Panel giriş ekranına hız sınırı (rate limit) eklendi
- [ ] Yedekleme ve KVKK saklama süresi politikası tanımlandı
