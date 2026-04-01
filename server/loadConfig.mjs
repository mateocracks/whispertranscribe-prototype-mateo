import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const CONFIG_PATH = path.join(__dirname, 'whisper.config.json')

const DEFAULT_OPENAI_ARGS = [
  '{input}',
  '--model',
  '{model}',
  '--output_dir',
  '{outputDir}',
  '--output_format',
  'all',
]

export function loadWhisperConfig() {
  let file = {}
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8')
    file = JSON.parse(raw)
  } catch {
    file = { profile: 'openai' }
  }

  const profile =
    process.env.WHISPER_PROFILE || file.profile || 'openai'

  if (profile === 'whisperCpp') {
    const cpp = file.whisperCpp || {}
    const command =
      process.env.WHISPER_COMMAND || cpp.command || 'whisper-cli'
    const modelPath =
      process.env.WHISPER_CPP_MODEL || cpp.modelPath || ''
    const args = Array.isArray(cpp.args)
      ? cpp.args
      : ['-m', '{modelPath}', '-f', '{input}', '-oj', '-of', '{outputBase}']
    return { profile: 'whisperCpp', command, args, modelPath }
  }

  const openai = file.openai || {}
  const command = process.env.WHISPER_COMMAND || openai.command || 'whisper'
  const args = Array.isArray(openai.args) ? openai.args : DEFAULT_OPENAI_ARGS
  return { profile: 'openai', command, args, modelPath: '' }
}
