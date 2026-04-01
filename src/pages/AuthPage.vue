<template>
  <q-page class="flex flex-center bg-primary full-height">
    <q-card flat class="border-radius-16 q-pa-xl full-width bg-white" :style="{ maxWidth: cardWidth }">
      <!-- Step 0: Free Credits -->
      <div v-if="step === 0" class="text-center">
        <div class="flex justify-center q-mb-sm">
          <img src="/logos/logo-onboarding.svg" alt="WhisperTranscribe" class="auth-logo" />
        </div>
        <div class="text-h5 text-weight-medium q-mb-xs">Get started with</div>
        <div class="text-h4 text-weight-medium text-primary q-mb-lg">60 free minutes</div>
        <q-btn no-caps color="primary" label="Continue" class="q-btn--lg full-width" @click="step = 1" />
      </div>

      <!-- Steps 1–3 with step indicator -->
      <template v-if="step >= 1 && step <= 3">
        <div class="row items-center no-wrap q-mb-md">
          <template v-for="(s, i) in stepDefs" :key="s.n">
            <div
              class="step-badge"
              :class="{
                'step-badge--done': s.n < step,
                'step-badge--active': s.n === step,
                'step-badge--future': s.n > step,
              }"
            >
              {{ s.n }}
            </div>
            <q-icon
              v-if="i < stepDefs.length - 1"
              name="sym_o_trending_flat"
              color="primary"
              class="q-mx-xs"
              size="18px"
            />
          </template>
        </div>

        <!-- Step 1: Language -->
        <div v-if="step === 1">
          <div class="text-h4 q-mb-sm">Transcription language</div>
          <div class="text-body2 q-mb-md">
            What language do you use most often in your audio or video?
          </div>
          <q-select
            v-model="selectedLanguage"
            :options="languages"
            option-label="label"
            option-value="code"
            outlined
            dense
            class="q-mb-md default-input"
          />
          <div class="flex justify-end q-mt-md">
            <q-btn no-caps label="Next" color="primary" @click="step = 2" />
          </div>
        </div>

        <!-- Step 2: Create Project -->
        <div v-if="step === 2">
          <div class="text-h4 q-mb-sm">Create your first project</div>
          <div class="text-body2 q-mb-md">Your transcripts will be saved to projects.</div>
          <q-input
            v-model="projectName"
            outlined
            dense
            placeholder="My project"
            class="q-mb-md default-input"
          />
          <div class="flex justify-end q-mt-md">
            <q-btn no-caps label="Next" color="primary" :disable="!projectName?.trim()" @click="step = 3" />
          </div>
        </div>

        <!-- Step 3: Select Profile -->
        <div v-if="step === 3">
          <div class="text-h4 q-mb-sm">What best describes you?</div>
          <div class="text-body2 q-mb-md">
            We will use this to create a content from your transcript
          </div>
          <div class="profiles-list q-px-sm">
            <ProfileSelector
              :selected-profile="selectedProfile"
              @select-profile="(p) => (selectedProfile = p)"
            />
          </div>
          <div class="flex justify-end q-mt-md">
            <q-btn
              no-caps
              label="Next"
              color="primary"
              :disable="!selectedProfile"
              @click="completeOnboarding"
            />
          </div>
        </div>
      </template>

      <!-- Step 4: Done -->
      <div v-if="step === 4" class="text-center">
        <div class="text-h4 q-mt-xl q-mb-sm">Welcome to WhisperTranscribe!</div>
        <div class="q-mb-lg">Your workspace is set up for you 🎉</div>
        <div class="column items-center q-gutter-y-sm">
          <q-btn no-caps label="Add your first transcript" color="primary" @click="goToStart" />
          <q-btn no-caps flat color="primary" label="View example" @click="goToExample" />
        </div>
      </div>
    </q-card>
  </q-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { languages, defaultLanguage } from '../data/languages.js'
import ProfileSelector from '../components/ProfileSelector.vue'

const router = useRouter()

const step = ref(0)
const selectedLanguage = ref(defaultLanguage)
const projectName = ref('My project')
const selectedProfile = ref(null)

const cardWidth = computed(() => {
  const w = step.value
  if (w === 0) return '420px'
  if (w === 1 || w === 2) return '500px'
  if (w === 3) return '750px'
  if (w === 4) return '400px'
  return '420px'
})

const stepDefs = [{ n: 1 }, { n: 2 }, { n: 3 }]

function completeOnboarding() {
  step.value = 4
}

function goToStart() {
  localStorage.setItem('onboardingCompleted', 'true')
  router.push('/p/start')
}

function goToExample() {
  localStorage.setItem('onboardingCompleted', 'true')
  router.push('/p/transcript/example')
}
</script>

<style scoped>
.profiles-list {
  max-height: calc(100vh - 400px);
  overflow-y: auto;
}
.step-badge {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  flex-shrink: 0;
}
.step-badge--done {
  background: #3d4047;
  color: #fff;
}
.step-badge--active {
  background: #e2e3e6;
  color: #3d4047;
}
.step-badge--future {
  background: #f7f7f8;
  color: #3d4047;
}
</style>
