<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../api/youtube-client'
import VideoGrid from '../components/VideoGrid.vue'

const route = useRoute()
const channel = ref(null)
const videos = ref([])
const loading = ref(true)
const error = ref(null)

async function load(id) {
  loading.value = true
  error.value = null
  channel.value = null
  videos.value = []
  try {
    const data = await api.channel(id)
    channel.value = data
    videos.value = (data.latestVideos || []).map(v => ({
      ...v,
      videoId: v.videoId,
      author: data.author,
      authorId: id,
      videoThumbnails: v.videoThumbnails
    }))
  } catch (e) {
    error.value = String(e.message || e)
  } finally {
    loading.value = false
  }
}

onMounted(() => load(route.params.id))
watch(() => route.params.id, (id) => { if (id) load(id) })
</script>

<template>
  <div class="max-w-7xl mx-auto px-3 py-4">
    <div v-if="loading" class="text-muted text-sm py-12 text-center">Loading…</div>
    <div v-else-if="error" class="text-red-400 text-sm py-12 text-center">{{ error }}</div>

    <template v-else-if="channel">
      <div class="flex items-center gap-4 mb-6">
        <img
          v-if="channel.authorThumbnails?.[0]?.url"
          :src="channel.authorThumbnails[0].url"
          class="w-20 h-20 rounded-full object-cover"
        />
        <div>
          <h1 class="text-xl font-semibold">{{ channel.author }}</h1>
          <p class="text-xs text-muted mt-1">
            {{ channel.subCount }} subscribers · {{ channel.videoCount ?? videos.length }} videos
          </p>
          <p v-if="channel.description" class="text-xs text-muted mt-1 line-clamp-2 max-w-2xl">
            {{ channel.description }}
          </p>
        </div>
      </div>
      <VideoGrid :videos="videos" />
    </template>
  </div>
</template>
