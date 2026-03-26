import data from './example-transcript.json'

export const record = data.record

export function formatTime(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function groupIntoParagraphs(words, speakers) {
  const paragraphs = []
  let current = null

  for (const word of words) {
    if (!current || current.speaker !== word.speaker) {
      if (current) paragraphs.push(current)
      const speakerInfo = speakers.find(s => s.speaker === word.speaker)
      current = {
        speaker: word.speaker,
        speakerLabel: speakerInfo?.speakerLabel || `Speaker ${word.speaker}`,
        startTime: word.start,
        endTime: word.end,
        words: [word.punctuated_word],
      }
    } else {
      current.endTime = word.end
      current.words.push(word.punctuated_word)
    }
  }
  if (current) paragraphs.push(current)

  return paragraphs.map(p => ({
    ...p,
    text: p.words.join(' '),
  }))
}

export const paragraphs = groupIntoParagraphs(data.words, data.record.speakers)

function resolveSpeakerPlaceholders(text, speakers) {
  let resolved = text
  for (const s of speakers) {
    resolved = resolved.replaceAll(`{{speaker:${s.speaker}}}`, s.speakerLabel)
  }
  return resolved
}

export const contentItems = (data.content || []).map(item => ({
  ...item,
  results: item.results.map(r => ({
    ...r,
    body: resolveSpeakerPlaceholders(r.body || '', data.record.speakers),
  })),
}))
