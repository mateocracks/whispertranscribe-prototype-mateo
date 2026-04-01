<template>
  <div class="tx">
    <header class="tx-header">
      <h1 class="tx-title">Transcribe</h1>
      <p class="tx-lead">Drop an audio or video file. Whisper runs on your Mac—nothing leaves your machine.</p>
      <div v-if="apiStatus === 'down'" class="tx-banner tx-banner--warn" role="status">
        Local API is not running. In the project folder, run
        <code class="tx-code">npm run dev:all</code>
        (or <code class="tx-code">npm run server</code> in a second terminal).
      </div>
      <div v-else-if="apiStatus === 'ok'" class="tx-meta">
        API ready
        <span v-if="healthProfile" class="tx-meta-detail">· {{ healthProfile }} · {{ healthCommand }}</span>
      </div>
    </header>

    <section class="tx-panel" aria-label="Upload">
      <div
        class="tx-drop"
        :class="{ 'tx-drop--active': dragOver }"
        @dragenter.prevent="dragOver = true"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="onDragLeave"
        @drop.prevent="onDrop"
      >
        <input
          ref="fileRef"
          type="file"
          class="tx-file-input"
          accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.webm,.mov,.ogg,.flac,.mkv"
          @change="onFileChange"
        />
        <p class="tx-drop-text">
          <button type="button" class="tx-link" @click="fileRef?.click()">Choose a file</button>
          or drag it here
        </p>
        <p v-if="file" class="tx-filename">{{ file.name }}</p>
      </div>

      <details class="tx-details">
        <summary>Options</summary>
        <div class="tx-options">
          <label class="tx-label">
            Model
            <select v-model="model" class="tx-select">
              <option value="tiny">tiny (fastest)</option>
              <option value="base">base</option>
              <option value="small">small</option>
              <option value="medium">medium</option>
              <option value="large">large</option>
            </select>
          </label>
          <label class="tx-label">
            Language (optional)
            <input
              v-model="language"
              class="tx-input"
              placeholder="e.g. en — leave empty to auto-detect"
              autocomplete="off"
            />
          </label>
        </div>
      </details>

      <div class="tx-actions">
        <button
          type="button"
          class="tx-btn tx-btn--primary"
          :disabled="!file || busy || apiStatus !== 'ok'"
          @click="startTranscribe"
        >
          {{ busy ? 'Working…' : 'Transcribe' }}
        </button>
      </div>
    </section>

    <section
      v-if="busy || phase === 'done' || phase === 'error'"
      class="tx-panel tx-panel--progress"
      aria-label="Progress"
    >
      <template v-if="phase === 'error'">
        <h2 class="tx-h2">Couldn’t transcribe</h2>
        <p class="tx-error" role="alert">{{ errorMessage }}</p>
      </template>
      <template v-else>
        <h2 class="tx-h2">{{ phase === 'done' ? 'Ready' : 'Transcribing' }}</h2>
        <div class="tx-progress-wrap">
          <div class="tx-progress-track">
            <div
              class="tx-progress-fill"
              :class="{
                'tx-progress-fill--done': phase === 'done',
                'tx-progress-fill--work': phase !== 'done',
              }"
              :style="{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }"
            />
          </div>
          <div class="tx-progress-meta">
            <span class="tx-progress-pct">{{ Math.round(Math.min(100, Math.max(0, progressPercent))) }}%</span>
            <span v-if="phase !== 'done' && statusMessage" class="tx-progress-hint">{{ statusMessage }}</span>
            <span v-else-if="phase === 'done'" class="tx-progress-hint tx-progress-hint--muted">Transcript below</span>
          </div>
        </div>
      </template>
    </section>

    <section v-if="result?.text" class="tx-panel" aria-label="Transcript">
      <div class="tx-result-head">
        <h2 class="tx-h2">Transcript</h2>
        <div class="tx-result-actions">
          <button type="button" class="tx-btn tx-btn--ghost" @click="copyText">Copy</button>
          <button
            v-if="result.txtContent"
            type="button"
            class="tx-btn tx-btn--ghost"
            @click="downloadTxt"
          >
            Download .txt
          </button>
          <button
            v-if="result.vttContent"
            type="button"
            class="tx-btn tx-btn--ghost"
            @click="downloadVtt"
          >
            Download .vtt
          </button>
        </div>
      </div>
      <div v-if="result.segments?.length" class="tx-segments">
        <div v-for="(seg, i) in result.segments" :key="i" class="tx-seg">
          <span class="tx-time">{{ formatTime(seg.start) }} – {{ formatTime(seg.end) }}</span>
          <p class="tx-seg-text">{{ seg.text }}</p>
        </div>
      </div>
      <p v-else class="tx-plain">{{ result.text }}</p>
    </section>

    <footer class="tx-footer">
      <router-link to="/p/start" class="tx-footer-link">Open client prototype (demo UI)</router-link>
    </footer>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

