<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api/piped-client'
import VideoGrid from '../components/VideoGrid.vue'

const route = useRoute()
const router = useRouter()

const query = ref(route.query.q || '')
const type = ref(route.query.type || 'video')
const results = ref([])
const loading = ref(false)
const error = ref(null)

async function run() {
  if (!query.value.trim()) return
  router.replace({ path: '/search', query: { q: query.value, type: type.value } })
  loading.value = true
  error.value = null
  try {
    results.value = await api.search(query.value, type.value)
  } catch (e) {
    error.value = String(e.message || e)
    results.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => { if (query.value) run() })
watch(() => route.query.q, (q) => { if (q && q !== query.value) { query.value = q; run() } })
watch(type, () => run())
</script>

<template>
  <div class="max-w-7xl mx-auto px-3 py-4">
    <div class="flex gap-2 mb-4">
      <input
        v-model="query"
        @keyup.enter="run"
        placeholder="Search…"
        class="flex-1 h-10 px-4 rounded-full bg-surface border border-white/10 focus:outline-none focus:border-white/30"
      />
      <select v-model="type" class="h-10 px-3 rounded-full bg-surface border border-white/10">
        <option value="video">Videos</option>
        <option value="channel">Channels</option>
        <option value="playlist">Playlists</option>
      </select>
      <button @click="run" class="h-10 px-5 rounded-full bg-accent hover:bg-accent/80 font-medium">Search</button>
    </div>

    <div v-if="loading" class="text-muted text-sm py-8 text-center">Searching…</div>
    <div v-else-if="error" class="text-red-400 text-sm py-8 text-center">{{ error }}</div>
    <div v-else-if="!results.length && query" class="text-muted text-sm py-8 text-center">
      No results.
    </div>

    <VideoGrid v-else-if="type === 'video'" :videos="results" />

    <div v-else-if="type === 'channel'" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <RouterLink
        v-for="c in results" :key="c.authorId"
        :to="`/channel/${c.authorId}`"
        class="flex items-center gap-3 p-3 bg-surface rounded-lg hover:bg-surface-2"
      >
        <img v-if="c.authorThumbnails?.[0]?.url" :src="c.authorThumbnails[0].url" class="w-12 h-12 rounded-full object-cover" />
        <div class="min-w-0">
          <div class="font-medium truncate">{{ c.author }}</div>
          <div class="text-xs text-muted truncate">{{ c.subCount }} subs · {{ c.videoCount }} videos</div>
        </div>
      </RouterLink>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <RouterLink
        v-for="p in results" :key="p.playlistId"
        :to="`/playlist/${p.playlistId}`"
        class="block bg-surface rounded-lg overflow-hidden hover:bg-surface-2"
      >
        <img v-if="p.playlistThumbnail" :src="p.playlistThumbnail" class="w-full aspect-video object-cover" />
        <div class="p-3">
          <div class="font-medium line-clamp-2 text-sm">{{ p.title }}</div>
          <div class="text-xs text-muted mt-1">{{ p.author }} · {{ p.videoCount }} items</div>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
