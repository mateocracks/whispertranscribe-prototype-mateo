<template>
  <div class="profiles-grid">
    <q-item
      v-for="profile in profiles"
      :key="profile.id"
      clickable
      v-ripple
      :class="['profile-item rounded-borders q-px-sm q-py-sm', { 'profile-item--selected': isSelected(profile) }]"
      @click="emit('select-profile', profile)"
    >
      <q-item-section avatar class="profile-item__avatar">
        <img :src="profile.icon" :alt="profile.label" class="profile-icon" width="40" height="40" />
      </q-item-section>
      <q-item-section>
        <q-item-label
          :class="[
            'text-body2 text-weight-medium',
            isSelected(profile) ? 'text-primary' : '',
          ]"
        >
          {{ profile.label }}
        </q-item-label>
        <q-item-label v-if="profile.description" caption class="text-caption text-grey-7">
          {{ profile.description }}
        </q-item-label>
      </q-item-section>
    </q-item>
  </div>
</template>

<script setup>
import { profiles } from '../data/profiles.js'

const props = defineProps({
  selectedProfile: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['select-profile'])

function isSelected(profile) {
  return props.selectedProfile?.id === profile.id
}
</script>

<style scoped>
.profiles-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  align-content: start;
}

.profile-item {
  min-height: 72px;
  border: 1px solid transparent;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.profile-item:hover {
  background-color: #f9f5ff;
}

.profile-item--selected {
  background-color: #f9f5ff;
  border-color: rgba(116, 62, 228, 0.35);
}

.profile-item__avatar {
  min-width: 48px;
}

.profile-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
  display: block;
}
</style>
