<template>
  <div
    class="audio-player row items-center q-px-md q-py-sm"
    style="background: #fff; border-top: 1px solid #e0e0e0; min-height: 56px"
  >
    <q-btn flat dense round icon="sym_o_keyboard_arrow_left" color="grey-7" size="sm" />
    <q-btn
      flat
      dense
      round
      :icon="playing ? 'sym_o_pause_circle' : 'sym_o_play_circle'"
      color="primary"
      size="md"
      class="q-mx-xs"
      @click="playing = !playing"
    />
    <q-btn flat dense round icon="sym_o_keyboard_arrow_right" color="grey-7" size="sm" />

    <span class="text-caption text-grey-7 q-mx-sm" style="min-width: 52px">
      {{ formatTime(currentTime) }}
    </span>

    <q-slider
      v-model="currentTime"
      :min="0"
      :max="duration"
      :step="1"
      color="primary"
      class="col q-mx-sm"
      dense
    />

    <span class="text-caption text-grey-7 q-mx-sm" style="min-width: 52px">
      {{ formatTime(duration) }}
    </span>

    <q-btn flat dense no-caps size="sm" class="text-grey-7 q-mx-xs" @click="cycleSpeed">
      {{ speed }}x
    </q-btn>
    <q-btn flat dense round icon="sym_o_loop" color="grey-7" size="sm" />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { formatTime } from '../data/transcript'

const props = defineProps({
  duration: { type: Number, default: 455 },
})

const playing = ref(false)
const currentTime = ref(0)
const speed = ref(1)

const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2]

function cycleSpeed() {
  const idx = speeds.indexOf(speed.value)
  speed.value = speeds[(idx + 1) % speeds.length]
}
</script>
