<template>
  <div class="tx">
    <header class="tx-header">
      <h1 class="tx-title">Transcribe</h1>
      <p v-if="apiMode === 'cloud'" class="tx-lead">
        Drop an audio or video file. This hosted version sends it to
        <strong>OpenAI</strong> for transcription (your project must have an API key in Vercel). The same key powers the optional AI tabs: clean text, social post, and a Substack-style blog draft.
      </p>
      <p v-else class="tx-lead">
        Drop an audio or video file. Whisper runs on your Mac. Optional AI views (clean text, social post, Substack-style blog) need an API key—see
        <code class="tx-code">server/README.md</code>.
      </p>
      <div v-if="apiStatus === 'down'" class="tx-banner tx-banner--warn" role="status">
        <template v-if="apiMode === 'cloud' || (apiMode === 'unknown' && isProd)">
          Can’t reach the app’s API. If you deployed this yourself, open the Vercel dashboard: confirm the deployment succeeded and
          <code class="tx-code">OPENAI_API_KEY</code> is set under Environment Variables.
        </template>
        <template v-else>
          Local API is not running. In the project folder, run
          <code class="tx-code">npm run dev:all</code>
          (or <code class="tx-code">npm run server</code> in a second terminal).
        </template>
      </div>
      <div v-else-if="apiStatus === 'ok'" class="tx-meta">
        <template v-if="apiMode === 'cloud'">
          Hosted · OpenAI transcription
          <span v-if="hasOpenAi" class="tx-meta-detail">· AI tabs on</span>
          <span v-else class="tx-meta-detail">· AI tabs off (add API key in Vercel)</span>
        </template>
        <template v-else>
          API ready
          <span v-if="healthProfile" class="tx-meta-detail">· {{ healthProfile }} · {{ healthCommand }}</span>
          <span v-if="hasOpenAi" class="tx-meta-detail">· AI polish on</span>
          <span v-else class="tx-meta-detail">· AI polish off (no key)</span>
        </template>
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
        <p v-if="apiMode === 'cloud' && file && cloudUploadHint" class="tx-upload-hint" role="status">
          {{ cloudUploadHint }}
        </p>
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
          <p v-if="apiMode === 'cloud'" class="tx-options-note">
            The <strong>Model</strong> menu only affects the app when you run the API on your own computer. Here, transcription always uses OpenAI’s hosted Whisper model.
          </p>
          <p v-else class="tx-options-note">
            For AI tabs (clean transcript, social media, blog post), set
            <code class="tx-code">OPENAI_API_KEY</code> before starting the server (see
            <code class="tx-code">server/README.md</code>).
          </p>
          <p v-if="apiMode === 'cloud'" class="tx-options-note">
            On Vercel, add <code class="tx-code">OPENAI_API_KEY</code> in Project → Settings → Environment Variables, then redeploy.
          </p>
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
          <button
            type="button"
            class="tx-btn tx-btn--ghost"
            :disabled="!activeViewText()"
            @click="copyActiveView"
          >
            Copy
          </button>
          <button
            v-if="viewMode === 'timed' && result.txtContent"
            type="button"
            class="tx-btn tx-btn--ghost"
            @click="downloadTxt"
          >
            Download .txt
          </button>
          <button
            v-if="viewMode === 'clean' && cleanOutput"
            type="button"
            class="tx-btn tx-btn--ghost"
            @click="downloadCleanTxt"
          >
            Download cleaned .txt
          </button>
          <button
            v-if="viewMode === 'blog' && blogOutput"
            type="button"
            class="tx-btn tx-btn--ghost"
            @click="downloadBlogTxt"
          >
            Download blog .txt
          </button>
          <button
            v-if="viewMode === 'timed' && result.vttContent"
            type="button"
            class="tx-btn tx-btn--ghost"
            @click="downloadVtt"
          >
            Download .vtt
          </button>
        </div>
      </div>

      <div class="tx-view-tabs" role="tablist" aria-label="Transcript view">
        <button
          type="button"
          role="tab"
          class="tx-tab"
          :class="{ 'tx-tab--active': viewMode === 'timed' }"
          :aria-selected="viewMode === 'timed'"
          title="With timestamps"
          @click="viewMode = 'timed'"
        >
          Timestamps
        </button>
        <button
          type="button"
          role="tab"
          class="tx-tab"
          :class="{ 'tx-tab--active': viewMode === 'clean' }"
          :aria-selected="viewMode === 'clean'"
          title="Clean transcript"
          @click="openCleanTab"
        >
          Clean
        </button>
        <button
          type="button"
          role="tab"
          class="tx-tab"
          :class="{ 'tx-tab--active': viewMode === 'social' }"
          :aria-selected="viewMode === 'social'"
          title="Social media description"
          @click="openSocialTab"
        >
          Social
        </button>
        <button
          type="button"
          role="tab"
          class="tx-tab"
          :class="{ 'tx-tab--active': viewMode === 'blog' }"
          :aria-selected="viewMode === 'blog'"
          title="Blog post for Substack"
          @click="openBlogTab"
        >
          Blog
        </button>
      </div>

      <div v-show="viewMode === 'timed'" class="tx-view-pane" role="tabpanel">
        <div v-if="result.segments?.length" class="tx-segments">
          <div v-for="(seg, i) in result.segments" :key="i" class="tx-seg">
            <span class="tx-time">{{ formatTime(seg.start) }} – {{ formatTime(seg.end) }}</span>
            <p class="tx-seg-text">{{ seg.text }}</p>
          </div>
        </div>
        <p v-else class="tx-plain">{{ result.text }}</p>
      </div>

      <div v-show="viewMode === 'clean'" class="tx-view-pane" role="tabpanel">
        <p v-if="!hasOpenAi" class="tx-ai-hint">
          <template v-if="apiMode === 'cloud'">
            Add <code class="tx-code">OPENAI_API_KEY</code> in Vercel → Project → Settings → Environment Variables, redeploy, then open this tab again.
          </template>
          <template v-else>
            Set <code class="tx-code">OPENAI_API_KEY</code> in your environment, restart
            <code class="tx-code">npm run dev:all</code>, then open this tab again. See
            <code class="tx-code">server/README.md</code>.
          </template>
        </p>
        <template v-else>
          <p v-if="aiTruncated.clean" class="tx-ai-trunc">Only the first part of very long transcripts is sent to the AI.</p>
          <div v-if="aiLoading === 'clean'" class="tx-ai-progress-block">
            <div class="tx-progress-track tx-progress-track--ai">
              <div
                class="tx-progress-fill tx-progress-fill--work"
                :class="{ 'tx-progress-fill--ai-done': aiProgressPercent >= 100 }"
                :style="{ width: `${Math.min(100, Math.max(0, aiProgressPercent))}%` }"
              />
            </div>
            <div class="tx-ai-progress-meta">
              <span class="tx-progress-pct tx-progress-pct--ai">{{ Math.round(Math.min(100, Math.max(0, aiProgressPercent))) }}%</span>
              <span class="tx-progress-hint">Cleaning transcript…</span>
            </div>
          </div>
          <p v-else-if="cleanError" class="tx-ai-err" role="alert">{{ cleanError }}</p>
          <div v-else-if="cleanOutput" class="tx-ai-readout">{{ cleanOutput }}</div>
          <div v-else class="tx-ai-placeholder">Loading…</div>
          <button
            v-if="cleanOutput && aiLoading !== 'clean'"
            type="button"
            class="tx-btn tx-btn--ghost tx-regen"
            @click="regenerate('clean')"
          >
            Regenerate
          </button>
        </template>
      </div>

      <div v-show="viewMode === 'social'" class="tx-view-pane" role="tabpanel">
        <p v-if="!hasOpenAi" class="tx-ai-hint">
          <template v-if="apiMode === 'cloud'">
            Add <code class="tx-code">OPENAI_API_KEY</code> in Vercel, redeploy, then try again.
          </template>
          <template v-else>
            Set <code class="tx-code">OPENAI_API_KEY</code> in your environment, restart the server, then try again.
          </template>
        </p>
        <template v-else>
          <p v-if="aiTruncated.social" class="tx-ai-trunc">Only the first part of very long transcripts is sent to the AI.</p>
          <div v-if="aiLoading === 'social'" class="tx-ai-progress-block">
            <div class="tx-progress-track tx-progress-track--ai">
              <div
                class="tx-progress-fill tx-progress-fill--work"
                :class="{ 'tx-progress-fill--ai-done': aiProgressPercent >= 100 }"
                :style="{ width: `${Math.min(100, Math.max(0, aiProgressPercent))}%` }"
              />
            </div>
            <div class="tx-ai-progress-meta">
              <span class="tx-progress-pct tx-progress-pct--ai">{{ Math.round(Math.min(100, Math.max(0, aiProgressPercent))) }}%</span>
              <span class="tx-progress-hint">Writing social media description…</span>
            </div>
          </div>
          <p v-else-if="socialError" class="tx-ai-err" role="alert">{{ socialError }}</p>
          <div v-else-if="socialOutput" class="tx-ai-readout tx-ai-readout--social">{{ socialOutput }}</div>
          <div v-else class="tx-ai-placeholder">Loading…</div>
          <button
            v-if="socialOutput && aiLoading !== 'social'"
            type="button"
            class="tx-btn tx-btn--ghost tx-regen"
            @click="regenerate('social')"
          >
            Regenerate
          </button>
        </template>
      </div>

      <div v-show="viewMode === 'blog'" class="tx-view-pane" role="tabpanel">
        <p v-if="!hasOpenAi" class="tx-ai-hint">
          <template v-if="apiMode === 'cloud'">
            Add <code class="tx-code">OPENAI_API_KEY</code> in Vercel, redeploy, then try again.
          </template>
          <template v-else>
            Set <code class="tx-code">OPENAI_API_KEY</code> in your environment, restart the server, then try again.
          </template>
        </p>
        <template v-else>
          <p class="tx-blog-hint">Plain text draft—paste into a new Substack post (title + body).</p>
          <p v-if="aiTruncated.blog" class="tx-ai-trunc">Only the first part of very long transcripts is sent to the AI.</p>
          <div v-if="aiLoading === 'blog'" class="tx-ai-progress-block">
            <div class="tx-progress-track tx-progress-track--ai">
              <div
                class="tx-progress-fill tx-progress-fill--work"
                :class="{ 'tx-progress-fill--ai-done': aiProgressPercent >= 100 }"
                :style="{ width: `${Math.min(100, Math.max(0, aiProgressPercent))}%` }"
              />
            </div>
            <div class="tx-ai-progress-meta">
              <span class="tx-progress-pct tx-progress-pct--ai">{{ Math.round(Math.min(100, Math.max(0, aiProgressPercent))) }}%</span>
              <span class="tx-progress-hint">Writing blog post…</span>
            </div>
          </div>
          <p v-else-if="blogError" class="tx-ai-err" role="alert">{{ blogError }}</p>
          <div v-else-if="blogOutput" class="tx-ai-readout tx-ai-readout--blog">{{ blogOutput }}</div>
          <div v-else class="tx-ai-placeholder">Loading…</div>
          <button
            v-if="blogOutput && aiLoading !== 'blog'"
            type="button"
            class="tx-btn tx-btn--ghost tx-regen"
            @click="regenerate('blog')"
          >
            Regenerate
          </button>
        </template>
      </div>
    </section>

    <footer class="tx-footer">
      <router-link to="/p/start" class="tx-footer-link">Open client prototype (demo UI)</router-link>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

