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
  }
  error.value = null
  
  try {
    // We fetch the popular list, but to get "more" we could fetch a different search term or just re-fetch
    const data = await api.popular()
    if (isMore) {
      // Append new videos, filtering out duplicates
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
    <div class="flex items-center gap-2 mb-6 border-b border-white/10 pb-2">
      <svg viewBox="0 0 24 24" class="w-6 h-6 fill-accent"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
      <h1 class="text-xl font-bold tracking-wide">Trending</h1>
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

    <!-- Load More Button -->
    <div v-if="videos.length > 0" class="mt-8 flex justify-center pb-8">
      <button @click="load(true)" :disabled="loading" class="px-6 py-2.5 rounded-full bg-surface hover:bg-surface-2 font-bold text-sm transition-colors disabled:opacity-50">
        {{ loading ? 'Loading…' : 'Load More Videos' }}
      </button>
    </div>
  </div>
</template>
