import type { RenderElement } from 'claude-code'
import { expect, test } from 'claude-code/testing'

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

test('falls back to turn.complete totals with a ~ when the script fails', async ($, on) => {
  on('ui.render', ($, e) => {
    const { Box } = $.ui.resolve(e)
    return h(Box, { key: 'engine' }) as RenderElement
  })
  on('turn.complete', ($, e) => ({ text: e.answer, usage: e.usage }))
  on('session.id', () => ({ value: 'abc' }))
  on('process.run', () => ({
    value: { exitCode: 1, stdout: '', stderr: 'no transcript', isStdoutTruncated: false, isStderrTruncated: false },
  }))

  const usage = { input_tokens: 600, output_tokens: 3_000, cache_read_input_tokens: 954_200, cache_creation_input_tokens: 15_000, model: 'm' }
  await $.turn.complete({ answer: '', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer', usage })

  const term = await $.ui.mount({ plugin: 'usage-band', surface: 'terminal', ...BAND })
  expect((await term.find({ key: 'input' }))?.text).toContain('~15.6k')
  expect((await term.find({ key: 'cache' }))?.text).toContain('~954.2k')
  expect(await term.find({ key: 'five' })).toBeUndefined()
  await term.unmount()
})
