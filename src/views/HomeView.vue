<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api/piped-client'
import VideoCard from '../components/VideoCard.vue'

const videos = ref([])
const loading = ref(true)
const error = ref(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await api.popular()
    videos.value = data
  } catch (e) {
    error.value = String(e.message || e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div class="max-w-[1600px] mx-auto">
    <div class="flex items-center gap-2 mb-6 border-b border-white/10 pb-2">
      <svg viewBox="0 0 24 24" class="w-6 h-6 fill-accent"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      <h1 class="text-xl font-bold tracking-wide">Trending</h1>
    </div>

    <div v-if="loading" class="text-muted text-sm py-8 text-center">Loading…</div>
    <div v-else-if="error" class="text-red-400 text-sm py-8 text-center">
      <p class="mb-3">{{ error }}</p>
      <button @click="load" class="px-4 py-2 rounded-full bg-surface hover:bg-surface-2 text-text">Retry</button>
    </div>
    
    <div v-else-if="!videos.length" class="text-muted text-sm py-8 text-center">
      No videos found. Check your Vercel Environment Variables to ensure `SCRAPER_API_KEY` is set.
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6">
      <VideoCard v-for="v in videos" :key="v.videoId" :video="v" />
    </div>
  </div>
</template>
