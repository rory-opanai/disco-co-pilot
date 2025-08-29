import { describe, it, expect } from 'vitest'
import { getTextDelta, isResponseDone } from '../lib/realtimeEventUtils'

describe('realtimeEventUtils', () => {
  it('detects text deltas for both event names', () => {
    const a = { type: 'response.text.delta', delta: 'Hello' }
    const b = { type: 'response.output_text.delta', delta: 'World' }
    expect(getTextDelta(a)).toBe('Hello')
    expect(getTextDelta(b)).toBe('World')
  })

  it('returns null for non-delta events or missing delta', () => {
    expect(getTextDelta({ type: 'response.text.delta' })).toBeNull()
    expect(getTextDelta({ type: 'something.else' })).toBeNull()
    expect(getTextDelta(null as any)).toBeNull()
  })

  it('detects response completion for both event names', () => {
    expect(isResponseDone({ type: 'response.done' })).toBe(true)
    expect(isResponseDone({ type: 'response.completed' })).toBe(true)
    expect(isResponseDone({ type: 'response.text.delta' })).toBe(false)
  })
})

