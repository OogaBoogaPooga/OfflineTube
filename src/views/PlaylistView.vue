<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api, pickStream } from '../api/youtube-client'
import { useDownloadsStore } from '../stores/downloads'
import { useSettingsStore } from '../stores/settings'
import VideoCard from '../components/VideoCard.vue'

const route = useRoute()
const downloads = useDownloadsStore()
const settings = useSettingsStore()

const playlist = ref(null)
const loading = ref(true)
const error = ref(null)
const bulkBusy = ref(false)

async function load(id) {
  loading.value = true
  error.value = null
  playlist.value = null
  try {
    playlist.value = await api.playlist(id)
  } catch (e) {
    error.value = String(e.message || e)
  } finally {
    loading.value = false
  }
}

async function downloadAll() {
  if (!playlist.value || bulkBusy.value) return
  bulkBusy.value = true
  try {
    for (const item of playlist.value.videos) {
      try {
        const v = await api.video(item.videoId)
        const stream = pickStream(v, settings.defaultQuality)
        if (stream) downloads.start(v, stream.url)
        await new Promise(r => setTimeout(r, 500))
      } catch { /* skip failed */ }
    }
  } finally {
    bulkBusy.value = false
  }
}

onMounted(() => load(route.params.id))
watch(() => route.params.id, (id) => { if (id) load(id) })
</script>

<template>
  <div class="max-w-7xl mx-auto px-3 py-4">
    <div v-if="loading" class="text-muted text-sm py-12 text-center">Loading…</div>
    <div v-else-if="error" class="text-red-400 text-sm py-12 text-center">{{ error }}</div>

    <template v-else-if="playlist">
      <div class="flex items-start gap-4 mb-6">
        <img
          v-if="playlist.playlistThumbnail"
          :src="playlist.playlistThumbnail"
          class="w-40 rounded-lg object-cover"
        />
        <div class="flex-1 min-w-0">
          <h1 class="text-xl font-semibold line-clamp-2">{{ playlist.title }}</h1>
          <p class="text-xs text-muted mt-1">
            {{ playlist.author }} · {{ playlist.videoCount }} videos
          </p>
          <button
            @click="downloadAll"
            :disabled="bulkBusy"
            class="mt-3 h-9 px-4 rounded-full bg-accent hover:bg-accent/80 disabled:opacity-50 text-sm font-medium"
          >
            {{ bulkBusy ? 'Queueing…' : 'Download all' }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
        <VideoCard
          v-for="v in playlist.videos"
          :key="v.videoId"
          :video="{ ...v, author: v.author || playlist.author }"
        />
      </div>
    </template>
  </div>
</template>
