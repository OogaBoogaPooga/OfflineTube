<script setup>
import { useSettingsStore } from '../stores/settings'

const settings = useSettingsStore()
</script>

<template>
  <div class="max-w-2xl mx-auto px-3 py-4">
    <h1 class="text-xl font-semibold mb-6">Settings</h1>

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
