#!/usr/bin/env bash
#
# claude-hud kurulumu — https://github.com/jarrodwatts/claude-hud
#
# Idempotent: her sey yerindeyse hicbir sey yapmaz, hizlica cikar.
# Hem elle calistirilabilir (Warp / herhangi bir terminal) hem de
# .claude/settings.json icindeki SessionStart hook'undan cagrilir.
#
#   bash .claude/scripts/setup-claude-hud.sh          # kur / onar
#   CLAUDE_HUD_FORCE=1 bash .claude/scripts/setup-claude-hud.sh   # zorla yeniden yaz
#
set -euo pipefail

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
LAUNCHER="$CLAUDE_DIR/claude-hud-statusline.sh"
SETTINGS="$CLAUDE_DIR/settings.json"
MARKETPLACE="jarrodwatts/claude-hud"
PLUGIN="claude-hud@claude-hud"

log() { printf 'claude-hud: %s\n' "$1" >&2; }

# --- hizli cikis: zaten kurulu mu? -------------------------------------------
# Not: cache dizininin varligi yetmez — `claude plugin marketplace add` de
# cache'i doldurur ama plugin'i kurmaz. Asil kayit installed_plugins.json'da.
plugin_installed() {
  grep -q '"claude-hud@claude-hud"' "$CLAUDE_DIR/plugins/installed_plugins.json" 2>/dev/null
}

if [ -z "${CLAUDE_HUD_FORCE:-}" ] && plugin_installed && [ -x "$LAUNCHER" ] \
   && grep -q 'claude-hud-statusline' "$SETTINGS" 2>/dev/null; then
  exit 0
fi

# --- on kosullar --------------------------------------------------------------
command -v claude >/dev/null 2>&1 || { log "claude CLI bulunamadi, atlaniyor."; exit 0; }

if ! command -v node >/dev/null 2>&1 && ! command -v bun >/dev/null 2>&1; then
  log "Node.js 18+ veya Bun gerekli (https://nodejs.org / https://bun.sh). Atlaniyor."
  exit 0
fi

mkdir -p "$CLAUDE_DIR"

# --- 1) marketplace + plugin ---------------------------------------------------
if ! grep -q "$MARKETPLACE" "$CLAUDE_DIR/plugins/known_marketplaces.json" 2>/dev/null; then
  log "marketplace ekleniyor"
  claude plugin marketplace add "$MARKETPLACE" >/dev/null 2>&1 || log "marketplace eklenemedi (zaten ekli olabilir)"
fi

if ! plugin_installed; then
  log "plugin kuruluyor"
  claude plugin install "$PLUGIN" >/dev/null 2>&1 || log "plugin kurulamadi"
fi

# --- 2) statusline launcher ----------------------------------------------------
# Calisma aninda terminal genisligini, plugin surumunu ve runtime'i cozer;
# boylece ayni settings.json girdisi her makinede calisir.
cat > "$LAUNCHER" <<'LAUNCHER_EOF'
#!/usr/bin/env bash
# claude-hud statusline launcher (bkz. .claude/scripts/setup-claude-hud.sh)

# 1) Terminal genisligi. Claude Code >= 2.1.153 COLUMNS'u kendisi verir;
#    eski surumler icin stty probe. -4 input alanindaki padding icin.
cols=${COLUMNS:-}
case "$cols" in ""|*[!0-9]*) cols=$(stty size </dev/tty 2>/dev/null | awk '{print $2}');; esac
case "$cols" in ""|*[!0-9]*) cols=120;; esac
export COLUMNS=$(( cols > 4 ? cols - 4 : 1 ))

# 2) Cache'teki en yuksek claude-hud surumu.
plugin_dir=$(ls -d "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/*/claude-hud/*/ 2>/dev/null \
  | awk -F/ '{ print $(NF-1) "\t" $(0) }' \
  | grep -E '^[0-9]+\.[0-9]+\.[0-9]+[[:space:]]' \
  | sort -t. -k1,1n -k2,2n -k3,3n -k4,4n | tail -1 | cut -f2-)
[ -n "$plugin_dir" ] || exit 0

# 3) Runtime: bun (TS'i dogrudan calistirir, daha hizli), yoksa node.
if bun_path=$(command -v bun 2>/dev/null) && [ -f "${plugin_dir}src/index.ts" ]; then
  exec "$bun_path" --env-file /dev/null "${plugin_dir}src/index.ts"
elif node_path=$(command -v node 2>/dev/null); then
  exec "$node_path" "${plugin_dir}dist/index.js"
fi
exit 0
LAUNCHER_EOF
chmod +x "$LAUNCHER"

# --- 3) kullanici settings.json'a statusLine ----------------------------------
# node ile yaziyoruz: claude-hud zaten node/bun sart kosuyor, macOS'ta
# python3 varsayimindan daha guvenli.
# Varsayilan yerdeyse $HOME uzerinden yaz (makineler arasi tasinabilir olsun),
# CLAUDE_CONFIG_DIR ozellestirilmisse mutlak yolu kullan.
if [ "$LAUNCHER" = "$HOME/.claude/claude-hud-statusline.sh" ]; then
  LAUNCHER_CMD='"$HOME"/.claude/claude-hud-statusline.sh'
else
  LAUNCHER_CMD="\"$LAUNCHER\""
fi

RUNTIME=$(command -v node || command -v bun)
"$RUNTIME" -e '
const fs = require("fs");
const [p, cmd] = process.argv.slice(1);
let s = {};
try { s = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
s.statusLine = { type: "command", command: cmd, refreshInterval: 5 };
fs.writeFileSync(p, JSON.stringify(s, null, 2) + "\n");
' "$SETTINGS" "$LAUNCHER_CMD"

log "hazir. Acik bir oturum varsa /reload-plugins calistir."
