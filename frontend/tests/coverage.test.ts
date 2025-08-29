import { describe, it, expect } from 'vitest'
import { POST as coveragePOST } from '../app/api/coverage/route'

describe('API /api/coverage', () => {
  const hasKey = !!process.env.OPENAI_API_KEY

  it('returns coverage for a simple transcript window', async () => {
    if (!hasKey) {
      console.warn('Skipping coverage test: OPENAI_API_KEY not set')
      return
    }
    const body = { transcriptWindow: 'We have budget approved by finance. Timeline is Q4 and security is a concern.' }
    const req = new Request('http://localhost/api/coverage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const res = await coveragePOST(req as any)
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(Array.isArray(json.coverage)).toBe(true)
    // Should include objects with category/status keys
    if (json.coverage.length) {
      const c = json.coverage[0]
      expect(typeof c.category).toBe('string')
      expect(typeof c.status).toBe('string')
    }
  }, 60000)
})

