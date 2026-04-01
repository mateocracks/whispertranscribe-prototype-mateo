import express from 'express'
import multer from 'multer'
import { randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { loadWhisperConfig } from './loadConfig.mjs'
import {
  buildArgList,
  runWhisperProcess,
  collectTranscriptFiles,
} from './whisperRunner.mjs'
import {
  friendlyHint,
  parseProgressPercent,
  shouldSkipLine,
} from './progressParser.mjs'

const PORT = Number(process.env.WHISPER_API_PORT || 8787)
const HOST = '127.0.0.1'
/** Where the Vite UI runs (for the “wrong port” help page). */
const WEB_UI_HINT =
  process.env.WEB_UI_URL || 'http://127.0.0.1:5173'

const app = express()

// Visiting the API URL in a browser shows nothing useful by default — explain the two servers.
app.get('/', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Whisper API (backend only)</title>
<style>body{font-family:system-ui,sans-serif;max-width:36rem;margin:2rem auto;padding:0 1rem;line-height:1.5;color:#222}
code{background:#eee;padding:.15em .35em;border-radius:4px}a{color:#1a5}</style></head><body>
<h1>This address is only the API</h1>
<p>You opened the <strong>Whisper backend</strong> (<code>${HOST}:${PORT}</code>). It has no transcript screen here—that is normal.</p>
<p><strong>Open the app in your browser:</strong><br/>
<a href="${WEB_UI_HINT}">${WEB_UI_HINT}</a></p>
<p>From the project folder run <code>npm run dev</code> or <code>npm run dev:all</code> so that page loads. The API and the UI are two different ports.</p>
<p><a href="/api/health">API health (JSON)</a></p>
</body></html>`)
})
/** @type {Map<string, any>} */
const jobs = new Map()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
})

app.get('/api/health', (_req, res) => {
  const config = loadWhisperConfig()
  res.json({
    ok: true,
    profile: config.profile,
    command: config.command,
    host: HOST,
    port: PORT,
    whisperCppModelConfigured: Boolean(
      config.profile !== 'whisperCpp' || config.modelPath
    ),
  })
})

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id)
  if (!job) {
    res.status(404).json({ error: 'Job not found' })
    return
  }
  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress ?? 0,
    statusMessage: job.statusMessage ?? '',
    error: job.error,
    result: job.status === 'done' ? job.result : undefined,
  })
})

app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  if (!req.file?.buffer) {
    res.status(400).json({ error: 'Missing multipart field "file" (audio).' })
    return
  }

  const config = loadWhisperConfig()
  const jobId = randomUUID()
  const jobRoot = path.join(os.tmpdir(), 'whispertranscribe-jobs')
  await fs.mkdir(jobRoot, { recursive: true })
  const jobDir = path.join(jobRoot, jobId)
  await fs.mkdir(jobDir, { recursive: true })

  const ext = path.extname(req.file.originalname || '') || '.wav'
  const safeExt = /^\.[a-z0-9]+$/i.test(ext) ? ext : '.wav'
  const inputBasename = `input${safeExt}`
  const inputPath = path.join(jobDir, inputBasename)

  try {
    await fs.writeFile(inputPath, req.file.buffer)
  } catch (e) {
    res.status(500).json({ error: `Could not save upload: ${e.message}` })
    return
  }

  const model = String(req.body?.model || 'base').trim() || 'base'
  const language = String(req.body?.language || '').trim()

  const job = {
    id: jobId,
    status: 'queued',
    progress: 0,
    statusMessage: 'Queued…',
    createdAt: Date.now(),
    error: null,
    result: null,
  }
  jobs.set(jobId, job)

  res.status(202).json({ jobId })

  runJob(job, config, {
    inputPath,
    inputBasename,
    jobDir,
    model,
    language,
  }).catch((e) => {
    job.status = 'error'
    job.error = e.message
    job.progress = 0
    job.statusMessage = ''
  })
})

/**
 * @param {any} job
 * @param {any} config
 * @param {{ inputPath: string, inputBasename: string, jobDir: string, model: string, language: string }} ctx
 */
async function runJob(job, config, ctx) {
  const { inputPath, inputBasename, jobDir, model, language } = ctx
  job.status = 'running'
  job.progress = 4
  job.statusMessage = 'Starting Whisper…'

  const bumpProgress = () => {
    if (job.status !== 'running') return
    if (job.progress < 88) {
      job.progress = Math.min(88, job.progress + 1)
      if (!job.statusMessage) job.statusMessage = 'Transcribing…'
    }
  }
  const bumpTimer = setInterval(bumpProgress, 2800)

  const onStderr = (chunk) => {
    const lines = chunk.split(/\r?\n/)
    for (const line of lines) {
      if (!line.trim() || shouldSkipLine(line)) continue
      const pct = parseProgressPercent(line)
      if (pct != null) {
        job.progress = Math.max(job.progress, pct)
        job.statusMessage = 'Transcribing…'
        continue
      }
      const hint = friendlyHint(line)
      if (hint) job.statusMessage = hint
    }
  }

  try {
    if (config.profile === 'whisperCpp' && !config.modelPath) {
      throw new Error(
        'whisperCpp needs modelPath in server/whisper.config.json or WHISPER_CPP_MODEL. See server/README.md.'
      )
    }

    const outputBase = path.join(jobDir, 'out')
    const argList = buildArgList(config, {
      inputPath,
      outputDir: jobDir,
      model,
      language: config.profile === 'openai' ? language : '',
      modelPath: config.modelPath || '',
      outputBase,
    })

    await runWhisperProcess(config, argList, onStderr)

    const collected = await collectTranscriptFiles(jobDir, inputBasename)
    job.result = collected
    job.status = 'done'
    job.progress = 100
    job.statusMessage = 'Done'
  } catch (e) {
    job.status = 'error'
    job.error = humanizeError(e.message)
    job.progress = 0
    job.statusMessage = ''
  } finally {
    clearInterval(bumpTimer)
  }
}

/** Shorter error for UI: drop huge usage blocks, keep first useful line */
function humanizeError(msg) {
  if (!msg) return 'Whisper failed.'
  const lines = msg.split(/\n/).map((l) => l.trim()).filter(Boolean)
  const usageIdx = lines.findIndex((l) => l.startsWith('usage:'))
  const core = usageIdx >= 0 ? lines.slice(0, usageIdx) : lines
  const kept = core.filter((l) => !l.startsWith('[') || l.length < 80)
  const text = (kept.length ? kept : lines).join('\n').slice(0, 4000)
  return text || msg.slice(0, 2000)
}

app.listen(PORT, HOST, () => {
  console.log(`Whisper API  http://${HOST}:${PORT}`)
  console.log(`Open the UI at ${WEB_UI_HINT} (run npm run dev or npm run dev:all)`)
})
