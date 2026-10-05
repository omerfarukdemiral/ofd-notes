// Pure drawing helpers for the usage band: number and time formats, and the
// SVG source of each pill. No `$` here, so a preview script can reuse it.

import type { UsageBandContext, UsageBandLimit, UsageBandTokens } from '../types'

export type Tone = 'five' | 'seven' | 'input' | 'output' | 'cache' | 'cost'
export type IconName = 'gauge' | 'calendar' | 'up' | 'down' | 'layers' | 'dollar'

const HOUR = 3_600_000
const DAY = 24 * HOUR
export const WINDOW_MS = { five: 5 * HOUR, seven: 7 * DAY } as const

/** 954 → "954", 15_600 → "15.6k", 954_200 → "954.2k", 1_250_000 → "1.25M". */
export function formatTokens(n: number): string {
  if (n < 1000) return String(Math.round(n))
  if (n < 999_950) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

/** Remaining time: "1d 7h" from a day up, "2h 40m" below, "12m" under an hour. */
export function formatRemaining(ms: number, isDays: boolean): string {
  const left = Math.max(0, ms)
  if (isDays && left >= DAY) {
    return `${Math.floor(left / DAY)}d ${Math.floor((left % DAY) / HOUR)}h`
  }
  const minutes = Math.floor(left / 60_000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatPercent(p: number): string {
  return `${Math.round(p)}%`
}

export function formatUsd(usd: number): string {
  return `$${usd.toFixed(2)}`
}

/** 0..1: how much of the window has passed (1 − remaining / length). */
export function elapsedFraction(limit: UsageBandLimit, now: number, windowMs: number): number | null {
  if (limit.resetsAt === null) return null
  const left = limit.resetsAt - now
  return Math.min(1, Math.max(0, 1 - left / windowMs))
}

export type Level = 'ok' | 'warn' | 'high'
export function levelOf(percent: number): Level {
  return percent >= 90 ? 'high' : percent >= 70 ? 'warn' : 'ok'
}

// ---------------------------------------------------------------- SVG

type Palette = { bg: string; fg: string; darkBg: string; darkFg: string }
const PALETTE: Record<Tone, Palette> = {
  five: { bg: '#d3f4ec', fg: '#0b4d43', darkBg: '#113c36', darkFg: '#b2efe2' },
  seven: { bg: '#ebe2fb', fg: '#43296f', darkBg: '#2d2146', darkFg: '#dccff7' },
  input: { bg: '#fde1de', fg: '#7a1f1a', darkBg: '#45211e', darkFg: '#f8c5bf' },
  output: { bg: '#dbf2dc', fg: '#1d5a23', darkBg: '#1c3b20', darkFg: '#c1eac4' },
  cache: { bg: '#dce8fb', fg: '#1c3e78', darkBg: '#1b2b46', darkFg: '#c3d7f7' },
  cost: { bg: '#fbeec6', fg: '#6b4b00', darkBg: '#3e3213', darkFg: '#f3db98' },
}

const ICONS: Record<IconName | 'timer', string> = {
  gauge:
    '<path d="M2.5 12a5.5 5.5 0 0 1 11 0"/><path d="M8 12l2.8-3.6"/><circle cx="8" cy="12" r="1" class="dot"/>',
  calendar:
    '<rect x="2.5" y="3.5" width="11" height="10" rx="1.6"/><path d="M2.5 6.8h11M5.5 2v3M10.5 2v3"/>',
  up: '<path d="M8 13.5V2.8M3.8 7L8 2.8 12.2 7"/>',
  down: '<path d="M8 2.5v10.7M3.8 9L8 13.2 12.2 9"/>',
  layers: '<path d="M8 2.2l6 3.3-6 3.3-6-3.3z"/><path d="M2 8.4l6 3.3 6-3.3"/><path d="M2 11.2l6 3.3 6-3.3"/>',
  dollar:
    '<path d="M11.2 4.6C10.6 3.7 9.4 3.1 8 3.1c-1.8 0-3 .9-3 2.2 0 3.1 6.2 1.7 6.2 5 0 1.4-1.3 2.4-3.2 2.4-1.4 0-2.6-.6-3.2-1.6M8 1.3v13.4"/>',
  timer: '<circle cx="8" cy="9" r="5.2"/><path d="M8 9V6.4M6.3 1.9h3.4M12 4.6l1-1"/>',
}

const FONT = 12
const CH = FONT * 0.6 // monospace advance
const H = 24
const PAD = 9
const ICON = 14

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function textWidth(s: string): number {
  return s.length * CH
}

function style(tone: Tone): string {
  const p = PALETTE[tone]
  // Scoped to this pill's root, so pills sharing one document keep their own colors.
  const r = `.t-${tone}`
  return `<style>
${r} .bg{fill:${p.bg}}${r} .fg{fill:${p.fg}}${r} .ic{stroke:${p.fg};fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}${r} .ic .dot{fill:${p.fg};stroke:none}
${r} .sep{stroke:${p.fg};stroke-opacity:.3}${r} .tr{fill:${p.fg};fill-opacity:.16}${r} .mk{stroke:${p.fg};stroke-width:1.5}
${r} .ok{fill:#2b9a46}${r} .warn{fill:#d39b00}${r} .high{fill:#d6332f}
${r} text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;font-size:${FONT}px}${r} .b{font-weight:700}
@media (prefers-color-scheme: dark){${r} .bg{fill:${p.darkBg}}${r} .fg{fill:${p.darkFg}}${r} .ic{stroke:${p.darkFg}}${r} .ic .dot{fill:${p.darkFg}}
${r} .sep,${r} .mk{stroke:${p.darkFg}}${r} .tr{fill:${p.darkFg}}${r} .ok{fill:#4fcf6b}${r} .warn{fill:#f5c518}${r} .high{fill:#ff6b64}}
</style>`
}

function icon(name: IconName | 'timer', x: number, size = ICON): string {
  const y = (H - size) / 2
  return `<g class="ic" transform="translate(${x} ${y}) scale(${size / 16})">${ICONS[name]}</g>`
}

function wrap(tone: Tone, width: number, title: string, body: string): string {
  const w = Math.ceil(width)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="t-${tone}" width="${w}" height="${H}" viewBox="0 0 ${w} ${H}">` +
    `<title>${esc(title)}</title>${style(tone)}` +
    `<rect class="bg" x="0" y="0" width="${w}" height="${H}" rx="${H / 2}"/>${body}</svg>`
  )
}

const BASE = H / 2 + FONT * 0.35 // text baseline that centers caps

export type Svg = { source: string; width: number; height: number }

export function limitSvg(args: {
  tone: 'five' | 'seven'
  label: string
  percent: number
  elapsed: number | null
  remaining: string | null
  title: string
}): Svg {
  const { tone, label, percent, elapsed, remaining, title } = args
  const BAR = 42
  const pct = formatPercent(percent)
  let x = PAD
  let body = icon(tone === 'five' ? 'gauge' : 'calendar', x)
  x += ICON + 6
  body += `<text class="fg" x="${x}" y="${BASE}">${esc(label)}</text>`
  x += textWidth(label) + 7
  const fill = Math.max(0, Math.min(1, percent / 100)) * BAR
  const barY = H / 2 - 3
  body += `<rect class="tr" x="${x}" y="${barY}" width="${BAR}" height="6" rx="3"/>`
  if (fill > 0) {
    body += `<rect class="${levelOf(percent)}" x="${x}" y="${barY}" width="${fill.toFixed(1)}" height="6" rx="3"/>`
  }
  if (elapsed !== null) {
    const mx = (x + elapsed * BAR).toFixed(1)
    body += `<line class="mk" x1="${mx}" x2="${mx}" y1="${H / 2 - 6}" y2="${H / 2 + 6}"/>`
  }
  x += BAR + 7
  body += `<text class="fg b" x="${x}" y="${BASE}">${esc(pct)}</text>`
  x += textWidth(pct)
  if (remaining !== null) {
    x += 7
    body += `<line class="sep" x1="${x}" x2="${x}" y1="6" y2="${H - 6}"/>`
    x += 7
    body += icon('timer', x, 13)
    x += 13 + 4
    body += `<text class="fg" x="${x}" y="${BASE}">${esc(remaining)}</text>`
    x += textWidth(remaining)
  }
  return { source: wrap(tone, x + PAD, title, body), width: Math.ceil(x + PAD), height: H }
}

export function statSvg(args: { tone: Tone; icon: IconName; text: string; title: string }): Svg {
  const { tone, text, title } = args
  let x = PAD
  let body = icon(args.icon, x)
  x += ICON + 5
  body += `<text class="fg" x="${x}" y="${BASE}">${esc(text)}</text>`
  x += textWidth(text)
  return { source: wrap(tone, x + PAD, title, body), width: Math.ceil(x + PAD), height: H }
}

// ---------------------------------------------------------------- the band's model

export type BandData = {
  now: number
  fiveHour: UsageBandLimit | null
  sevenDay: UsageBandLimit | null
  context: UsageBandContext | null
  cost: number | null
  tokens: UsageBandTokens | null
}

export type LimitPill = {
  kind: 'limit'
  key: 'five' | 'seven'
  label: string
  percent: number
  elapsed: number | null
  remaining: string | null
  title: string
}
export type StatPill = { kind: 'stat'; key: 'input' | 'output' | 'cache' | 'cost'; icon: IconName; text: string; title: string }
export type Pill = LimitPill | StatPill

function footer(d: BandData): string {
  const lines: string[] = []
  const c = d.context
  if (c !== null && c.tokens !== null) {
    const pct = c.percent ?? Math.round((c.tokens / c.window) * 100)
    lines.push(`Bağlam: ${pct}% (${formatTokens(c.tokens)} / ${formatTokens(c.window)})`)
  }
  if (d.tokens !== null) lines.push(`İstek sayısı: ${d.tokens.requests}${d.tokens.isEstimate ? ' tur' : ''}`)
  return lines.length > 0 ? `\n\n${lines.join('\n')}` : ''
}

/** The band's pills in groups: [5h 7d] [in out cache] [cost]; empty groups dropped. */
export function pillsOf(d: BandData): Pill[][] {
  const groups: Pill[][] = []
  const tail = footer(d)

  const limits: Pill[] = []
  for (const [key, label, limit, name] of [
    ['five', '5h', d.fiveHour, '5 saatlik pencere'],
    ['seven', '7d', d.sevenDay, '7 günlük pencere'],
  ] as const) {
    if (limit === null) continue
    const windowMs = WINDOW_MS[key]
    const elapsed = elapsedFraction(limit, d.now, windowMs)
    const remaining = limit.resetsAt === null ? null : formatRemaining(limit.resetsAt - d.now, key === 'seven')
    const title =
      `${name}: ${formatPercent(limit.percent)} kullanıldı` +
      (remaining === null ? '' : `\nSıfırlanmaya kalan: ${remaining}`) +
      (elapsed === null ? '' : `\nPencerenin geçen kısmı: ${Math.round(elapsed * 100)}% (dikey çizgi)`) +
      tail
    limits.push({ kind: 'limit', key, label, percent: limit.percent, elapsed, remaining, title })
  }
  if (limits.length > 0) groups.push(limits)

  const t = d.tokens
  if (t !== null) {
    const mark = t.isEstimate ? '~' : ''
    const note = t.isEstimate ? '\n(yaklaşık: döküm okunamadı, tur sonu toplamı)' : ''
    groups.push([
      {
        kind: 'stat',
        key: 'input',
        icon: 'up',
        text: mark + formatTokens(t.input + t.cacheWrite),
        title:
          `Giriş: ${formatTokens(t.input + t.cacheWrite)}\n  önbelleksiz: ${formatTokens(t.input)}` +
          `\n  önbelleğe yazılan: ${formatTokens(t.cacheWrite)}${note}${tail}`,
      },
      {
        kind: 'stat',
        key: 'output',
        icon: 'down',
        text: mark + formatTokens(t.output),
        title: `Çıkış: ${formatTokens(t.output)}${note}${tail}`,
      },
      {
        kind: 'stat',
        key: 'cache',
        icon: 'layers',
        text: mark + formatTokens(t.cacheRead),
        title: `Önbellekten okunan: ${formatTokens(t.cacheRead)}${note}${tail}`,
      },
    ])
  }

  if (d.cost !== null) {
    groups.push([
      {
        kind: 'stat',
        key: 'cost',
        icon: 'dollar',
        text: formatUsd(d.cost),
        title: `Oturum maliyeti: ${formatUsd(d.cost)}\nAPI liste fiyatıyla hesaplanır${tail}`,
      },
    ])
  }
  return groups
}

export function svgOf(p: Pill): Svg {
  return p.kind === 'limit'
    ? limitSvg({ tone: p.key, label: p.label, percent: p.percent, elapsed: p.elapsed, remaining: p.remaining, title: p.title })
    : statSvg({ tone: p.key, icon: p.icon, text: p.text, title: p.title })
}

/** Terminal bar: 10 cells of █/░, the elapsed marker as │. */
export function terminalBar(percent: number, elapsed: number | null): { filled: string; marker: number | null; cells: string[] } {
  const N = 10
  const full = Math.round(Math.max(0, Math.min(100, percent)) / 10)
  const cells = Array.from({ length: N }, (_, i) => (i < full ? '█' : '░'))
  const marker = elapsed === null ? null : Math.min(N - 1, Math.max(0, Math.round(elapsed * N) - (elapsed >= 1 ? 1 : 0)))
  return { filled: cells.slice(0, full).join(''), marker, cells }
}

export const TERMINAL_COLOR: Record<Tone, string> = {
  five: '#38c2a8',
  seven: '#a78bfa',
  input: '#f2847a',
  output: '#5cc46a',
  cache: '#6aa5f0',
  cost: '#e2b93b',
}
export const LEVEL_COLOR: Record<Level, string> = { ok: '#40b85a', warn: '#e6b422', high: '#e5534b' }
export const TERMINAL_ICON: Record<IconName, string> = {
  gauge: '◔',
  calendar: '▦',
  up: '↑',
  down: '↓',
  layers: '≡',
  dollar: '$',
}
