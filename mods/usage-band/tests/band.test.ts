import type { RenderElement, SessionUsage } from 'claude-code'
import { expect, test } from 'claude-code/testing'

import { formatRemaining, formatTokens } from '../hooks/pills'

const BAND = {
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 120,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const
const HOUR = 3_600_000
const RUN = { origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } } as const

test('formats tokens and remaining time', async () => {
  expect(formatTokens(954)).toBe('954')
  expect(formatTokens(3_000)).toBe('3.0k')
  expect(formatTokens(15_600)).toBe('15.6k')
  expect(formatTokens(954_200)).toBe('954.2k')
  expect(formatTokens(1_250_000)).toBe('1.25M')
  expect(formatRemaining(2 * HOUR + 40 * 60_000, false)).toBe('2h 40m')
  expect(formatRemaining(31 * HOUR, true)).toBe('1d 7h')
})

test('draws limits, tokens and cost; hides on /kullanim gizle', async ($, on) => {
  const resets5 = new Date(Date.now() + 2 * HOUR + 40 * 60_000 + 30_000).toISOString()
  const resets7 = new Date(Date.now() + 31 * HOUR + 30_000).toISOString()

  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return h(Box, { key: 'engine' }) as RenderElement
  })
  let measured: SessionUsage = { startedAt: 0, context: { window: 200_000 }, rateLimits: [] }
  on('session.usage', () => ({ value: measured }))
  on('session.measure', ($, e) => ({ changed: e.changed }))
  on('turn.complete', ($, e) => ({ text: e.answer, usage: e.usage }))
  on('command.run', () => ({ text: '' }))
  on('session.id', () => ({ value: 'abc' }))
  on('fs.stat', () => ({ deny: 'none' }))
  on('process.run', () => ({
    value: {
      exitCode: 0,
      stdout: JSON.stringify({
        path: '/x/abc.jsonl',
        size: 1,
        mtimeMs: 1,
        input: 600,
        output: 3_000,
        cacheRead: 954_200,
        cacheWrite: 15_000,
        requests: 12,
      }),
      stderr: '',
      isStdoutTruncated: false,
      isStderrTruncated: false,
    },
  }))

  // Before the first response: nothing to draw.
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'usage-band', surface, ...BAND })
    expect(await ui.find({ key: 'five' })).toBeUndefined()
    expect(await ui.findAll({ type: 'Svg' })).toHaveLength(0)
    await ui.unmount()
  }

  measured = {
    startedAt: 0,
    context: { tokens: 90_000, window: 200_000, percent: 45 },
    rateLimits: [
      { kind: 'five_hour', percentUsed: 20, resetsAt: resets5 },
      { kind: 'seven_day', percentUsed: 58, resetsAt: resets7 },
    ],
    cost: { usd: 4.32 },
  }
  await $.session.measure({ ...measured, changed: ['context', 'rateLimits', 'cost'] })
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' })

  const term = await $.ui.mount({ plugin: 'usage-band', surface: 'terminal', ...BAND })
  expect((await term.find({ key: 'five' }))?.text).toContain('2h 40m')
  expect((await term.find({ key: 'seven' }))?.text).toContain('1d 7h')
  expect((await term.find({ key: 'input' }))?.text).toContain('15.6k')
  expect((await term.find({ key: 'output' }))?.text).toContain('3.0k')
  expect((await term.find({ key: 'cache' }))?.text).toContain('954.2k')
  expect((await term.find({ key: 'cost' }))?.text).toContain('$4.32')
  await term.unmount()

  const desk = await $.ui.mount({ plugin: 'usage-band', surface: 'desktop', ...BAND })
  const svgs = await desk.findAll({ type: 'Svg' })
  expect(svgs.length).toBe(6)
  const five = svgs[0]
  expect(String(five?.props.source)).toContain('20%')
  expect(String(five?.props.source)).toContain('prefers-color-scheme: dark')
  expect(five?.props.isInteractive).toBe(true)
  expect(String(svgs[5]?.props.source)).toContain('API liste fiyatıyla')
  expect(String(svgs[4]?.props.source)).toContain('954.2k')
  await desk.unmount()

  const summary = await $.command.run({ command: 'kullanim', args: '', ...RUN })
  expect(summary.text).toContain('5h 20%')

  await $.command.run({ command: 'kullanim', args: 'gizle', ...RUN })
  const hidden = await $.ui.mount({ plugin: 'usage-band', surface: 'desktop', ...BAND })
  expect(await hidden.findAll({ type: 'Svg' })).toHaveLength(0)
  await hidden.unmount()

  await $.command.run({ command: 'kullanim', args: 'goster', ...RUN })
  const shown = await $.ui.mount({ plugin: 'usage-band', surface: 'desktop', ...BAND })
  expect(await shown.findAll({ type: 'Svg' })).toHaveLength(6)
  await shown.unmount()
})
