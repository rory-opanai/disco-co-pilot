import { describe, it, expect } from 'vitest'
import { POST as nbqPOST } from '../app/api/nbq/route'

describe('API /api/nbq', () => {
  const hasKey = !!process.env.OPENAI_API_KEY
  const hasDb = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING)

  it('returns an NBQ for a simple utterance (requires DB & OpenAI)', async () => {
    if (!hasKey || !hasDb) {
      console.warn('Skipping nbq test: missing OPENAI_API_KEY or DATABASE_URL')
      return
    }
    const body = { lastUtterance: 'We are unsure about budget and decision process', checklist: {} }
    const req = new Request('http://localhost/api/nbq', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const res = await nbqPOST(req as any)
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(json).toHaveProperty('nbq')
    if (json.nbq) {
      expect(typeof json.nbq.question).toBe('string')
      expect(typeof json.nbq.checklist_category).toBe('string')
    }
  }, 90000)
})

