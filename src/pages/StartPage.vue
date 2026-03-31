<template>
  <q-page class="q-pa-lg" style="max-width: 1000px; margin: 0 auto">
    <div class="text-h4 q-mb-lg" style="font-weight: 400">New Transcription</div>

    <!-- Source tabs -->
    <div class="row q-col-gutter-sm q-mb-md">
      <div v-for="tab in sourceTabs" :key="tab.id" class="col-3">
        <div
          class="option-box q-pa-md text-center border-radius-8"
          :class="{ 'option-box-active': activeTab === tab.id }"
          style="border: 1px solid #e0e0e0; min-height: 88px"
          role="button"
          tabindex="0"
          @click="activeTab = tab.id"
          @keydown.enter.prevent="activeTab = tab.id"
          @keydown.space.prevent="activeTab = tab.id"
        >
          <q-icon :name="tab.icon" size="28px" class="option-icon q-mb-xs" />
          <div class="text-caption text-weight-medium">{{ tab.label }}</div>
        </div>
      </div>
    </div>

    <!-- Tab content -->
    <div
      class="q-pa-md bg-white"
      style="border: 1px solid #e0e0e0; border-bottom: none; border-radius: 0.5rem 0.5rem 0 0; min-height: 240px"
    >
      <!-- Upload file -->
      <div v-if="activeTab === 'upload'" class="column items-center q-py-lg">
        <input
          ref="fileInputRef"
          type="file"
          class="file-input-hidden"
          multiple
          :accept="fileAccept"
          @change="onFileInputChange"
        />
        <div
          class="upload-drop-zone column flex-center q-pa-xl full-width"
          :class="{ 'upload-drop-zone--active': isDragOver }"
          @dragenter.prevent="isDragOver = true"
          @dragover.prevent="isDragOver = true"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
        >
          <div class="text-body2 text-grey-7 q-mb-md">Drag &amp; drop a file here, or</div>
          <q-btn
            outline
            color="primary"
            icon="sym_o_attach_file"
            label="Select a file"
            class="q-mb-sm default-input"
            no-caps
            @click="fileInputRef?.click()"
          />
          <div class="text-caption text-grey-7 q-mb-md">Select up to 10 files at once</div>
          <div class="text-caption text-grey-7 q-mb-xs">Supported file formats:</div>
          <div class="text-caption text-grey-7 text-center" style="max-width: 640px; line-height: 1.5">
            {{ supportedFormatsLine }}
          </div>
        </div>
      </div>

      <!-- Record audio -->
      <div v-else-if="activeTab === 'record'" class="flex flex-center text-body2 text-grey-7" style="min-height: 200px">
        Record audio coming soon...
      </div>

      <!-- From the web -->
      <div v-else-if="activeTab === 'web'" class="q-py-md">
        <div class="text-body1 text-weight-medium q-mb-xs">Add from the web</div>
        <div class="text-body2 text-grey-7 q-mb-md">
          Add videos from YouTube, Vimeo, or any other website, including direct links to files.
        </div>
        <q-input
          v-model="webUrl"
          outlined
          dense
          class="default-input"
          placeholder="E.g., https://www.youtube.com/watch?v=xxxxxxxx, https://www.example.com/video.mp4"
        />
      </div>

      <!-- Podcast library -->
      <div v-else-if="activeTab === 'podcast'" class="flex flex-center text-body2 text-grey-7" style="min-height: 200px">
        Podcast library coming soon...
      </div>
    </div>

    <!-- Settings -->
    <div
      class="q-pa-md bg-white cursor-pointer"
      style="border: 1px solid #e0e0e0; border-radius: 0 0 0.5rem 0.5rem"
      role="button"
      tabindex="0"
      @click="showSettings = !showSettings"
      @keydown.enter.prevent="showSettings = !showSettings"
      @keydown.space.prevent="showSettings = !showSettings"
    >
      <div class="row items-center no-wrap">
        <q-icon
          :name="showSettings ? 'sym_o_expand_less' : 'sym_o_expand_more'"
          color="primary"
          size="20px"
          class="q-mr-sm"
        />
        <span class="text-primary text-body2 text-weight-medium">Settings</span>
      </div>
      <q-slide-transition>
        <div v-show="showSettings" class="q-pt-md text-caption text-grey-7">
          Transcription settings will appear here.
        </div>
      </q-slide-transition>
    </div>

    <!-- Transcribe now -->
    <div class="row justify-end q-mt-lg">
      <q-btn
        unelevated
        no-caps
        :disable="!canTranscribe"
        :class="['text-white', 'transcribe-cta', { 'bg-gradient-animate': true, disabled: !canTranscribe }]"
        style="border-radius: 20px; padding: 8px 24px; font-size: 14px; min-width: 160px"
        label="Transcribe Now"
        @click="onTranscribe"
      />
    </div>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'

const activeTab = ref('upload')
const webUrl = ref('')
const showSettings = ref(false)
const fileInputRef = ref(null)
const selectedFiles = ref([])
const isDragOver = ref(false)

const sourceTabs = [
  { id: 'upload', label: 'Upload File', icon: 'sym_o_upload' },
  { id: 'record', label: 'Record Audio', icon: 'sym_o_adaptive_audio_mic' },
  { id: 'web', label: 'From the Web', icon: 'sym_o_language' },
  { id: 'podcast', label: 'From Podcast Library', icon: 'sym_o_podcasts' },
]

const supportedFormatsLine =
  '.3gp, .aac, .amc, .asf, .avi, .flac, .m4a, .m4b, .mkv, .mka, .mov, .mp3, .mp4, .mpeg, .mpga, .oga, .ogg, .opus, .wav, .webm, .wma, and .wmv'

const fileAccept =
  '.3gp,.aac,.amc,.asf,.avi,.flac,.m4a,.m4b,.mkv,.mka,.mov,.mp3,.mp4,.mpeg,.mpga,.oga,.ogg,.opus,.wav,.webm,.wma,.wmv'

const canTranscribe = computed(() => selectedFiles.value.length > 0)

function setFiles(fileList) {
  const files = Array.from(fileList || []).slice(0, 10)
  selectedFiles.value = files
}

function onFileInputChange(e) {
  setFiles(e.target.files)
  e.target.value = ''
}

function onDragLeave(e) {
  const related = e.relatedTarget
  if (related && e.currentTarget.contains(related)) return
  isDragOver.value = false
}

function onDrop(e) {
  isDragOver.value = false
  const dt = e.dataTransfer
  if (!dt?.files?.length) return
  setFiles(dt.files)
}

function onTranscribe() {
  if (!canTranscribe.value) return
}
</script>

<style scoped>
.file-input-hidden {
  display: none;
}
.upload-drop-zone {
  border: 1px dashed #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}
.upload-drop-zone--active {
  border-color: #3d4047;
  background: #f7f7f8;
}
.transcribe-cta.q-btn--disabled {
  opacity: 1 !important;
}
</style>