/** ~4.5 MB is a common limit on free serverless hosts; larger files may still work on paid plans. */
const CLOUD_SOFT_LIMIT_BYTES = Math.floor(4.5 * 1024 * 1024)
const OPENAI_AUDIO_MAX_BYTES = 25 * 1024 * 1024
const CLOUD_TARGET_BYTES = Math.floor(10 * 1024 * 1024)
const isProd = import.meta.env.PROD

const viewMode = ref('timed')
const cleanOutput = ref('')
const socialOutput = ref('')
const blogOutput = ref('')
const cleanError = ref('')
const socialError = ref('')
const blogError = ref('')
const aiLoading = ref(null)
const aiTruncated = ref({ clean: false, social: false, blog: false })
const hasOpenAi = ref(false)
/** 0–100 while AI clean/social is running (smooth ramp + finish at 100). */
const aiProgressPercent = ref(0)

let aiProgressTimer = null

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
/** 'unknown' until health loads; then 'local' (your Mac) or 'cloud' (Vercel + OpenAI). */
const apiMode = ref('unknown')
const healthProfile = ref('')
const healthCommand = ref('')

let pollTimer = null

const cloudUploadHint = computed(() => {
  if (apiMode.value !== 'cloud' || !file.value) return ''
  if (file.value.size > OPENAI_AUDIO_MAX_BYTES) {
    return 'Large file detected. When you click Transcribe, the app will first convert it to smaller speech audio.'
  }
  if (file.value.size > CLOUD_SOFT_LIMIT_BYTES) {
    return 'This file may be too large for free Vercel upload limits. The app will try to compress it before upload.'
  }
  return ''
})

