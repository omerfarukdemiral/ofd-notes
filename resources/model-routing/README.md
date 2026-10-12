# model routing

claude code'da hangi işi hangi modele vereceğini seçmek ne kadar fark ediyor. aynı 6 görevi 4 yaklaşımla çözen bir animasyon, gerçek kullanım profilleriyle koşan bir simülasyon ve kopyalanıp kullanılabilen bir kurulum.

[**Sayfayı aç →**](https://omerfarukdemiral.github.io/ofd-notes/resources/model-routing/) · [video (mp4, 57 sn)](model-routing.mp4) · [router prompt'u](routing-prompt.md)

## Animasyondaki 4 yaklaşım

| | yaklaşım | doğru | görev başı |
|---|---|---|---|
| 1 | hepsi fable, max effort | 6/6 | $1.26 |
| 2 | hepsi haiku, kontrol yok | 2/6 | $0.0056 |
| 3 | haiku + test, kalırsa yüksel | 5/6 | $0.045 |
| 4 | routing, zor işte test + review | 6/6 | $0.124 |

3'te test bir zor işteki hatayı kaçırıyor ve yanlış cevap geçiyor. 4'te aynı hatayı sonnet review yakalıyor ve iş opus'a çıkıyor.

## Simülasyondan çıkanlar

[`simulasyon/`](simulasyon/) oturum düzeyinde çalışıyor. context büyüyor, okumalar cache'ten geliyor, subagent temiz context'le başlıyor. vibecoder, indie dev, testli repoda çalışan dev ve otomatik pipeline diye 4 profil var. tahmine dayalı değerler 120 kombinasyonla oynatıldı. şunlar hepsinde aynı çıktı

- opus'u varsayılan bırakan biri sonnet'e geçince maliyet yaklaşık yarıya iniyor
- test yoksa ucuz model ve ucuzdan başlayıp yükselme %10'un üstünde sessiz hata üretiyor
- testli repoda aynı strateji sessiz hatayı %10'un altında tutuyor
- routing her senaryoda opus varsayılanından ucuz

routing'in sonnet varsayılanından ucuz olup olmadığı varsayımlara bağlı. kazancı daha çok zor işlerdeki doğrulukta. kaynaklar ve varsayımlar [`simulasyon/README.md`](simulasyon/README.md) içinde.

## Kurulum

```
kurulum/
├── CLAUDE.md                  router prompt'u
└── .claude/
    ├── settings.json          her Edit ve Write'tan sonra kontrolü çalıştıran hook
    ├── hooks/check.sh         typecheck + test, hata varsa exit 2 ile claude'a döner
    └── agents/
        ├── Explore.md         dosya aramayı haiku'ya alır
        ├── haiku-worker.md    kolay işler
        ├── sonnet-worker.md   orta işler, zor işin ilk denemesi, review
        └── opus-worker.md     sonnet'in bitiremediği zor işler
```

1. `/model` ile varsayılanı sonnet yap
2. `kurulum/` içeriğini projenin köküne kopyala. tüm projelerinde istiyorsan `.claude/` içeriğini `~/.claude/` altına koy
3. `check.sh` içindeki komutları kendi projene göre değiştir
4. bir hafta sonra `/usage` ekranına ve `.claude/routing-log.md` dosyasına bak

## Dosyalar

```
model-routing/
├── index.html          animasyon, tek dosya
├── model-routing.mp4   sayfanın kare kare kaydı, 1080×1080 30fps
├── routing-prompt.md   router prompt'u
├── kurulum/            kopyalanabilir claude code kurulumu
└── simulasyon/         oturum düzeyinde simülasyon, python
```
