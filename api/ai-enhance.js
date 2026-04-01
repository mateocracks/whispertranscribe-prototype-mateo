import { enhanceTranscript } from '../lib/openaiEnhance.mjs'

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body
  }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return {}
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const body = await readJsonBody(req)
  const rawType = body?.type
  const type =
    typeof rawType === 'string' ? rawType.trim().toLowerCase() : ''
  const text = typeof body?.text === 'string' ? body.text : ''

  const allowed = ['clean', 'social', 'blog']
  if (!allowed.includes(type)) {
    res.status(400).json({
      error:
        'Invalid or missing type. Use "clean", "social", or "blog".',
    })
    return
  }
  if (!text.trim()) {
    res.status(400).json({ error: 'Body must include non-empty text.' })
    return
  }

  try {
    const out = await enhanceTranscript(type, text)
    res.status(200).json(out)
  } catch (e) {
    const code = e.code
    if (code === 'NO_API_KEY') {
      res.status(503).json({ error: e.message })
      return
    }
    res.status(500).json({ error: e.message || 'AI enhancement failed.' })
  }
}