onMounted(async () => {
  try {
    const r = await fetch('/api/health')
    if (!r.ok) throw new Error('bad status')
    const data = await r.json()
    apiStatus.value = 'ok'
    apiMode.value = data.mode === 'cloud' ? 'cloud' : 'local'
    healthProfile.value = data.profile || ''
    healthCommand.value = data.command || ''
    hasOpenAi.value = Boolean(data.openAiConfigured)
  } catch {
    apiStatus.value = 'down'
    apiMode.value = 'unknown'
  }
})

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  stopAiProgress()
})

function stopAiProgress() {
  if (aiProgressTimer != null) {
    clearInterval(aiProgressTimer)
    aiProgressTimer = null
  }
}

function startAiProgress() {
  stopAiProgress()
  aiProgressPercent.value = 3
  aiProgressTimer = setInterval(() => {
    const p = aiProgressPercent.value
    if (p < 88) {
      const gap = 88 - p
      aiProgressPercent.value = Math.min(88, p + Math.max(0.45, gap * 0.042))
    }
  }, 150)
}

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
  if (apiMode.value === 'cloud' && file.value.size > OPENAI_AUDIO_MAX_BYTES * 4) {
    phase.value = 'error'
    errorMessage.value =
      'That file is extremely large. Please trim it or export audio only before uploading.'
    progressPercent.value = 0
    statusMessage.value = ''
    return
  }
  if (apiMode.value === 'cloud') {
    await startTranscribeCloud()
    return
  }
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  result.value = null
  resetAiViews()
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
        resetAiViews()
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

