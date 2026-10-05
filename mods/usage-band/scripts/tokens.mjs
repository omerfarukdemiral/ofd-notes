#!/usr/bin/env node
// Sums the token usage of one session's transcript and its subagents'.
// Usage: node tokens.mjs <session-id>
// Prints one JSON line: { path, size, mtimeMs, input, output, cacheRead, cacheWrite, requests }.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const id = process.argv[2]
if (!id || !/^[\w-]+$/.test(id)) {
  console.error('usage: tokens.mjs <session-id>')
  process.exit(2)
}

const base = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects')

let main = null
for (const dir of readdirSync(base, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue
  const candidate = join(base, dir.name, `${id}.jsonl`)
  if (existsSync(candidate)) {
    main = { file: candidate, dir: join(base, dir.name, id) }
    break
  }
}
if (main === null) {
  console.error(`no transcript for ${id}`)
  process.exit(1)
}

const files = [main.file]
const subagents = join(main.dir, 'subagents')
if (existsSync(subagents)) {
  for (const name of readdirSync(subagents)) {
    if (name.endsWith('.jsonl')) files.push(join(subagents, name))
  }
}

// One API response is written once per content block: key it by message id
// and request id, and keep each field's largest value.
const FIELDS = ['input_tokens', 'output_tokens', 'cache_read_input_tokens', 'cache_creation_input_tokens']
const seen = new Map()

for (const file of files) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue
  }
  for (const line of text.split('\n')) {
    if (!line.includes('"usage"')) continue
    let row
    try {
      row = JSON.parse(line)
    } catch {
      continue
    }
    const usage = row?.message?.usage
    if (row?.type !== 'assistant' || !usage) continue
    const key = `${row.message.id ?? row.uuid}:${row.requestId ?? ''}`
    const kept = seen.get(key) ?? Object.fromEntries(FIELDS.map(f => [f, 0]))
    for (const f of FIELDS) kept[f] = Math.max(kept[f], Number(usage[f]) || 0)
    seen.set(key, kept)
  }
}

const total = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
for (const u of seen.values()) {
  total.input += u.input_tokens
  total.output += u.output_tokens
  total.cacheRead += u.cache_read_input_tokens
  total.cacheWrite += u.cache_creation_input_tokens
}

const stat = statSync(main.file)
console.log(JSON.stringify({ path: main.file, size: stat.size, mtimeMs: stat.mtimeMs, ...total, requests: seen.size }))
