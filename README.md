# ofd-notes

Sahadan notlar.

Öğrendiğim, denediğim, uyguladığım her şeyin damıtılmış hali burada. Araştırmalar, deneyler, işe yarayan yaklaşımlar, işe yaramayanlardan çıkan dersler.

Bitmiş bir doküman değil — sürekli büyüyen bir defter.

---

## Ne var burada

| Klasör | İçerik |
|---|---|
| [`resources/`](resources/) | Uzun teknik videoların içinden çıkarılmış infografik kartları |
| [`panel/`](panel/) | Müzik Hackathon yönetim paneli — Next.js, Prisma, Tailwind |

Yeni başlıklar eklendikçe tablo büyüyecek.

## Neden

Değerli içeriğin çoğu bir saatlik videoların içinde sıkışıp kalıyor. Kimse 80 dakikalık bir podcast'i izlemek için oturmuyor; izleyenlerin çoğu da bir hafta sonra ne konuşulduğunu hatırlamıyor.

Buradaki iş bunu tersine çevirmeye çalışıyor:

- **Altyazı** — Türkçe altyazı dil bariyerini kaldırıyor
- **Bölümleme** — 80 dakika, tek başına izlenebilir 8–10 parçaya iniyor
- **İnfografik** — her bölümün özü, izlemeden bakınca anlaşılan bir karta düşüyor

Amaç özet çıkarmak değil. Amaç, konuşulan şeyin **bakınca anlaşılır** hale gelmesi.

## Format

Kartlar tek bir görsel sistemle üretiliyor: koyu zemin, teknik çizim estetiği, mono tipografi, tek accent renk. Her seri tek bir HTML dosyasından geliyor; PNG'ler headless Chrome ile export ediliyor.

Kaynak HTML'ler repoda duruyor — metni değiştirip yeniden export alabilirsin.

### Görsel sistem — blueprint.dark

| Token | Değer | Kullanım |
|---|---|---|
| zemin | `#0B0A12` | arka plan |
| grid | `#161426` | 16px kare grid |
| metin | `#CDCBE0` | başlık ve gövde |
| accent | `#A78BFA` | sadece vurgu — kart başına 2–4 eleman |
| çizgi | `#2C2946` | şema bağlantıları, kutu konturu |
| ikincil | `#625F80` | dipnot ve açıklamalar |

Tipografi: başlıklar **Space Grotesk 700** (her zaman küçük harf), veri ve açıklamalar **IBM Plex Mono**.

Birkaç kural: kesikli çizgi izolasyonu veya eski yöntemi gösterir, düz çizgi bağlantıyı. Veri varsa kaynak dipnotu zorunlu. Karşılaştırmalarda kazananın trade-off'u alt şeritte yazılır — hype'sız duruş biçimin bir parçası.

## Kullanım

Notlar ve görseller serbestçe kullanılabilir. Kaynak videoların hakları sahiplerine aittir; her klasörde kaynak linki var.

---

**Ömer Faruk Demiral** · [@omerfrkdemiral](https://x.com/omerfrkdemiral)
