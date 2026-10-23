<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api/piped-client'
import VideoCard from '../components/VideoCard.vue'

const videos = ref([])
const loading = ref(true)
const error = ref(null)
const page = ref(1)

async function load(isMore = false) {
  if (!isMore) {
    loading.value = true
    videos.value = []
    page.value = 1
  } else {
    page.value++
  }
  error.value = null
  
  try {
    const data = await api.popular(page.value)
    if (isMore) {
      const existingIds = new Set(videos.value.map(v => v.videoId))
      const newVideos = data.filter(v => !existingIds.has(v.videoId))
      videos.value = [...videos.value, ...newVideos]
    } else {
      videos.value = data
    }
  } catch (e) {
    error.value = String(e.message || e)
  } finally {
    loading.value = false
  }
}

onMounted(() => load())
</script>

<template>
  <div class="max-w-[1600px] mx-auto">
    <div class="flex items-center justify-between gap-2 mb-6 border-b border-white/10 pb-2">
      <div class="flex items-center gap-2">
        <svg viewBox="0 0 24 24" class="w-6 h-6 fill-accent"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        <h1 class="text-xl font-bold tracking-wide">Home</h1>
      </div>
      <button @click="load()" class="text-xs text-muted hover:text-white flex items-center gap-1 transition-colors">
        <svg viewBox="0 0 24 24" class="w-4 h-4 fill-current"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
        Refresh Feed
      </button>
    </div>

    <div v-if="loading && !videos.length" class="text-muted text-sm py-8 text-center">Loading…</div>
    <div v-else-if="error && !videos.length" class="text-red-400 text-sm py-8 text-center">
      <p class="mb-3">{{ error }}</p>
      <button @click="load()" class="px-4 py-2 rounded-full bg-surface hover:bg-surface-2 text-text">Retry</button>
    </div>
    
    <div v-else-if="!videos.length" class="text-muted text-sm py-8 text-center">
      No videos found.
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
      <VideoCard v-for="v in videos" :key="v.videoId" :video="v" />
    </div>

    <div v-if="videos.length > 0" class="mt-8 flex justify-center pb-8">
      <button @click="load(true)" :disabled="loading" class="px-6 py-2.5 rounded-full bg-surface hover:bg-surface-2 font-bold text-sm transition-colors disabled:opacity-50">
        {{ loading ? 'Loading…' : 'Load More Videos' }}
      </button>
    </div>
  </div>
</template>
