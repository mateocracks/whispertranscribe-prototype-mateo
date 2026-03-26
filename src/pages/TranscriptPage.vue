<template>
  <q-page class="column" style="min-height: 0">
    <!-- Page Header -->
    <div class="q-px-lg q-pt-md">
      <div class="row items-center q-mb-xs">
        <q-icon name="sym_o_arrow_back" size="16px" class="text-primary q-mr-xs cursor-pointer" @click="$router.push('/start')" />
        <span class="text-caption text-primary cursor-pointer" @click="$router.push('/start')">Projects</span>
        <span class="text-caption text-grey-5 q-mx-xs">/</span>
        <span class="text-caption text-primary cursor-pointer">Examples</span>
        <q-space />
        <q-btn flat dense round icon="sym_o_settings" size="sm" color="grey-7" />
      </div>

      <div class="row items-center q-mb-sm">
        <span class="text-h5 text-weight-bold">{{ record.title }}</span>
        <q-btn flat dense round icon="sym_o_edit_square" size="sm" color="grey-7" class="q-ml-sm" />
        <q-btn flat dense round icon="sym_o_more_vert" size="sm" color="grey-7" />
      </div>

      <!-- Main Tabs -->
      <div class="row q-gutter-x-md" style="border-bottom: 1px solid #e0e0e0">
        <div
          v-for="tab in mainTabs"
          :key="tab.value"
          class="cursor-pointer q-pb-sm"
          :class="activeTab === tab.value ? 'text-weight-medium' : 'text-grey-7'"
          :style="activeTab === tab.value ? 'border-bottom: 2px solid #743ee4; color: #743ee4' : ''"
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
        </div>
      </div>
    </div>

    <!-- Tab 1: Transcript -->
    <template v-if="activeTab === 'transcript'">
      <div class="col column" style="min-height: 0">
        <!-- Toolbar -->
        <div class="row items-center q-px-lg q-py-sm" style="border-bottom: 1px solid #f0f0f0">
          <div class="toolbar-group row items-center no-wrap q-gutter-x-xs q-mr-sm">
            <q-input
              v-model="searchText"
              dense
              outlined
              placeholder="Find and Replace"
              style="width: 220px"
              class="default-input"
            >
              <template v-slot:prepend>
                <q-icon name="sym_o_search" size="18px" />
              </template>
            </q-input>
          </div>
          <div class="toolbar-group row items-center no-wrap q-mr-sm">
            <q-btn flat dense round icon="sym_r_undo" color="grey-7" size="sm" />
            <q-btn flat dense round icon="sym_r_redo" color="grey-7" size="sm" />
          </div>
          <q-space />
          <div class="toolbar-group row items-center no-wrap">
            <q-btn flat dense no-caps size="sm" color="grey-7" icon="sym_o_file_copy" label="Copy" />
            <q-btn flat dense no-caps size="sm" color="grey-7" icon="sym_o_translate" label="Translate" />
            <q-btn flat dense no-caps size="sm" color="grey-7" icon="sym_o_download" label="Export" />
          </div>
          <q-btn flat dense round icon="sym_o_more_vert" color="grey-7" size="sm" class="q-ml-xs" />
        </div>

        <!-- Transcript Segments -->
        <div class="col scroll q-px-lg q-py-sm">
          <SpeakerSegment
            v-for="(p, i) in paragraphs"
            :key="i"
            :speaker="p.speaker"
            :speaker-label="p.speakerLabel"
            :start-time="p.startTime"
            :end-time="p.endTime"
            :text="p.text"
          />
        </div>

        <!-- Audio Player -->
        <AudioPlayer :duration="record.duration" />
      </div>
    </template>

    <!-- Tab 2: Content Hub -->
    <template v-if="activeTab === 'content'">
      <div class="col column" style="min-height: 0">
        <!-- Sub-tabs row -->
        <div class="row items-center q-px-lg q-py-sm q-gutter-x-sm no-wrap scroll-x">
          <div
            v-for="tab in contentSubTabs"
            :key="tab"
            class="tab-transcript-navigation q-px-md rounded-borders row items-center"
            :class="{ 'tab-transcript-navigation-active': activeContentTab === tab }"
            @click="activeContentTab = tab; showMagicChat = false"
          >
            {{ tab }}
          </div>
          <q-btn
            outline
            no-caps
            dense
            color="primary"
            icon="sym_o_add"
            label="New content"
            class="q-ml-sm"
            style="border-radius: 20px; white-space: nowrap"
          />
          <q-btn
            unelevated
            no-caps
            dense
            color="accent"
            text-color="white"
            class="q-ml-sm"
            style="border-radius: 20px; white-space: nowrap"
            @click="showMagicChat = !showMagicChat"
          >
            <img src="/icons/magic_staff.svg" style="width: 18px; height: 18px" class="q-mr-xs" />
            Magic Chat
          </q-btn>
        </div>

        <!-- Magic Chat view -->
        <div v-if="showMagicChat" class="col column q-px-lg q-py-md">
          <div class="text-h5 text-weight-bold q-mb-lg">Magic Chat</div>
          <q-space />
          <div class="row items-end q-gutter-x-sm">
            <q-input
              v-model="chatMessage"
              outlined
              placeholder="Ask me anything about the transcript..."
              class="col default-input"
            />
            <q-btn unelevated no-caps color="primary" label="Send" style="border-radius: 8px; height: 40px" />
          </div>
        </div>

        <!-- Content area -->
        <div v-else class="col scroll">
          <!-- Content header -->
          <div class="q-px-lg q-py-sm bg-purple-1 row items-center" style="border-bottom: 1px solid #e3d8fa">
            <span class="text-primary text-body2 text-weight-medium">{{ activeContentTab }}</span>
          </div>
          <!-- Action icons -->
          <div class="q-px-lg q-py-xs row items-center q-gutter-x-xs">
            <q-btn flat dense round icon="sym_o_file_copy" color="grey-7" size="sm" />
            <q-btn flat dense round icon="sym_o_edit_square" color="grey-7" size="sm" />
            <q-btn flat dense round icon="sym_o_refresh" color="grey-7" size="sm" />
          </div>
          <div class="q-px-lg q-pb-lg">
            <div
              v-if="activeContentBody"
              class="content-body text-body2"
              style="max-width: 800px; line-height: 1.8; color: #424242"
              v-html="renderMarkdown(activeContentBody)"
            />
            <div v-else class="text-grey-5 text-body1 q-pa-xl text-center">
              No content available for this tab yet.
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Tab 3: Visual Hub -->
    <template v-if="activeTab === 'visual'">
      <div class="col column q-px-lg q-py-md" style="min-height: 0">
        <!-- Top bar -->
        <div class="row items-center q-mb-md">
          <div class="row no-wrap q-gutter-x-sm">
            <div
              v-for="ar in aspectRatios"
              :key="ar.value"
              class="column items-center cursor-pointer q-px-xs"
              @click="aspectRatio = ar.value"
            >
              <div
                class="aspect-icon rounded-borders"
                :class="{ 'aspect-icon--active': aspectRatio === ar.value }"
                :style="ar.style"
              />
              <span class="text-caption q-mt-xs" :class="aspectRatio === ar.value ? 'text-weight-medium' : 'text-grey-7'">{{ ar.label }}</span>
            </div>
          </div>
          <q-space />
          <q-btn outline no-caps dense color="grey-7" icon="sym_o_download" label="Export history" style="border-radius: 20px" />
        </div>

        <!-- Main visual area -->
        <div class="row col q-gutter-x-lg" style="min-height: 0">
          <!-- Preview area -->
          <div class="col column" style="min-height: 0">
            <div
              class="col rounded-borders column items-center justify-center"
              style="background: #f0f0f0; min-height: 350px"
            >
              <q-icon name="sym_o_image" size="64px" color="grey-4" />
              <div class="text-caption text-grey-5 q-mt-md cursor-pointer">
                Create your first clip <q-icon name="sym_o_arrow_forward" size="14px" />
              </div>
            </div>
          </div>

          <!-- Right panel -->
          <div style="width: 340px; border: 1px solid #e0e0e0; border-radius: 12px" class="column q-pa-lg">
            <div class="text-h6 text-weight-bold text-primary text-center q-mb-md">What do you want to create?</div>

            <div class="text-body2 text-weight-medium q-mb-sm">1. Please select video clips or audiograms</div>
            <div class="row q-gutter-sm q-mb-lg justify-center">
              <div
                class="clip-type rounded-borders column items-center justify-center cursor-pointer"
                :class="{ 'clip-type-selected': clipType === 'audiogram' }"
                @click="clipType = 'audiogram'"
              >
                <q-icon name="sym_o_image" size="40px" color="dark" class="q-mb-xs" />
                <span class="text-body2 text-weight-bold">Audiogram</span>
                <span class="text-caption text-grey-7 text-center">Add text and image to your audio</span>
              </div>
              <div
                class="clip-type rounded-borders column items-center justify-center cursor-pointer"
                :class="{ 'clip-type-selected': clipType === 'video' }"
                @click="clipType = 'video'"
              >
                <q-icon name="sym_o_movie" size="40px" color="dark" class="q-mb-xs" />
                <span class="text-body2 text-weight-bold">Video Clip</span>
                <span class="text-caption text-grey-7 text-center">Create clips from your video</span>
              </div>
            </div>

            <div class="text-body2 text-weight-medium q-mb-md">2. Chose your starting point</div>
            <div class="column items-center">
              <q-btn
                unelevated
                no-caps
                color="primary"
                label="Create AI clips"
                style="border-radius: 20px; min-width: 180px"
                class="q-mb-sm"
              />
              <span class="text-caption text-grey-7 q-mb-sm">or</span>
              <q-btn
                outline
                no-caps
                color="primary"
                label="Start from scratch"
                style="border-radius: 20px; min-width: 180px"
              />
            </div>
          </div>
        </div>
      </div>
    </template>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { record, paragraphs, contentItems } from '../data/transcript'
