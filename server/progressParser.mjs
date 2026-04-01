/** Lines we never show to the user or use for status text */
const SKIP = [
  /UserWarning:/i,
  /warnings\.warn/i,
  /site-packages/i,
  /FP16 is not supported/i,
  /FP32 instead/i,
  /^usage:\s*whisper/i,
  /^\s*whisper:\s*error/i,
]

/** @param {string} line */
export function shouldSkipLine(line) {
  const t = line.trim()
  if (!t) return true
  if (SKIP.some((re) => re.test(t))) return true
  if (t.startsWith('$')) return true
  if (/\/var\/folders\//.test(t) || /\/tmp\//i.test(t)) return true
  if (t.length > 200) return true
  return false
}

/**
 * tqdm / Whisper often prints e.g. " 45%|████▌     | 45/100 [00:30<00:00, 3.33it/s]"
 * @param {string} line
 * @returns {number | null} 0–100
 */
export function parseProgressPercent(line) {
  const tqdm = line.match(/(\d{1,3})%\s*[|┃│]/)
  if (tqdm) return clampPercent(parseInt(tqdm[1], 10))
  const tqdm2 = line.match(/[|┃│]\s*(\d{1,3})%/)
  if (tqdm2) return clampPercent(parseInt(tqdm2[1], 10))
  const bare = line.match(/(?:^|\s)(\d{1,3})%(?:\s|$|[^\d])/)
  if (bare) return clampPercent(parseInt(bare[1], 10))
  return null
}

function clampPercent(n) {
  if (Number.isNaN(n)) return null
  return Math.min(100, Math.max(0, n))
}

/**
 * Short user-facing hint from a stderr line (no paths, no shell noise).
 * @param {string} line
 */
export function friendlyHint(line) {
  const t = line.trim()
  if (!t || shouldSkipLine(line)) return null
  if (/^\d+%/.test(t)) return 'Transcribing…'
  if (/detecting language/i.test(t)) return 'Detecting language…'
  if (/detected language/i.test(t)) {
    const m = t.match(/detected language:\s*(.+)/i)
    return m ? `Language: ${m[1].slice(0, 40)}` : 'Language detected'
  }
  if (/loading model/i.test(t)) return 'Loading model…'
  if (/running on/i.test(t)) return 'Starting…'
  return null
}
