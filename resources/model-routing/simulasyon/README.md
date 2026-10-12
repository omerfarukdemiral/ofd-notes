# Model routing, gerçek kullanım profilleriyle simülasyon

Videodaki 6 görevlik simülasyon kavramı anlatıyor ama context, cache ve kullanıcı alışkanlıklarını içermiyor. Bu klasör aynı soruyu oturum düzeyinde, dört gerçek kullanım profiliyle ve varsayımları oynatarak yeniden soruyor.

## Dosyalar

- `sim.py` oturum modeli, profiller, tek model ve routing stratejileri
- `variants.py` routing'in dört farklı kurulumu
- `sensitivity.py` 120 varsayım kombinasyonu, hangi bulgunun sağlam kaldığını ölçer
- `results.txt`, `variants.txt` son çalıştırmanın çıktısı

Çalıştırmak için `python3 sim.py`, `python3 variants.py`, `python3 sensitivity.py`.

## Neyi modelliyor

- Her görev birkaç tool turundan oluşuyor. Her turda model tüm context'i yeniden okuyor, okumaların çoğu cache'ten geliyor.
- Context oturum boyunca büyüyor, eşikte compaction oluyor.
- Ana oturumda model değişirse cache baştan yazılıyor.
- Subagent temiz context ile başlıyor, ana oturuma sadece özet dönüyor.
- Başarısız sonuç kontrol katmanına takılırsa tekrar deneniyor, takılmazsa sessiz hata olarak gidiyor.
- Düşünme token'ları output olarak faturalanıyor.

## Kaynağa dayanan girdiler

| girdi | değer | kaynak |
|---|---|---|
| model fiyatları | Haiku 5.5 $0.10/$0.50, Sonnet 5.5 $2/$10, Opus 5.5 $4/$20, Fable 5.1 $10/$50 | Anthropic API fiyatları, Ekim 2026 |
| Haiku 5.5 uzun prompt | 100K üstünde 5 kat | Haiku 5.5 fiyat tablosu |
| cache okuma | varsayılan 0.1x, Opus ve Sonnet 5.5 0.05x, Fable 5.1 0.025x | prompt caching dokümanı |
| cache ömrü | abonelikte 1 saat, API'de 5 dakika | Claude Code maliyet dokümanı |
| düşünme faturası | output fiyatından, 5.5 ve Fable'da kapatılamıyor | Claude Code maliyet dokümanı |
| aşırı harcamanın sebepleri | temizlenmeyen uzun oturumlar, varsayılan bırakılan Opus | Claude Code maliyet dokümanı |
| ortalama maliyet | aktif gün başı ~$13, kullanıcıların %90'ı $30 altı | Claude Code maliyet dokümanı |
| subagent context'i | temiz başlıyor, konuşma geçmişini görmüyor | subagent dokümanı |
| Explore subagent | varsayılan olarak ana oturumun modelini kullanıyor | subagent dokümanı |
| iş dağılımı | kodlama sorgularının %31'i JS/TS, %28'i HTML/CSS, en sık görev UI | Anthropic Economic Index, Nisan 2025 |
| pro dev davranışı | ajanı kontrol ediyor, prompt başı medyan 1.8 adım, UI testi çoğu zaman elle | Huang ve diğ., arXiv 2512.14012, 13 gözlem + 99 anket |
| vibecoder davranışı | bir kısmı kodu hiç okumuyor, bazılarında prompt'ların ~%40'ı önceki niyetin tekrarı | Building Software by Rolling the Dice, 20 video, 254 prompt |

## Varsayımlar

Başarı olasılıkları, adım başı token sayıları, kontrol katmanlarının yakalama oranları ve router isabeti tahmin. Sıralamaları model kademesine göre kuruldu, mutlak değerleri ölçülmedi. `sensitivity.py` bunları geniş aralıklarda oynatıyor.

## Profiller

| profil | iş karışımı kolay/orta/zor | oturum alışkanlığı | kontrol |
|---|---|---|---|
| vibecoder | 50/35/15 | 12 iş tek oturumda | göz, yakalama ~%60 |
| indie dev | 40/40/20 | 6 işte bir /clear | göz, yakalama ~%60 |
| pro dev | 35/40/25 | her işte /clear, küçük adımlar | test, yakalama ~%90 |
| pipeline | 50/35/15 | her iş temiz context | CI testleri |

## Sonuçlar, görev başı maliyet ve doğruluk

| | hepsi fable | hepsi opus | hepsi sonnet | hepsi haiku | haiku + kontrol | routing |
|---|---|---|---|---|---|---|
| vibecoder | $4.20, %99 | $0.89, %98 | $0.49, %94 | $0.10, %81 | $0.11, %80 | $0.50, %93 |
| indie dev | $4.73, %99 | $1.02, %98 | $0.54, %93 | $0.11, %77 | $0.15, %77 | $0.66, %93 |
| pro dev | $2.92, %100 | $0.62, %99 | $0.32, %97 | $0.04, %83 | $0.20, %93 | $0.55, %99 |
| pipeline | $4.03, %100 | $0.81, %100 | $0.46, %98 | $0.06, %88 | $0.21, %94 | $0.59, %99 |

## 120 varsayım kombinasyonunda sağlam kalan bulgular

| bulgu | vibecoder | indie | pro dev | pipeline |
|---|---|---|---|---|
| sonnet varsayılanı opus varsayılanından ucuz | %100 | %100 | %100 | %100 |
| routing opus varsayılanından ucuz | %100 | %100 | %98 | %100 |
| kontrolsüz ucuz modelde sessiz hata %10'u aşıyor | %100 | %100 | %0 | %0 |
| test yoksa cascade'de sessiz hata %10'u aşıyor | %100 | %100 | %0 | %0 |
| routing sonnet varsayılanından ucuz | %87 | %77 | %17 | %59 |
| routing sonnet varsayılanından daha doğru | %31 | %41 | %87 | %48 |

İlk dört satır varsayımlardan bağımsız. Son iki satır varsayıma bağlı, kesin bir iddia olarak kullanılmamalı.
