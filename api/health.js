/**
 * Vercel serverless: tells the UI this deployment uses cloud transcription + optional AI.
 */
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  res.status(200).json({
    ok: true,
    mode: 'cloud',
    transcribe: 'openai-whisper-1',
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
  })
}
