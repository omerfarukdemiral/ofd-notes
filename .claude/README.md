# .claude/

Bu repoda calisan Claude Code oturumlarinin ortak ayarlari.

## claude-hud

[claude-hud](https://github.com/jarrodwatts/claude-hud) (MIT, jarrodwatts) —
Claude Code'un native statusline API'sini kullanan bir HUD. Input alaninin
altinda model, proje yolu, git durumu, context tuketimi ve kullanim limitini
gosterir; istege bagli olarak aktif tool / agent / todo satirlarini da.

```
[Opus 5] │ ofd-notes git:(main*)
Context █████░░░░░ 45% │ Usage ██░░░░░░░░ 25% (1h 30m / 5h)
```

### Dosyalar

| Dosya | Ne yapar |
|---|---|
| `settings.json` | marketplace + plugin kaydi, `SessionStart` hook'u |
| `scripts/setup-claude-hud.sh` | marketplace'i ekler, plugin'i kurar, statusline launcher'i yazar, `~/.claude/settings.json`'a `statusLine` girdisini koyar |

Kurulum scripti **idempotent**: her sey yerindeyse hicbir sey yapmadan cikar.
`SessionStart` hook'u sayesinde her oturumda kendini onarir — ozellikle web
oturumlari gibi her seferinde sifirdan gelen ortamlarda gerekli.

### Terminalde (Warp) kurulum

Tek sefer, **butun projelerde** gecerli olacak sekilde:

```bash
bash .claude/scripts/setup-claude-hud.sh
```

Ardindan acik bir oturum varsa `/reload-plugins`, yoksa bir sonraki `claude`
acilisinda HUD gorunur. Script `~/.claude/settings.json` icine yaziyor, yani
bu repo disindaki projelerde de calisir.

Gerekenler: Claude Code v1.0.80+, Node.js 18+ veya Bun.

### Ayar

```
/claude-hud:setup       # rehberli yapilandirma
/claude-hud:configure   # tekil ayarlar
```

Ya da dogrudan `~/.claude/plugins/claude-hud/config.json`:

| Anahtar | Varsayilan | Ne yapar |
|---|---|---|
| `lineLayout` | `expanded` | `expanded` / `compact` |
| `pathLevels` | `1` | proje yolunda gosterilecek klasor derinligi (`1`–`3`, `full`) |
| `gitStatus.enabled` | `true` | git branch gosterimi |
| `display.showModel` | `true` | `[Opus]` rozeti |
| `display.showUsage` | `true` | rate-limit kullanimi |
| `display.showTools` | `false` | aktif tool satiri |
| `display.showAgents` | `false` | calisan agent satiri |
| `display.showTodos` | `false` | todo ilerlemesi |

Gecici kapatma:

```bash
CLAUDE_HUD_DISABLE=1 claude
```

Yeniden kurmak / launcher'i tazelemek:

```bash
CLAUDE_HUD_FORCE=1 bash .claude/scripts/setup-claude-hud.sh
```

### Not — web arayuzu

`statusLine` terminal UI'ina ait bir ozellik. claude.ai / masaustu uygulamasi
kendi context gostergesini kullandigi icin HUD orada gorunmez; plugin kurulur
ve `/claude-hud:setup` gibi komutlari calisir ama cizim yapilmaz. Gorsel
karsiligi sadece terminalde (Warp, iTerm, VS Code terminali vb.) cikar.