import SpeakerSegment from '../components/SpeakerSegment.vue'
import AudioPlayer from '../components/AudioPlayer.vue'

const activeTab = ref('transcript')
const searchText = ref('')
const showMagicChat = ref(false)
const chatMessage = ref('')
const aspectRatio = ref('9:16')
const clipType = ref('audiogram')

const aspectRatios = [
  { value: '9:16', label: '9:16', style: { width: '20px', height: '32px' } },
  { value: '16:9', label: '16:9', style: { width: '32px', height: '20px' } },
  { value: '1:1', label: '1:1', style: { width: '24px', height: '24px' } },
]

const mainTabs = [
  { label: 'Transcript', value: 'transcript' },
  { label: 'Content Hub', value: 'content' },
  { label: 'Visual Hub', value: 'visual' },
]

const contentSubTabs = [
  'Summary',
  'Quotes',
  'Chapters',
  'Summary By Speaker',
  'Summary By Topic',
  'Follow Up Questions (UX Research)',
  'UX Report',
]

const activeContentTab = ref('Summary')

const activeContentBody = computed(() => {
  const item = contentItems.find(c => c.name === activeContentTab.value)
  if (!item || !item.results.length) return ''
  return item.results[0].body || ''
})

function renderMarkdown(md) {
  if (!md) return ''

  const escaped = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = escaped.split('\n')
  const html = []
  let inList = false

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    if (line.match(/^###\s+/)) {
      if (inList) { html.push('</ul>'); inList = false }
      html.push(`<h3 style="margin: 1em 0 0.5em; font-size: 1.1rem">${line.replace(/^###\s+/, '')}</h3>`)
      continue
    }
    if (line.match(/^##\s+/)) {
      if (inList) { html.push('</ul>'); inList = false }
      html.push(`<h2 style="margin: 1.2em 0 0.5em; font-size: 1.25rem">${line.replace(/^##\s+/, '')}</h2>`)
      continue
    }

    if (line.match(/^\*\s+/) || line.match(/^-\s+/)) {
      if (!inList) { html.push('<ul style="margin: 0.5em 0; padding-left: 1.5em">'); inList = true }
      const content = line.replace(/^[\*\-]\s+/, '')
      html.push(`<li style="margin-bottom: 0.3em">${applyInline(content)}</li>`)
      continue
    }

    if (inList) { html.push('</ul>'); inList = false }

    if (line.trim() === '') {
      html.push('<br/>')
    } else {
      html.push(`<p style="margin: 0.4em 0">${applyInline(line)}</p>`)
    }
  }

  if (inList) html.push('</ul>')
  return html.join('\n')
}

function applyInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}
</script>

<style scoped>
.content-body :deep(h2) {
  color: #1d1d1d;
}
.content-body :deep(h3) {
  color: #424242;
}
.content-body :deep(strong) {
  color: #1d1d1d;
}
.content-body :deep(li) {
  color: #424242;
}
.scroll-x {
  overflow-x: auto;
  scrollbar-width: thin;
}
.aspect-icon {
  border: 2px solid #bdbdbd;
  border-radius: 4px;
  transition: all 0.2s;
}
.aspect-icon--active {
  border-color: #743ee4;
  background: #743ee4;
}
.toolbar-group {
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 2px 4px;
}
</style>
