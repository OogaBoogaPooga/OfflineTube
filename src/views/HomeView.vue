<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api/youtube-client'
import VideoGrid from '../components/VideoGrid.vue'

const videos = ref([])
const loading = ref(true)
const error = ref(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await api.popular()
    videos.value = data.filter(v => v.type === 'video' || v.videoId)
  } catch (e) {
    error.value = String(e.message || e)
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div class="max-w-7xl mx-auto px-3 py-4">
    <h1 class="text-xl font-semibold mb-4">Trending</h1>
    <div v-if="loading" class="text-muted text-sm py-8 text-center">Loading…</div>
    <div v-else-if="error" class="text-red-400 text-sm py-8 text-center">
      <p class="mb-3">{{ error }}</p>
      <button @click="load" class="px-4 py-2 rounded-full bg-surface hover:bg-surface-2 text-text">Retry</button>
    </div>
    <VideoGrid v-else :videos="videos" />
  </div>
</template>
