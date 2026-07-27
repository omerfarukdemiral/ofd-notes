# Müzik Hackathon — Yönetim Paneli

FAZ 1 dokümanındaki admin gereksinimlerini karşılayan Next.js yönetim paneli.
Başvuru yönetimi, webinar/atölye modülü, üyelik takibi, kupon tanımlama,
toplu bildirim ve raporlama tek uygulamada.

> Bu klasör yalnızca **paneli** içerir. Ziyaretçiye açık tanıtım sitesi
> (hero, arşiv, SSS, başvuru formu) ayrı bir uygulama olarak planlanıyor —
> bkz. [`YOL-HARITASI.md`](./YOL-HARITASI.md).

## Teknoloji

| Katman | Seçim | Neden |
|---|---|---|
| Çatı | Next.js 16, App Router | Server Component + Server Action ile ayrı API katmanı gerekmiyor |
| Dil | TypeScript (strict) | Durum alanları union tiplerle daraltılıyor |
| Stil | Tailwind CSS v4 | Jetonlar `globals.css` içinde; koyu tema otomatik |
| Veritabanı | Prisma 7 + SQLite (geliştirme) | Sıfır kurulum; PostgreSQL'e geçiş provider + adapter değişimi |
| Kimlik | `jose` ile imzalı httpOnly çerez | Panel tek rol kullanıyor; NextAuth'un ağırlığına gerek yok |
| Doğrulama | Zod 4 | Aynı şema hem action doğrulaması hem tip üretimi için |
| Dışa aktarım | ExcelJS | Çok sayfalı `.xlsx` (Gruplar + Üyeler) |

## Kurulum

```bash
cd panel
npm install
cp .env.example .env      # SESSION_SECRET değerini değiştirin
npm run db:migrate        # şemayı uygular
npm run db:seed           # örnek veri + admin hesabı
npm run dev
```

`http://localhost:3000` → `/panel`'e yönlenir, oturum yoksa `/giris`.

**Örnek admin:** `admin@muzikhackathon.com` / `Admin1234!`
(`.env` içindeki `SEED_ADMIN_PASSWORD` ile değiştirilebilir.)

### Komutlar

| Komut | İş |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` / `npm start` | Üretim derlemesi ve sunumu |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Yeni göç oluştur + uygula |
| `npm run db:seed` | Örnek veriyi yükle (idempotent) |
| `npm run db:reset` | Veritabanını sıfırla ve yeniden tohumla |
| `npm run db:studio` | Prisma Studio |

## Modüller

| Yol | Ne yapar |
|---|---|
| `/panel` | Başvuru/üye/etkinlik/kupon sayıları, son başvurular, yaklaşan etkinlikler |
| `/panel/basvurular` | Filtreli liste (durum, şehir, rol, üye sayısı, serbest arama) + Excel |
| `/panel/basvurular/[id]` | Grup üyeleri, demo, ek alanlar, KVKK/FSEK onay zamanları, durum geçmişi, durum güncelleme + bildirim |
| `/panel/form-ayarlari` | Başvuru aç/kapat, otomatik kapanış tarihi, min/maks üye, dinamik form alanları, müzikal roller |
| `/panel/etkinlikler` | Webinar/atölye listesi, yayınla/kaldır |
| `/panel/etkinlikler/yeni`, `/[id]` | Etkinlik oluştur/düzenle/sil, katılımcı listesi ve kayıt durumu |
| `/panel/uyeler`, `/[id]` | Üye listesi ve profili: başvurular, etkinlik kayıtları, kuponlar, doğrulama durumu |
| `/panel/kuponlar` | Kupon tanımı, tetikleyici, üyeye elle kupon atama, dağıtım geçmişi |
| `/panel/bildirimler` | Hedef kitleye toplu e-posta/SMS, gönderim geçmişi |
| `/panel/raporlar` | Durum/şehir/rol dağılımları, etkinlik doluluk, Excel |

## Mimari notlar

**Yetkilendirme iki katmanlı.** `src/proxy.ts` (Next 16'nın middleware
karşılığı) `/panel/*` isteklerini çerez doğrulamasıyla süzer; server
action'lar bu katmandan geçmediği için her action ayrıca `requireAdmin()`
çağırır. `/api/disa-aktar/*` de matcher dışında olduğundan kendi kontrolünü
yapar.

**Durum alanları String, enum değil.** SQLite enum desteklemiyor. Tek
doğruluk kaynağı `src/lib/domain/enums.ts`; etiketler ve rozet renkleri
`labels.ts` içinde eşleniyor. PostgreSQL'e geçişte şema değişmeden çalışır.

**`Application.memberCount` denormalize.** Prisma ilişki sayısına göre
`where` filtresi desteklemiyor; "en az 4 kişilik gruplar" filtresi bu alan
üzerinden çalışıyor. Üye ekleme/çıkarma bu alanı aynı transaction içinde
güncellemeli.

**Bildirim gönderimi sağlayıcıdan bağımsız.** `src/lib/notify/provider.ts`
bir arayüz tanımlıyor; FAZ 1'de log'a yazan uygulama bağlı. SMTP/SMS
sağlayıcısı eklerken yalnızca bu dosya değişiyor. Alıcı sayısı büyüdüğünde
`dispatch.ts` içindeki döngü kuyruğa taşınmalı — veri modeli
(`NotificationRecipient` durum alanı) bunu şimdiden destekliyor.

**Denetim kaydı.** Durum değişikliği, ayar güncellemesi, kupon tanımlama gibi
işlemler `AuditLog`'a yazılıyor (kim, ne zaman, neyi).

## PostgreSQL'e geçiş

1. `prisma/schema.prisma` → `provider = "postgresql"`
2. `npm i @prisma/adapter-pg pg`, `src/lib/prisma.ts` içinde `PrismaPg` kullan
3. `.env` → `DATABASE_URL="postgresql://…"`
4. `npm run db:migrate`

Şemada SQLite'a özgü tip yok; alan tanımları olduğu gibi geçer.

## Bilinen sınırlar (FAZ 1)

- **Dosya yükleme bağlı değil.** `Application.demoFileUrl` alanı hazır ama
  depolama (S3/R2/yerel disk) entegrasyonu yapılmadı. Demo linki alanı
  çalışıyor.
- **E-posta/SMS log'a yazılıyor**, gerçek gönderim yok (yukarıya bakın).
- **Kupon tetikleyicileri tanım düzeyinde.** Otomatik dağıtım, üye tarafı
  başvuru/kayıt akışları yazıldığında devreye girecek.
- `npm audit` uyarıları ESLint ve PostCSS'in geliştirme zamanı bağımlılık
  zincirinden geliyor; çalışma zamanı paketlerini etkilemiyor.
