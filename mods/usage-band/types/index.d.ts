/** One rate-limit window: how much is used and when it resets. */
export type UsageBandLimit = { percent: number; resetsAt: number | null }

/** The live context window's fill. */
export type UsageBandContext = { tokens: number | null; window: number; percent: number | null }

/** Token totals of the session (main transcript and subagents). */
export type UsageBandTokens = {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  requests: number
  /** True when summed from turn.complete instead of the transcript. */
  isEstimate: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'usage-band': {
      fiveHour: UsageBandLimit | null
      sevenDay: UsageBandLimit | null
      context: UsageBandContext | null
      cost: number | null
      tokens: UsageBandTokens | null
      fallback: UsageBandTokens | null
      now: number
      isHidden: boolean
    }
  }
}
