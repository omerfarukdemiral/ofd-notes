# resources

Uzun teknik videolar → bakınca anlaşılan infografik kartları.

## Seriler

| Seri | Kaynak | Süre | Bölüm | Kart |
|---|---|---|---|---|
| [agent-factory-claude-code](agent-factory-claude-code/) | Google Cloud "Agent Factory" — Lydia Hallie & YK Sugi | 61 dk | 7 | 10 |
| [lennys-podcast-boris-cherny](lennys-podcast-boris-cherny/) | Lenny's Podcast — Boris Cherny | 82 dk | 10 | 15 |

## Süzgeçler

Videodan çıkmayan, doğrulanmış kürasyonlar. Kart yerine tek bir web sayfası.

| Süzgeç | Konu | Aday | Kalan |
|---|---|---|---|
| [claude-code-skills](claude-code-skills/) — Skill Havuzu | X'te dolaşan Claude Code skill listesi | 22 | 17 |

## Animasyonlu anlatımlar

Kavramı şekille anlatan, adım adım ilerleyen tek sayfa. Videosu da yanında.

| Sayfa | Konu | Kavram | Şema |
|---|---|---|---|
| [ai-kavramlar](ai-kavramlar/) — ai'ın hayatımıza soktuğu terimler | token'dan drift'e ai sözlüğü | 46 | 6 |

## Deneyler

Simülasyonla sınanmış kurulumlar. Animasyon, kod ve kopyalanabilir dosyalar bir arada.

| Sayfa | Konu | Yaklaşım | Profil |
|---|---|---|---|
| [model-routing](model-routing/) — model routing | claude code'da hangi iş hangi modele | 4 | 4 |

## İncelemeler

Bir reponun ya da uygulamanın içini açan tek sayfa. Kaynak kod ve gerekirse binary birlikte okunur.

| Sayfa | Konu | Kaynak | Yöntem |
|---|---|---|---|
| [grok-build-anatomi](grok-build-anatomi/) — grok build anatomisi | xAI'ın terminal kodlama ajanının mimarisi | xai-org/grok-build | kaynak kod + REA |
| [grok-build-mimari](grok-build-mimari/) — grok build mimarisi | aynı reponun tek sayfalık, etkileşimli mimari şeması | xai-org/grok-build | kaynak kod + archify |

## Klasör düzeni

Her serinin yapısı aynı:

```
seri-adi/
├── README.md          seri künyesi, bölüm listesi, kart listesi
├── infografik.html    tüm kartların kaynağı — tek dosya
└── gorseller/         export edilmiş PNG kartlar
```

Videolar ve altyazı dosyaları repoda değil. Burada duran şey çıkarımlar.

## Kartları yeniden üretmek

`infografik.html` içindeki metni düzenle, sonra:

```bash
npx puppeteer  # ya da kurulu bir headless chrome
```

```js
// her .canvas elementini 2x ölçekte PNG'ye alır
const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch();
  const p = await b.newPage();
  await p.setViewport({ width: 1300, height: 1400, deviceScaleFactor: 2 });
  await p.goto('file://' + __dirname + '/infografik.html', { waitUntil: 'networkidle0' });
  await p.evaluate(() => document.fonts.ready);
  const cards = await p.$$('.canvas');
  for (let i = 0; i < cards.length; i++) {
    await cards[i].screenshot({ path: `gorseller/kart-${String(i + 1).padStart(2, '0')}.png` });
  }
  await b.close();
})();
```

Kart boyutları X'e göre seçili: 16:9 (1200×675), 1:1 (1080×1080), 4:5 (1080×1350). Export 2x ölçekte alınıyor.

## Süreç

1. Videonun transkripti çıkarılır, Türkçeye çevrilir
2. Konu bütünlüğüne göre bölümlere ayrılır, altyazı gömülür
3. Altyazı metni baştan sona okunur — özet değil, **çıkarım** aranır
4. Her çıkarım içeriğine uygun bir kart formatına oturur: şema, süreç şeridi, karşılaştırma, metrik, liste, kod
5. Kartlar tek HTML'de üretilir, PNG'ye export edilir

Kartlarda kural: uzun cümle yok, özet yok. Kart bir şeyi ya gösterir ya da göstermez.
