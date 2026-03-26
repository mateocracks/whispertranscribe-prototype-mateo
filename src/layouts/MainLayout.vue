<template>
  <q-layout view="lHh Lpr lFf">
    <q-drawer v-model="drawer" :width="200" :breakpoint="0" bordered class="bg-primary">
      <div class="column full-height">
        <div class="q-pa-md q-pt-lg text-center">
          <img src="/logos/logo-sidebar.svg" alt="WhisperTranscribe" style="width: 160px" />
        </div>
        <div class="q-px-md q-mb-md">
          <q-btn
            unelevated
            color="white"
            text-color="primary"
            icon="sym_o_adaptive_audio_mic"
            label="New transcription"
            class="full-width"
            style="border-radius: 8px"
            @click="$router.push('/start')"
          />
        </div>
        <div class="q-px-md q-mb-sm">
          <q-input
            dense
            outlined
            placeholder="Search projects and files"
            class="search-input"
            dark
          >
            <template v-slot:prepend>
              <q-icon name="sym_o_search" color="white" />
            </template>
          </q-input>
        </div>

        <div class="q-px-sm col">
          <q-item
            clickable
            dark
            class="rounded-borders q-mb-xs"
            :class="{ 'bg-white-alpha': $route.path.startsWith('/transcript') }"
            @click="$router.push('/transcript/example')"
          >
            <q-item-section>
              <q-item-label class="text-white text-caption">
                <div class="row justify-between">
                  <span>Examples</span>
                  <span>26 Mar 2026</span>
                </div>
              </q-item-label>
              <q-item-label class="text-white text-body2">User Interview 1: Nicky</q-item-label>
            </q-item-section>
          </q-item>
        </div>

        <q-space />

        <div class="q-pa-md">
          <div class="row items-center q-mb-sm">
            <q-icon name="sym_o_folder" color="white" size="20px" class="q-mr-sm" />
            <span class="text-white text-body2">Projects</span>
          </div>
        </div>

        <div class="q-pa-sm" style="border-top: 1px solid rgba(255,255,255,0.15)">
          <q-item dense dark clickable class="rounded-borders">
            <q-item-section avatar>
              <q-icon name="sym_o_account_circle" color="white" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-white text-caption">patrick.capulong@gmail.com</q-item-label>
              <q-item-label class="text-white text-caption" style="opacity: 0.7">60 minutes left</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="sym_o_expand_less" color="white" size="16px" />
            </q-item-section>
          </q-item>
          <div class="text-center q-mt-xs">
            <span class="text-white" style="font-size: 10px; opacity: 0.5">
              Affiliate &nbsp; Terms &nbsp; Privacy &nbsp; Roadmap &nbsp; v2.0.0
            </span>
          </div>
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <q-banner dense class="bg-amber-1 text-center" style="min-height: 32px; font-size: 13px">
        Enjoy 10% off on any subscription (also annual) with code <b>GXODAZNA</b> ⏱ <i>Ends in 16h 58m.</i>
        <a href="#" class="text-primary" style="margin-left: 4px">Check out plans</a>
      </q-banner>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
const drawer = ref(true)
</script>

<style>
.search-input .q-field__control {
  background: rgba(255, 255, 255, 0.15) !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}
.search-input .q-field__control input::placeholder {
  color: rgba(255, 255, 255, 0.7) !important;
}
.search-input .q-field__control input {
  color: white !important;
}
.bg-white-alpha {
  background: rgba(255, 255, 255, 0.15) !important;
}
</style>