/** Hosted (Vercel): one POST returns the full transcript; no job polling. */
async function startTranscribeCloud() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  result.value = null
  resetAiViews()
  progressPercent.value = 10
  statusMessage.value = 'Uploading and transcribing…'
  errorMessage.value = ''
  phase.value = 'running'
  busy.value = true

  const bump = setInterval(() => {
    if (progressPercent.value < 88) {
      progressPercent.value = Math.min(88, progressPercent.value + 3)
    }
  }, 500)

  let uploadFile = file.value
  if (shouldOptimizeForCloud(file.value)) {
    statusMessage.value = 'Optimizing audio for transcription…'
    progressPercent.value = 14
    uploadFile = await optimizeForCloudUpload(file.value)
    statusMessage.value = `Uploading optimized audio (${formatMb(uploadFile.size)} MB)…`
    progressPercent.value = 22
  }
  if (uploadFile.size > OPENAI_AUDIO_MAX_BYTES) {
    throw new Error(
      'This file is still over 25 MB after optimization. Please trim it into shorter parts.'
    )
  }

  const fd = new FormData()
  fd.append('file', uploadFile)
  fd.append('model', model.value)
  if (language.value.trim()) fd.append('language', language.value.trim())

  try {
    const r = await fetch('/api/transcribe', { method: 'POST', body: fd })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) {
      throw new Error(data.error || `Transcription failed (${r.status})`)
    }
    const next = data.result
    if (!next || (!String(next.text || '').trim() && !(next.segments && next.segments.length))) {
      throw new Error('No transcript came back from the server.')
    }
    result.value = next
    resetAiViews()
    phase.value = 'done'
    progressPercent.value = 100
    statusMessage.value = ''
  } catch (e) {
    phase.value = 'error'
    errorMessage.value = e.message || 'Something went wrong.'
    progressPercent.value = 0
    statusMessage.value = ''
  } finally {
    clearInterval(bump)
    busy.value = false
  }
}

