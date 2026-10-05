import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionCost, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { UsageBandContext, UsageBandLimit, UsageBandTokens } from '../types'
import {
  formatPercent,
  formatRemaining,
  formatTokens,
  formatUsd,
  LEVEL_COLOR,
  levelOf,
  pillsOf,
  svgOf,
  TERMINAL_COLOR,
  TERMINAL_ICON,
  terminalBar,
} from './pills'
import type { Pill } from './pills'

const fiveHour = atom({ plugin: 'usage-band', key: 'fiveHour' } as const, null)
const sevenDay = atom({ plugin: 'usage-band', key: 'sevenDay' } as const, null)
const context = atom({ plugin: 'usage-band', key: 'context' } as const, null)
const cost = atom({ plugin: 'usage-band', key: 'cost' } as const, null)
const tokens = atom({ plugin: 'usage-band', key: 'tokens' } as const, null)
const fallback = atom({ plugin: 'usage-band', key: 'fallback' } as const, null)
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)
const isHidden = atom({ plugin: 'usage-band', key: 'isHidden' } as const, false)

const COMMAND = 'kullanim'
const NODES = ['node', '/usr/local/bin/node', '/opt/homebrew/bin/node']
const TICK_MS = 30_000

type Script = { path: string; size: number; mtimeMs: number } & Omit<UsageBandTokens, 'isEstimate'>

function limitOf(list: readonly SessionRateLimit[], kind: string): UsageBandLimit | null {
  const one = list.find(l => l.kind === kind)
  if (one === undefined) return null
  const at = one.resetsAt === undefined ? NaN : Date.parse(one.resetsAt)
  return { percent: one.percentUsed, resetsAt: Number.isFinite(at) ? at : null }
}

function contextOf(c: SessionContextUsage): UsageBandContext {
  return { tokens: c.tokens ?? null, window: c.window, percent: c.percent ?? null }
}

// Module state: lost on reload, which only costs one recount.
let node: string | null = null
let lastScan: { path: string; size: number; mtimeMs: number } | null = null

async function writeMeasure(
  $: EngineInterface,
  m: { context: SessionContextUsage; rateLimits: readonly SessionRateLimit[]; cost?: SessionCost },
): Promise<void> {
  await update($, fiveHour, () => limitOf(m.rateLimits, 'five_hour'))
  await update($, sevenDay, () => limitOf(m.rateLimits, 'seven_day'))
  await update($, context, () => contextOf(m.context))
  await update($, cost, () => m.cost?.usd ?? null)
}

async function runScript($: EngineInterface, id: string): Promise<Script | null> {
  const script = `${$.plugin.root}/scripts/tokens.mjs`
  const order = node === null ? NODES : [node, ...NODES.filter(n => n !== node)]
  for (const bin of order) {
    try {
      const { exitCode, stdout } = await $.process.run([bin, script, id], { timeoutMs: 20_000 })
      if (exitCode !== 0) return null
      node = bin
      return JSON.parse(stdout.trim()) as Script
    } catch {
      // This node did not start; try the next one.
    }
  }
  return null
}

async function refreshTokens($: EngineInterface): Promise<void> {
  if (lastScan !== null) {
    try {
      const st = await $.fs.stat(lastScan.path)
      if (st.size === lastScan.size && st.mtimeMs === lastScan.mtimeMs) return
    } catch {
      lastScan = null
    }
  }
  const result = await runScript($, await $.session.id())
  if (result === null) {
    const est = await read($, fallback)
    await update($, tokens, () => est)
    return
  }
  lastScan = { path: result.path, size: result.size, mtimeMs: result.mtimeMs }
  const next: UsageBandTokens = {
    input: result.input,
    output: result.output,
    cacheRead: result.cacheRead,
    cacheWrite: result.cacheWrite,
    requests: result.requests,
    isEstimate: false,
  }
  await update($, tokens, () => next)
}

