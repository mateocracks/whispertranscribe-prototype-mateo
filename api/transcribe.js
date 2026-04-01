import { parseTranscribeMultipart } from '../lib/parseMultipart.mjs'
import { transcribeWithOpenAI } from '../lib/openaiTranscribe.mjs'

/**
 * Vercel: one-shot transcription via OpenAI (not the local Whisper job queue).
 * Returns the same `result` shape as GET /api/jobs/:id when done.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    res.status(503).json({
      error:
        'Cloud transcription needs OPENAI_API_KEY set in the Vercel project settings.',
    })
    return
  }

  try {
    const parsed = await parseTranscribeMultipart(req)
    const result = await transcribeWithOpenAI({
      buffer: parsed.buffer,
      filename: parsed.filename,
      mimeType: parsed.mimeType,
      language: parsed.language,
    })
    res.status(200).json({
      mode: 'cloud',
      /** Local Whisper model names are ignored in cloud; API always uses whisper-1 */
      transcribeModel: 'whisper-1',
      result,
    })
  } catch (e) {
    const code = e.code
    if (code === 'NO_FILE') {
      res.status(400).json({ error: e.message })
      return
    }
    if (code === 'NO_KEY') {
      res.status(503).json({ error: e.message })
      return
    }
    if (code === 'TOO_LARGE') {
      res.status(413).json({ error: e.message })
      return
    }
    res.status(500).json({ error: e.message || 'Transcription failed.' })
  }
}