function shouldOptimizeForCloud(f) {
  if (!f) return false
  if (f.size > OPENAI_AUDIO_MAX_BYTES) return true
  if (f.size > CLOUD_SOFT_LIMIT_BYTES) return true
  return String(f.type || '').startsWith('video/')
}

function formatMb(bytes) {
  return (Math.max(0, Number(bytes) || 0) / (1024 * 1024)).toFixed(1)
}

function getPreferredAudioMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  return candidates.find((m) => MediaRecorder.isTypeSupported?.(m)) || ''
}

function buildOptimizedName(originalName, mimeType) {
  const stem = String(originalName || 'audio')
    .replace(/\.[^/.]+$/, '')
    .replace(/[^\w.-]+/g, '_')
  if (mimeType.includes('mp4')) return `${stem}-speech.m4a`
  if (mimeType.includes('ogg')) return `${stem}-speech.ogg`
  return `${stem}-speech.webm`
}

async function optimizeForCloudUpload(inputFile) {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof AudioContext === 'undefined' ||
    typeof MediaRecorder === 'undefined'
  ) {
    throw new Error(
      'This browser cannot optimize large media files automatically. Please export audio only (mp3/m4a) and try again.'
    )
  }

  const preferredMime = getPreferredAudioMime()
  if (!preferredMime) {
    throw new Error(
      'This browser does not support in-browser audio compression. Please export audio only (mp3/m4a) and try again.'
    )
  }

  const objectUrl = URL.createObjectURL(inputFile)
  const media = document.createElement('audio')
  media.preload = 'auto'
  media.src = objectUrl
  media.crossOrigin = 'anonymous'
  media.muted = true
  media.playsInline = true

  const ctx = new AudioContext()
  const source = ctx.createMediaElementSource(media)
  const destination = ctx.createMediaStreamDestination()
  source.connect(destination)
  source.connect(ctx.destination)
  ctx.destination.channelInterpretation = 'speakers'

  const recorder = new MediaRecorder(destination.stream, {
    mimeType: preferredMime,
    audioBitsPerSecond: 64000,
  })

  /** @type {BlobPart[]} */
  const chunks = []
  recorder.addEventListener('dataavailable', (evt) => {
    if (evt.data && evt.data.size > 0) chunks.push(evt.data)
  })

  try {
    await media.play()
    recorder.start(1000)
    await new Promise((resolve, reject) => {
      const fail = (err) => reject(err || new Error('Could not process media.'))
      media.addEventListener('ended', resolve, { once: true })
      media.addEventListener('error', () => fail(new Error('Could not read that file format.')), {
        once: true,
      })
      recorder.addEventListener('error', () => fail(new Error('Audio compression failed.')), {
        once: true,
      })
    })
    if (recorder.state !== 'inactive') recorder.stop()
    await new Promise((resolve) => recorder.addEventListener('stop', resolve, { once: true }))
  } catch (e) {
    throw new Error(
      e?.message ||
        'Could not optimize this file in the browser. Please export audio only (mp3/m4a) and try again.'
    )
  } finally {
    media.pause()
    media.removeAttribute('src')
    media.load()
    URL.revokeObjectURL(objectUrl)
    await ctx.close().catch(() => {})
  }

  const blob = new Blob(chunks, { type: preferredMime })
  if (!blob.size) {
    throw new Error('Optimization produced an empty audio file. Please try a different export.')
  }

  const optimized = new File([blob], buildOptimizedName(inputFile.name, preferredMime), {
    type: preferredMime,
    lastModified: Date.now(),
  })

  if (optimized.size >= inputFile.size && inputFile.size <= OPENAI_AUDIO_MAX_BYTES) {
    return inputFile
  }
  if (optimized.size > CLOUD_TARGET_BYTES && optimized.size >= inputFile.size) {
    throw new Error('Could not reduce this file enough. Please trim or export lower-quality audio.')
  }
  return optimized
}

