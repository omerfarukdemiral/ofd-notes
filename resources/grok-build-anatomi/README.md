# grok build anatomisi

xAI'ın açık kaynak terminal kodlama ajanı [grok-build](https://github.com/xai-org/grok-build)'in mimarisi. Kaynak kod okundu, yayınlanan `grok` binary'si [REA](https://rea.tools/) ile statik olarak incelendi ve ikisi karşılaştırıldı.

[**Sayfayı aç →**](https://omerfarukdemiral.github.io/ofd-notes/resources/grok-build-anatomi/)

## Neler var

- katman şeması: TUI → ACP → agent runtime → sampler / tools / workspace
- bir turun adımları, model ve API katmanı, modele açılan araçlar
- izin sırası, sandbox, checkpoint ve `/rewind`
- REA bulguları: binary'de olup açık kaynak repoda olmayan 13 crate

## Künye

| | |
|---|---|
| kaynak | `xai-org/grok-build` @ `2bdd1d6` (1.0.45) |
| binary | `grok-macos-aarch64` 1.0.52, sha256 `c2caa989…bbb9` |
| araç | REA 6.5.0 CLI (`npx rea-agents`), statik analiz |
| tarih | 15 Ekim 2026 |
