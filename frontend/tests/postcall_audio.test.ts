import { describe, it, expect } from 'vitest'
import { POST as postcallPOST } from '../app/api/postcall/[sessionId]/route'

// Generate a tiny 16-bit PCM WAV (1 second of silence) for a valid audio container.
function makeSilentWav(seconds = 1, sampleRate = 16000) {
  const numSamples = seconds * sampleRate
  const bytesPerSample = 2
  const blockAlign = bytesPerSample * 1
  const byteRate = sampleRate * blockAlign
  const dataSize = numSamples * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  // RIFF header
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, 1, true) // channels
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true) // bits per sample
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)
  // Samples are zero (silence)
  return Buffer.from(buffer)
}

describe('API /api/postcall/[sessionId] (audio)', () => {
  const hasKey = !!process.env.OPENAI_API_KEY
  const hasDb = !!(process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING)

  it('accepts an audio upload and returns JSON (requires OpenAI & DB)', async () => {
    if (!hasKey || !hasDb) {
      console.warn('Skipping postcall audio test: missing OPENAI_API_KEY or DATABASE_URL')
      return
    }
    const wav = makeSilentWav(1)
    const form = new FormData()
    form.append('audio', new Blob([wav], { type: 'audio/wav' }), 'silence.wav')
    const req = new Request('http://localhost/api/postcall/sess_test', { method: 'POST', body: form })
    const res = await postcallPOST(req as any, { params: { sessionId: 'sess_test' } } as any)
    expect(res.ok).toBe(true)
    const json = await res.json()
    expect(json).toHaveProperty('summary')
  }, 120000)
})