function resetAiViews() {
  stopAiProgress()
  aiProgressPercent.value = 0
  viewMode.value = 'timed'
  cleanOutput.value = ''
  socialOutput.value = ''
  blogOutput.value = ''
  cleanError.value = ''
  socialError.value = ''
  blogError.value = ''
  aiLoading.value = null
  aiTruncated.value = { clean: false, social: false, blog: false }
}

async function loadEnhancement(type, force) {
  if (!result.value?.text) return
  if (!hasOpenAi.value) {
    if (type === 'clean') cleanError.value = ''
    if (type === 'social') socialError.value = ''
    if (type === 'blog') blogError.value = ''
    return
  }
  if (!force) {
    if (type === 'clean' && cleanOutput.value) return
    if (type === 'social' && socialOutput.value) return
    if (type === 'blog' && blogOutput.value) return
  }
  if (type === 'clean') cleanError.value = ''
  if (type === 'social') socialError.value = ''
  if (type === 'blog') blogError.value = ''
  aiLoading.value = type
  startAiProgress()
  try {
    const r = await fetch('/api/ai-enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, text: result.value.text }),
    })
    const data = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(data.error || `Request failed (${r.status})`)
    stopAiProgress()
    aiProgressPercent.value = 100
    await new Promise((resolve) => setTimeout(resolve, 400))
    if (type === 'clean') {
      cleanOutput.value = data.text || ''
      aiTruncated.value = { ...aiTruncated.value, clean: Boolean(data.truncated) }
    } else if (type === 'social') {
      socialOutput.value = data.text || ''
      aiTruncated.value = { ...aiTruncated.value, social: Boolean(data.truncated) }
    } else {
      blogOutput.value = data.text || ''
      aiTruncated.value = { ...aiTruncated.value, blog: Boolean(data.truncated) }
    }
  } catch (e) {
    stopAiProgress()
    aiProgressPercent.value = 0
    const msg = e.message || 'Something went wrong.'
    if (type === 'clean') cleanError.value = msg
    else if (type === 'social') socialError.value = msg
    else blogError.value = msg
  } finally {
    aiLoading.value = null
    aiProgressPercent.value = 0
  }
}

function openCleanTab() {
  viewMode.value = 'clean'
  void loadEnhancement('clean', false)
}

function openSocialTab() {
  viewMode.value = 'social'
  void loadEnhancement('social', false)
}

function openBlogTab() {
  viewMode.value = 'blog'
  void loadEnhancement('blog', false)
}

function regenerate(type) {
  if (type === 'clean') {
    cleanOutput.value = ''
    cleanError.value = ''
  } else if (type === 'social') {
    socialOutput.value = ''
    socialError.value = ''
  } else {
    blogOutput.value = ''
    blogError.value = ''
  }
  void loadEnhancement(type, true)
}

