/**
 * Calls an OpenAI-compatible Chat Completions API to polish or repurpose transcript text.
 * Configure with OPENAI_API_KEY. Optional: OPENAI_BASE_URL (default https://api.openai.com/v1), OPENAI_MODEL (default gpt-4o-mini).
 */

const DEFAULT_BASE = 'https://api.openai.com/v1'
const DEFAULT_MODEL = 'gpt-4o-mini'
/** Rough char budget so requests stay within model context with room for the reply */
const MAX_INPUT_CHARS = 100_000

const CLEAN_SYSTEM = `You are a professional transcript editor. Your job is to clean up automatic speech-to-text output.

Rules:
- Fix spelling, grammar, and punctuation; add paragraph breaks where topics shift.
- Remove obvious filler (excessive "um", "uh", "like") when it does not change meaning.
- Keep the speaker's meaning, opinions, and facts exactly as stated—do not invent or remove substantive content.
- Do not add a title unless the transcript clearly starts with one.
- Output plain text only—no markdown headings, no bullet lists unless they were clearly implied as lists in the original.
- If the input is not in English, keep the same language.`

const SOCIAL_SYSTEM = `You write short-form social captions for TikTok, Instagram Reels, and YouTube Shorts.

Rules:
- Hook the viewer in the first line; keep energy high but authentic to the content.
- 2–4 short lines of body copy (not a wall of text).
- End with a line of 3–6 relevant hashtags (single line, each starting with #).
- Do not claim the creator said things they did not; stay faithful to the transcript themes.
- Output plain text only.`

const BLOG_SYSTEM = `You turn spoken transcripts into a short, readable newsletter post suitable for Substack (or any simple blog).

Rules:
- First line: a clear, compelling title in plain text (no # markdown).
- Optional second block: one short subtitle or “deck” line, separated from the title by a blank line.
- Then 4–10 short paragraphs of flowing prose. Organize by ideas; use a plain-text section label on its own line only if there are clearly separate topics (e.g. a line like "Why it matters" then a blank line then paragraphs)—no markdown # headings.
- Stay faithful to what was actually said: do not invent quotes, names, numbers, or events. You may tighten and clarify phrasing.
- Warm, human voice—like a thoughtful newsletter, not marketing fluff.
- Optional closing: one short line with a takeaway or gentle question for readers, only if it fits naturally.
- Output plain text only. No numbered lists longer than 3 items; prefer short paragraphs.`

/**
 * @param {'clean' | 'social' | 'blog'} type
 * @param {string} trimmed
 */
function buildMessages(type, trimmed) {
  switch (type) {
    case 'clean':
      return {
        system: CLEAN_SYSTEM,
        user: `Clean this transcript:\n\n${trimmed}`,
        temperature: 0.35,
      }
    case 'social':
      return {
        system: SOCIAL_SYSTEM,
        user: `Here is a video/podcast transcript. Write the social media caption:\n\n${trimmed}`,
        temperature: 0.75,
      }
    case 'blog':
      return {
        system: BLOG_SYSTEM,
        user: `Turn this transcript into a Substack-style blog post (title first, then body):\n\n${trimmed}`,
        temperature: 0.55,
      }
    default:
      return null
  }
}

/**
 * @param {'clean' | 'social' | 'blog'} type
 * @param {string} text
 */
export async function enhanceTranscript(type, text) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey?.trim()) {
    const err = new Error(
      'AI features need an API key. Set OPENAI_API_KEY in your environment (see server/README.md).'
    )
    err.code = 'NO_API_KEY'
    throw err
  }

  const base = (process.env.OPENAI_BASE_URL || DEFAULT_BASE).replace(/\/$/, '')
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL

  const trimmed =
    text.length > MAX_INPUT_CHARS
      ? `${text.slice(0, MAX_INPUT_CHARS)}\n\n[Transcript truncated for AI—first ${MAX_INPUT_CHARS.toLocaleString()} characters only.]`
      : text

  if (!trimmed.trim()) {
    const err = new Error('No transcript text to process.')
    err.code = 'EMPTY'
    throw err
  }

  const msg = buildMessages(type, trimmed)
  if (!msg) {
    const err = new Error(`Unknown enhancement type: ${type}`)
    err.code = 'INVALID_TYPE'
    throw err
  }
  const { system, user, temperature } = msg

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  const raw = await res.text()
  if (!res.ok) {
    let detail = raw.slice(0, 800)
    try {
      const j = JSON.parse(raw)
      detail = j.error?.message || detail
    } catch {
      /* keep detail */
    }
    const err = new Error(`AI request failed (${res.status}): ${detail}`)
    err.code = 'API_ERROR'
    throw err
  }

  let data
  try {
    data = JSON.parse(raw)
  } catch {
    const err = new Error('Invalid response from AI service.')
    err.code = 'PARSE'
    throw err
  }

  const out = data.choices?.[0]?.message?.content?.trim()
  if (!out) {
    const err = new Error('AI returned an empty reply.')
    err.code = 'EMPTY_REPLY'
    throw err
  }

  return { text: out, model, truncated: text.length > MAX_INPUT_CHARS }
}