const fileRef = ref(null)
const file = ref(null)
const dragOver = ref(false)
const model = ref('base')
const language = ref('')
const busy = ref(false)
const jobId = ref('')
const phase = ref('')
const progressPercent = ref(0)
const statusMessage = ref('')
const errorMessage = ref('')
const result = ref(null)

const apiStatus = ref('checking')
const healthProfile = ref('')
const healthCommand = ref('')

let pollTimer = null

onMounted(async () => {
  try {
    const r = await fetch('/api/health')
    if (!r.ok) throw new Error('bad status')
    const data = await r.json()
    apiStatus.value = 'ok'
    healthProfile.value = data.profile || ''
    healthCommand.value = data.command || ''
  } catch {
    apiStatus.value = 'down'
  }
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

function onDragLeave(e) {
  const rel = e.relatedTarget
  if (rel && e.currentTarget.contains(rel)) return
  dragOver.value = false
}

function onDrop(e) {
  dragOver.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) file.value = f
}

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) file.value = f
}

async function startTranscribe() {
  if (!file.value || busy.value) return
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  result.value = null
  progressPercent.value = 0
  statusMessage.value = 'Queued…'
  errorMessage.value = ''
  phase.value = 'queued'
  busy.value = true

  const fd = new FormData()
  fd.append('file', file.value)
  fd.append('model', model.value)
  if (language.value.trim()) fd.append('language', language.value.trim())

  let id
  try {
    const r = await fetch('/api/transcribe', { method: 'POST', body: fd })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      throw new Error(data.error || `Upload failed (${r.status})`)
    }
    id = data.jobId
    if (!id) throw new Error('No job id returned')
    jobId.value = id
  } catch (e) {
    phase.value = 'error'
    errorMessage.value = e.message || 'Something went wrong.'
    progressPercent.value = 0
    statusMessage.value = ''
    busy.value = false
    return
  }

  const pollOnce = async () => {
    try {
      const r = await fetch(`/api/jobs/${id}`)
      const data = await r.json()
      if (!r.ok) return
      if (typeof data.progress === 'number') progressPercent.value = data.progress
      if (data.statusMessage) statusMessage.value = data.statusMessage
      if (data.status === 'queued') phase.value = 'queued'
      if (data.status === 'running') phase.value = 'running'
      if (data.status === 'done') {
        if (pollTimer) clearInterval(pollTimer)
        pollTimer = null
        phase.value = 'done'
        progressPercent.value = 100
        result.value = data.result || null
        busy.value = false
      }
      if (data.status === 'error') {
        if (pollTimer) clearInterval(pollTimer)
        pollTimer = null
        phase.value = 'error'
        errorMessage.value = data.error || 'Whisper failed.'
        progressPercent.value = 0
        statusMessage.value = ''
        busy.value = false
      }
    } catch {
      /* keep polling */
    }
  }

  if (pollTimer) clearInterval(pollTimer)
  void pollOnce()
  pollTimer = setInterval(pollOnce, 700)
}

function formatTime(s) {
  const n = Number(s)
  if (Number.isNaN(n)) return '0:00'
  const m = Math.floor(n / 60)
  const sec = Math.floor(n % 60)
  const ms = Math.floor((n % 1) * 10)
  return ms ? `${m}:${String(sec).padStart(2, '0')}.${ms}` : `${m}:${String(sec).padStart(2, '0')}`
}

async function copyText() {
  if (!result.value?.text) return
  try {
    await navigator.clipboard.writeText(result.value.text)
  } catch {
    /* ignore */
  }
}

