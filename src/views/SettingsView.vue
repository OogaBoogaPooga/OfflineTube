<script setup>
import { ref } from 'vue'
import { useSettingsStore, DEFAULT_INSTANCE } from '../stores/settings'

const settings = useSettingsStore()
const instanceInput = ref(settings.instanceUrl)
const saved = ref(false)
const err = ref(null)

function save() {
  saved.value = false
  err.value = null
  if (settings.setInstance(instanceInput.value)) {
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } else {
    err.value = 'Enter a full http(s):// URL'
  }
}

function reset() {
  instanceInput.value = DEFAULT_INSTANCE
  save()
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-3 py-4">
    <h1 class="text-xl font-semibold mb-6">Settings</h1>

    <section class="mb-8">
      <label class="block text-sm font-medium mb-2">Invidious instance</label>
      <div class="flex gap-2">
        <input
          v-model="instanceInput"
          type="url"
          placeholder="https://inv.example.com"
          class="flex-1 h-10 px-3 rounded-lg bg-surface border border-white/10 focus:outline-none focus:border-white/30"
        />
        <button @click="save" class="h-10 px-4 rounded-lg bg-accent hover:bg-accent/80 font-medium">
          Save
        </button>
      </div>
      <p class="text-xs text-muted mt-2">
        All metadata, search, and stream URLs are fetched from this instance.
      </p>
      <p v-if="saved" class="text-xs text-green-400 mt-1">Saved.</p>
      <p v-if="err" class="text-xs text-red-400 mt-1">{{ err }}</p>
      <button @click="reset" class="text-xs text-muted hover:text-white mt-3 underline">
        Reset to default ({{ DEFAULT_INSTANCE }})
      </button>
    </section>

    <section class="mb-8">
      <label class="block text-sm font-medium mb-2">Default download quality</label>
      <select
        :value="settings.defaultQuality"
        @change="settings.setQuality($event.target.value)"
        class="h-10 px-3 rounded-lg bg-surface border border-white/10"
      >
        <option value="highest">Highest</option>
        <option value="medium">Medium</option>
        <option value="lowest">Lowest</option>
      </select>
      <p class="text-xs text-muted mt-2">
        Used by the "Download all" button and single-click downloads.
      </p>
    </section>

    <section class="text-xs text-muted">
      <p>Offline Tube · v0.1.0</p>
    </section>
  </div>
</template>
