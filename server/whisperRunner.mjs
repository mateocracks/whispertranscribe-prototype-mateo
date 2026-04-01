import { spawn } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

export function buildArgList(config, ctx) {
  const {
    inputPath,
    outputDir,
    model,
    language,
    modelPath,
    outputBase,
  } = ctx

  if (config.profile === 'whisperCpp') {
    return config.args.map((token) =>
      token
        .replaceAll('{input}', inputPath)
        .replaceAll('{modelPath}', modelPath)
        .replaceAll('{outputBase}', outputBase)
        .replaceAll('{model}', model)
        .replaceAll('{outputDir}', outputDir)
    )
  }

  const out = config.args.map((token) =>
    token
      .replaceAll('{input}', inputPath)
      .replaceAll('{model}', model)
      .replaceAll('{outputDir}', outputDir)
  )

  if (language && language.trim()) {
    const i = out.indexOf('--output_dir')
    if (i >= 0) out.splice(i, 0, '--language', language.trim())
    else out.push('--language', language.trim())
  }

  return out
}

export function runWhisperProcess(config, argList, onStderrChunk) {
  return new Promise((resolve, reject) => {
    const child = spawn(config.command, argList, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderrBuf = ''
    child.stderr?.on('data', (chunk) => {
      const s = chunk.toString()
      stderrBuf += s
      onStderrChunk?.(s)
    })

    let stdoutBuf = ''
    child.stdout?.on('data', (chunk) => {
      stdoutBuf += chunk.toString()
    })

    child.on('error', (err) => {
      reject(
        new Error(
          `Failed to start "${config.command}": ${err.message}. Is it on your PATH? See server/README.md.`
        )
      )
    })

    child.on('close', (code) => {
      if (code === 0) resolve({ stderr: stderrBuf, stdout: stdoutBuf })
      else
        reject(
          new Error(
            `"${config.command}" exited with code ${code}. Last stderr:\n${stderrBuf.slice(-4000)}`
          )
        )
    })
  })
}

export async function collectTranscriptFiles(jobDir, inputBasename) {
  const names = await fs.readdir(jobDir)
  const stem = path.parse(inputBasename).name

  const pick = (ext) => {
    const exact = names.find((n) => n === `${stem}${ext}`)
    if (exact) return path.join(jobDir, exact)
    const loose = names.find((n) => n.endsWith(ext))
    return loose ? path.join(jobDir, loose) : null
  }

  const jsonPath = pick('.json')
  let parsed = null
  let text = ''
  const segments = []

  if (jsonPath) {
    try {
      const raw = await fs.readFile(jsonPath, 'utf8')
      parsed = JSON.parse(raw)
    } catch {
      parsed = null
    }
  }

  if (parsed?.segments && Array.isArray(parsed.segments)) {
    for (const s of parsed.segments) {
      segments.push({
        start: s.start ?? 0,
        end: s.end ?? 0,
        text: (s.text || '').trim(),
      })
    }
    text = (parsed.text || segments.map((x) => x.text).join(' ')).trim()
  } else if (parsed?.transcription && Array.isArray(parsed.transcription)) {
    for (const s of parsed.transcription) {
      const t = (s.text ?? s.t ?? '').trim()
      if (t) text += (text ? ' ' : '') + t
    }
  } else if (typeof parsed?.text === 'string') {
    text = parsed.text.trim()
  }

  if (!text && segments.length) {
    text = segments.map((s) => s.text).filter(Boolean).join(' ')
  }

  const txtPath = pick('.txt')
  const vttPath = pick('.vtt')
  let txtContent = null
  let vttContent = null
  if (txtPath) {
    try {
      txtContent = await fs.readFile(txtPath, 'utf8')
    } catch {
      /* ignore */
    }
  }
  if (vttPath) {
    try {
      vttContent = await fs.readFile(vttPath, 'utf8')
    } catch {
      /* ignore */
    }
  }

  if (!text && txtContent) text = txtContent.trim()

  return {
    text,
    segments,
    txtContent,
    vttContent,
  }
}