function formatTime(s) {
  const n = Number(s)
  if (Number.isNaN(n)) return '0:00'
  const m = Math.floor(n / 60)
  const sec = Math.floor(n % 60)
  const ms = Math.floor((n % 1) * 10)
  return ms ? `${m}:${String(sec).padStart(2, '0')}.${ms}` : `${m}:${String(sec).padStart(2, '0')}`
}

function activeViewText() {
  if (viewMode.value === 'timed') return result.value?.text || ''
  if (viewMode.value === 'clean') return cleanOutput.value
  if (viewMode.value === 'social') return socialOutput.value
  return blogOutput.value
}

async function copyActiveView() {
  const t = activeViewText()
  if (!t) return
  try {
    await navigator.clipboard.writeText(t)
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

function downloadCleanTxt() {
  if (!cleanOutput.value) return
  const blob = new Blob([cleanOutput.value], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'transcript-cleaned.txt'
  a.click()
  URL.revokeObjectURL(a.href)
}

function downloadBlogTxt() {
  if (!blogOutput.value) return
  const blob = new Blob([blogOutput.value], { type: 'text/plain;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'substack-draft.txt'
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

.tx-upload-hint {
  margin: 0.65rem 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: #8a5a2b;
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

.tx-options-note {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: #6b6e78;
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

.tx-view-tabs {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 0.25rem;
  margin: 0 0 1rem;
  padding: 0.25rem;
  background: #eceae7;
  border-radius: 10px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.tx-tab {
  flex: 1 1 0;
  min-width: max-content;
  padding: 0.45rem 0.65rem;
  border: none;
  border-radius: 8px;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  color: #5c5f68;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.tx-tab:hover {
  color: #2a2b2f;
}

.tx-tab--active {
  background: #faf9f7;
  color: #1e1f24;
  box-shadow: 0 1px 2px rgba(42, 43, 47, 0.08);
}

.tx-view-pane {
  min-height: 4rem;
}

.tx-ai-hint {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.55;
  color: #5c5f68;
  padding: 0.75rem 0.85rem;
  background: #f0eeeb;
  border-radius: 10px;
  border: 1px solid #e2dfda;
}

.tx-ai-trunc {
  margin: 0 0 0.65rem;
  font-size: 0.78rem;
  color: #8a6d3b;
}

.tx-ai-progress-block {
  margin: 0.25rem 0 0.75rem;
}

.tx-progress-track--ai {
  height: 9px;
}

.tx-progress-fill--ai-done {
  background: linear-gradient(90deg, #2d6a4f, #52b788) !important;
  animation: none !important;
}

.tx-ai-progress-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.5rem 0.75rem;
  margin-top: 0.55rem;
}

.tx-progress-pct--ai {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #1e1f24;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.tx-ai-err {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.5;
  color: #7c1f2b;
  padding: 0.75rem 0.85rem;
  background: #f8edee;
  border-radius: 10px;
  border: 1px solid #e8c9cd;
}

.tx-ai-readout {
  margin: 0;
  padding: 1rem 1.1rem;
  font-size: 0.95rem;
  line-height: 1.65;
  color: #2a2b2f;
  background: #fff;
  border: 1px solid #e2dfda;
  border-radius: 10px;
  white-space: pre-wrap;
  word-break: break-word;
}

.tx-ai-readout--social {
  line-height: 1.55;
}

.tx-blog-hint {
  margin: 0 0 0.65rem;
  font-size: 0.82rem;
  line-height: 1.45;
  color: #6b6e78;
}

.tx-ai-readout--blog {
  line-height: 1.65;
}

.tx-ai-placeholder {
  font-size: 0.88rem;
  color: #8a8d96;
  padding: 0.5rem 0;
}

.tx-regen {
  margin-top: 0.75rem;
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