function downloadTxt() {
  if (!result.value?.txtContent) return
  const blob = new Blob([result.value.txtContent], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'transcript.txt'
  a.click()
  URL.revokeObjectURL(a.href)
}

function downloadVtt() {
  if (!result.value?.vttContent) return
  const blob = new Blob([result.value.vttContent], { type: 'text/vtt;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'transcript.vtt'
  a.click()
  URL.revokeObjectURL(a.href)
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Instrument+Serif:ital@0;1&display=swap');

.tx {
  max-width: 40rem;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4rem;
  font-family: 'DM Sans', system-ui, sans-serif;
}

.tx-header {
  margin-bottom: 2rem;
}

.tx-title {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: clamp(2rem, 5vw, 2.75rem);
  font-weight: 400;
  letter-spacing: -0.02em;
  margin: 0 0 0.5rem;
  color: #1e1f24;
}

.tx-lead {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.55;
  color: #4a4c55;
  max-width: 36rem;
}

.tx-banner {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.tx-banner--warn {
  background: #ebe8e4;
  border: 1px solid #d5d1ca;
  color: #3d3a36;
}

.tx-code {
  font-size: 0.85em;
  padding: 0.1em 0.35em;
  background: #e0ddd8;
  border-radius: 4px;
}

.tx-meta {
  margin-top: 0.75rem;
  font-size: 0.8rem;
  color: #6b6e78;
}

.tx-meta-detail {
  opacity: 0.9;
}

.tx-panel {
  background: #faf9f7;
  border: 1px solid #e2dfda;
  border-radius: 12px;
  padding: 1.25rem 1.35rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 1px 0 rgba(42, 43, 47, 0.04);
}

.tx-drop {
  min-height: 7rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed #c9c5bf;
  border-radius: 10px;
  background: #f4f3f1;
  transition: border-color 0.2s, background 0.2s;
}

.tx-drop--active {
  border-color: #3d4047;
  background: #eceae7;
}

.tx-file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.tx-drop-text {
  margin: 0;
  font-size: 0.95rem;
  color: #4a4c55;
}

.tx-link {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  color: #3d4047;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.tx-filename {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: #6b6e78;
}

.tx-details {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #4a4c55;
}

.tx-details summary {
  cursor: pointer;
  font-weight: 500;
  color: #3d4047;
}

.tx-options {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tx-label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 500;
  color: #4a4c55;
}

.tx-select,
.tx-input {
  font: inherit;
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  border: 1px solid #d5d1ca;
  background: #fff;
  color: #2a2b2f;
}

.tx-actions {
  margin-top: 1.25rem;
}

.tx-btn {
  font: inherit;
  font-weight: 600;
  font-size: 0.9rem;
  padding: 0.55rem 1.25rem;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.tx-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tx-btn--primary {
  background: #3d4047;
  color: #f4f3f1;
}

.tx-btn--primary:hover:not(:disabled) {
  background: #2f3238;
}

.tx-btn--ghost {
  background: transparent;
  border-color: #d5d1ca;
  color: #3d4047;
  margin-right: 0.5rem;
  margin-bottom: 0.35rem;
}

.tx-btn--ghost:hover:not(:disabled) {
  background: #eceae7;
}

.tx-h2 {
  font-family: 'Instrument Serif', Georgia, serif;
  font-size: 1.35rem;
  font-weight: 400;
  margin: 0 0 1rem;
  color: #1e1f24;
}

.tx-panel--progress .tx-h2 {
  margin-bottom: 0.85rem;
}

.tx-error {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.55;
  color: #7c1f2b;
  background: #f8edee;
  border: 1px solid #e8c9cd;
  border-radius: 10px;
  padding: 0.85rem 1rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 16rem;
  overflow-y: auto;
}

.tx-progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.tx-progress-track {
  height: 10px;
  border-radius: 999px;
  background: #e5e2dd;
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(42, 43, 47, 0.06);
}

.tx-progress-fill {
  height: 100%;
  border-radius: 999px;
  width: 0%;
  transition: width 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

.tx-progress-fill--work {
  background: linear-gradient(105deg, #2c2f35 0%, #3d4047 35%, #52565e 50%, #3d4047 65%, #2c2f35 100%);
  background-size: 220% 100%;
  animation: tx-bar-shine 2.4s ease-in-out infinite;
}

.tx-progress-fill--done {
  background: linear-gradient(90deg, #2d6a4f, #52b788);
  animation: none;
}

@keyframes tx-bar-shine {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.tx-progress-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
}

.tx-progress-pct {
  font-size: 1.65rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #1e1f24;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.tx-progress-hint {
  font-size: 0.88rem;
  color: #5c5f68;
  flex: 1;
  min-width: 8rem;
}

.tx-progress-hint--muted {
  color: #6b6e78;
}

.tx-result-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.tx-result-head .tx-h2 {
  margin: 0;
}

.tx-segments {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tx-seg {
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #ebe8e4;
}

.tx-seg:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.tx-time {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #8a8d96;
}

.tx-seg-text {
  margin: 0.35rem 0 0;
  font-size: 0.95rem;
  line-height: 1.55;
  color: #2a2b2f;
}

.tx-plain {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #2a2b2f;
}

.tx-footer {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e2dfda;
}

.tx-footer-link {
  font-size: 0.85rem;
  color: #6b6e78;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.tx-footer-link:hover {
  color: #3d4047;
}
</style>
