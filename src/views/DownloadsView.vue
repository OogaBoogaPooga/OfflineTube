<script setup>
import { computed, onMounted } from 'vue'
import { useDownloadsStore } from '../stores/downloads'
import { useLibraryStore } from '../stores/library'

const downloads = useDownloadsStore()
const library = useLibraryStore()

onMounted(() => library.refresh())

const inProgress = computed(() =>
  library.videos.filter(v => v.status === 'downloading' || v.status === 'cancelled')
)
</script>

<template>
  <div class="max-w-6xl mx-auto px-3 py-4">
    <h1 class="text-xl font-semibold mb-4">Downloads</h1>

    <div v-if="downloads.count" class="mb-6">
      <h2 class="text-sm text-muted uppercase tracking-wide mb-2">Active</h2>
      <div class="space-y-2">
        <div
          v-for="d in downloads.activeList"
          :key="d.id"
          class="bg-surface rounded-lg p-3 flex items-center gap-3"
        >
          <img v-if="d.thumbnail" :src="d.thumbnail" class="w-16 h-10 object-cover rounded" />
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">{{ d.title }}</div>
            <div class="text-xs text-muted">{{ d.status }} · {{ Math.round(d.progress * 100) }}%</div>
            <div class="mt-1 h-1 bg-surface-3 rounded overflow-hidden">
              <div class="h-full bg-accent" :style="{ width: `${d.progress*100}%` }"></div>
            </div>
          </div>
          <button
            v-if="d.status === 'downloading'"
            @click="downloads.cancel(d.id)"
            class="text-xs text-red-400 hover:text-red-300"
          >Cancel</button>
        </div>
      </div>
    </div>

    <div v-if="inProgress.length" class="mb-6">
      <h2 class="text-sm text-muted uppercase tracking-wide mb-2">Interrupted</h2>
      <div v-for="v in inProgress" :key="v.id" class="bg-surface rounded-lg p-3 flex items-center gap-3 mb-2">
        <div class="flex-1 min-w-0">
          <div class="text-sm truncate">{{ v.title }}</div>
          <div class="text-xs text-muted">{{ v.status }}</div>
        </div>
      </div>
    </div>

    <div v-if="!downloads.count && !inProgress.length" class="text-muted text-sm py-12 text-center">
      Nothing downloading. Go to a video and click <em>Download</em>.
    </div>
  </div>
</template>
