# grok build mimarisi

xai'ın terminal kodlama ajanı grok build'in ([xai-org/grok-build](https://github.com/xai-org/grok-build)) tek sayfalık mimari şeması. bir prompt istemciden çıkıp xai api'ye nasıl gidiyor, araçlar nerede çalışıyor, sandbox neyi sarıyor.

[**Sayfayı aç →**](https://omerfarukdemiral.github.io/ofd-notes/resources/grok-build-mimari/) · daha derin inceleme: [grok-build-anatomi](../grok-build-anatomi/)

## Şemada ne var

| katman | crate | iş |
|---|---|---|
| istemci | `xai-grok-pager` | tui. ide'ler `grok agent stdio`, scriptler `grok -p` ile bağlanıyor |
| leader | `xai-grok-shell/leader` | acp mesajlarını ajana yönlendiriyor. açıksa `~/.grok/leader.sock` üzerinden birden çok istemciyi paylaştırıyor |
| ajan | `xai-grok-shell`, `xai-grok-agent` | oturum, compaction, hook, subagent |
| sampler | `xai-grok-sampler` | `api.x.ai/v1`'e akışlı istek, retry, doom-loop tespiti |
| araçlar | `xai-grok-tools`, `xai-grok-workspace` | dosya, git, komut çalıştırma. os sandbox içinde |
| dış | `xai-grok-mcp` | mcp sunucuları, oauth |

kutulardaki `SRC` rozetleri repodaki ilgili dosyaya gidiyor (commit `2bdd1d6`).

## Bilerek dışarıda bırakılanlar

hooks, subagent'lar, compaction, egress proxy ve computer hub ayrı kutu değil. sayfanın altındaki kartlarda kısaca geçiyor.

## Dosyalar

```
grok-build-mimari/
├── index.html                    şema, tek dosya
└── grok-build.architecture.json  şemanın kaynağı (archify 3.1)
```

`grok-build.architecture.json` düzenlenip archify ile yeniden üretilebilir.
