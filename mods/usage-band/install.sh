#!/bin/sh
# usage-band modunu ~/.claude/mods/usage-band altına kopyalar ve
# ~/.claude/settings.json'ın env bloğuna iki değişken ekler; diğer ayarlara dokunmaz.
set -eu
SRC=$(cd "$(dirname "$0")" && pwd)
DEST="$HOME/.claude/mods/usage-band"
SETTINGS="$HOME/.claude/settings.json"

mkdir -p "$DEST"
cp -R "$SRC/.claude-plugin" "$SRC/hooks" "$SRC/scripts" "$SRC/types" "$DEST/"

NODE=$(command -v node || ls /usr/local/bin/node /opt/homebrew/bin/node 2>/dev/null | head -1)
[ -n "$NODE" ] || { echo "node bulunamadı" >&2; exit 1; }

DEST="$DEST" SETTINGS="$SETTINGS" "$NODE" -e '
const fs = require("fs"), path = require("path")
const file = process.env.SETTINGS, dest = process.env.DEST
const s = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {}
if (fs.existsSync(file)) fs.copyFileSync(file, file + ".bak")
s.env = s.env || {}
const sep = process.platform === "win32" ? ";" : ":"
const dirs = (s.env.CLAUDE_CODE_PLUGIN_DIRS || "").split(sep).filter(Boolean)
if (!dirs.includes(dest)) dirs.push(dest)
s.env.CLAUDE_CODE_PLUGIN_DIRS = dirs.join(sep)
s.env.CLAUDE_CODE_ENABLE_FUNCTION_HOOKS = "1"
fs.mkdirSync(path.dirname(file), { recursive: true })
fs.writeFileSync(file, JSON.stringify(s, null, 2) + "\n")
console.log("env güncellendi:", s.env.CLAUDE_CODE_PLUGIN_DIRS)
'
echo "Doğrulama: claude -p \"/kullanim\""
