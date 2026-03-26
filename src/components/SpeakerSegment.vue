<template>
  <div class="row no-wrap q-py-sm" style="border-bottom: 1px solid #f0f0f0">
    <div class="speaker-dropdown q-pr-md">
      <div
        class="row items-center q-px-sm q-py-xs rounded-borders"
        :style="speakerStyle"
      >
        <span class="text-weight-medium" style="font-size: 13px">{{ speakerLabel }}</span>
        <q-icon name="sym_o_expand_more" size="16px" class="q-ml-xs" />
      </div>
      <div class="row items-center q-mt-xs q-gutter-x-xs" style="padding-left: 4px">
        <q-btn
          flat
          dense
          round
          size="xs"
          icon="sym_o_play_arrow"
          :color="isPurple ? 'primary' : 'amber-9'"
        />
        <span class="text-grey-6" style="font-size: 12px">
          {{ formatTime(startTime) }} - {{ formatTime(endTime) }}
        </span>
      </div>
    </div>
    <div class="paragraph-text text-body2 q-pt-xs" style="color: #424242; line-height: 1.7">
      {{ text }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatTime } from '../data/transcript'

const props = defineProps({
  speaker: { type: Number, required: true },
  speakerLabel: { type: String, required: true },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  text: { type: String, required: true },
})

const isPurple = computed(() => props.speaker === 0)

const speakerStyle = computed(() => {
  if (isPurple.value) {
    return {
      borderLeft: '3px solid #743ee4',
      background: '#f9f5ff',
      color: '#743ee4',
    }
  }
  return {
    borderLeft: '3px solid #ffa400',
    background: '#fff8e1',
    color: '#e65100',
  }
})
</script>