async function refresh($: EngineInterface, force = false): Promise<void> {
  if (force) lastScan = null
  await update($, now, () => Date.now())
  await writeMeasure($, await $.session.usage())
  await refreshTokens($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Kullanım şeridini yenile ve özetle (gizle / goster)',
    })
    await refresh($)
    $.clock.every(TICK_MS, () => {
      void refresh($)
    })
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, now, () => Date.now())
    await writeMeasure($, e)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    const u = e.usage
    if (u !== undefined) {
      await update($, fallback, prev => ({
        input: (prev?.input ?? 0) + u.input_tokens,
        output: (prev?.output ?? 0) + u.output_tokens,
        cacheRead: (prev?.cacheRead ?? 0) + u.cache_read_input_tokens,
        cacheWrite: (prev?.cacheWrite ?? 0) + u.cache_creation_input_tokens,
        requests: (prev?.requests ?? 0) + 1,
        isEstimate: true,
      }))
    }
    await refreshTokens($)
    return done
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const arg = e.args.trim().toLocaleLowerCase('tr')
    if (arg === 'gizle') {
      await update($, isHidden, () => true)
      return { text: 'Kullanım şeridi gizlendi. Geri açmak için: /kullanim goster' }
    }
    if (arg === 'goster' || arg === 'göster') {
      await update($, isHidden, () => false)
      return { text: 'Kullanım şeridi açıldı.' }
    }
    await refresh($, true)
    const at = await read($, now)
    const parts: string[] = []
    for (const [label, limit, isDays] of [
      ['5h', await read($, fiveHour), false],
      ['7d', await read($, sevenDay), true],
    ] as const) {
      if (limit === null) continue
      const left = limit.resetsAt === null ? '' : ` (${formatRemaining(limit.resetsAt - at, isDays)})`
      parts.push(`${label} ${formatPercent(limit.percent)}${left}`)
    }
    const t = await read($, tokens)
    if (t !== null) {
      const m = t.isEstimate ? '~' : ''
      parts.push(
        `giriş ${m}${formatTokens(t.input + t.cacheWrite)}`,
        `çıkış ${m}${formatTokens(t.output)}`,
        `önbellek ${m}${formatTokens(t.cacheRead)}`,
      )
    }
    const c = await read($, context)
    if (c?.percent != null) parts.push(`bağlam ${c.percent}%`)
    const usd = await read($, cost)
    if (usd !== null) parts.push(formatUsd(usd))
    return { text: parts.length > 0 ? parts.join(' · ') : 'Henüz kullanım verisi yok.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || (await read($, isHidden))) return next(e)

    const groups = pillsOf({
      now: await read($, now),
      fiveHour: await read($, fiveHour),
      sevenDay: await read($, sevenDay),
      context: await read($, context),
      cost: await read($, cost),
      tokens: await read($, tokens),
    })
    if (groups.length === 0) return next(e)

    if (e.surface === 'terminal') {
      const { Box, Text } = $.ui.resolve(e)
      const pill = (p: Pill) => {
        const color = TERMINAL_COLOR[p.key]
        if (p.kind === 'stat') {
          return (
            <Box key={p.key}>
              <Text color={color}>{TERMINAL_ICON[p.icon]} </Text>
              <Text>{p.text}</Text>
            </Box>
          )
        }
        const bar = terminalBar(p.percent, p.elapsed)
        const fill = LEVEL_COLOR[levelOf(p.percent)]
        return (
          <Box key={p.key}>
            <Text color={color}>{p.key === 'five' ? '◔' : '▦'} {p.label} </Text>
            {bar.cells.map((cell, i) =>
              i === bar.marker ? (
                <Text color={color}>│</Text>
              ) : (
                <Text color={cell === '█' ? fill : undefined} dimColor={cell !== '█'}>
                  {cell}
                </Text>
              ),
            )}
            <Text bold> {formatPercent(p.percent)}</Text>
            {p.remaining !== null && <Text dimColor> ↻ {p.remaining}</Text>}
          </Box>
        )
      }
      return (
        <Box flexDirection="row" flexWrap="wrap" columnGap={4}>
          {groups.map((g, i) => (
            <Box key={`g${i}`} flexDirection="row" columnGap={2}>
              {g.map(pill)}
            </Box>
          ))}
        </Box>
      )
    }

    if (e.surface !== 'desktop') return next(e)
    const { Box, Svg } = $.ui.resolve(e)
    return (
      <Box flexDirection="row" flexWrap="wrap" columnGap={14} rowGap={6}>
        {groups.map((g, i) => (
          <Box key={`g${i}`} flexDirection="row" flexWrap="wrap" columnGap={6} rowGap={6}>
            {g.map(p => {
              const svg = svgOf(p)
              return (
                <Svg
                  key={p.key}
                  source={svg.source}
                  alt={p.title.split('\n')[0] ?? p.key}
                  width={svg.width}
                  height={svg.height}
                  isInteractive
                />
              )
            })}
          </Box>
        ))}
      </Box>
    )
  })
}
