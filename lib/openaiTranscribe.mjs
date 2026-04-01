/**
 * Transcribe audio via OpenAI Audio API (whisper-1 + verbose_json for segments).
 */

function vttTimestamp(sec) {
  const n = Math.max(0, Number(sec) || 0)
  const h = Math.floor(n / 3600)
  const m = Math.floor((n % 3600) / 60)
  const s = n % 60
  const whole = Math.floor(s)
  const ms = Math.round((s - whole) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(whole).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
}

export function buildVttFromSegments(segments) {
  if (!segments?.length) return null
  const lines = ['WEBVTT', '']
  for (const seg of segments) {
    const t = (seg.text || '').trim()
    if (!t) continue
    lines.push(`${vttTimestamp(seg.start)} --> ${vttTimestamp(seg.end)}`)
    lines.push(t)
    lines.push('')
  }
  return lines.length > 2 ? lines.join('\n') : null
}

/**
 * @param {{ buffer: Buffer, filename: string, mimeType: string, language?: string }} opts
 */
export async function transcribeWithOpenAI(opts) {
  const key = process.env.OPENAI_API_KEY
  if (!key?.trim()) {
    const err = new Error('OPENAI_API_KEY is not set.')
    err.code = 'NO_KEY'
    throw err
  }

  const { buffer, filename, mimeType, language } = opts
  const blob = new Blob([buffer], {
    type: mimeType || 'application/octet-stream',
  })
  const form = new FormData()
  form.append('file', blob, filename || 'audio.mp3')
  form.append('model', 'whisper-1')
  form.append('response_format', 'verbose_json')
  if (language?.trim()) form.append('language', language.trim())

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  })

  const raw = await res.text()
  if (!res.ok) {
    let detail = raw.slice(0, 800)
    try {
      const j = JSON.parse(raw)
      detail = j.error?.message || detail
    } catch {
      /* keep */
    }
    const err = new Error(`Transcription failed (${res.status}): ${detail}`)
    err.code = 'API_ERROR'
    throw err
  }

  let data
  try {
    data = JSON.parse(raw)
  } catch {
    const err = new Error('Invalid JSON from transcription API.')
    err.code = 'PARSE'
    throw err
  }

  const segments = []
  if (Array.isArray(data.segments)) {
    for (const s of data.segments) {
      segments.push({
        start: s.start ?? 0,
        end: s.end ?? 0,
        text: String(s.text || '').trim(),
      })
    }
  }

  let text = typeof data.text === 'string' ? data.text.trim() : ''
  if (!text && segments.length) {
    text = segments.map((x) => x.text).filter(Boolean).join(' ')
  }

  const vttContent = buildVttFromSegments(segments)
  return {
    text,
    segments,
    txtContent: text || null,
    vttContent,
  }
}
