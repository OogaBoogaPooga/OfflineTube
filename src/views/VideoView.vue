<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api, bestThumbnail, formatDuration } from '../api/youtube-client'
import { useDownloadsStore } from '../stores/downloads'
import { useLibraryStore } from '../stores/library'
import { db } from '../db'
import Player from '../components/Player.vue'
import DownloadModal from '../components/DownloadModal.vue'

const route = useRoute()
const downloads = useDownloadsStore()
const library = useLibraryStore()

const video = ref(null)
const comments = ref([])
const loading = ref(true)
const error = ref(null)
const showComments = ref(false)
const showModal = ref(false)

const isOffline = computed(() => library.videos.some(v => v.id === route.params.id && v.status === 'complete'))
const poster = computed(() => video.value ? (bestThumbnail(video.value)?.url || null) : null)
const playback = computed(() => {
  if (isOffline.value) return { offlineVideoId: route.params.id, src: null }
  if (stream.value) return { offlineVideoId: null, src: stream.value.url }
  return { offlineVideoId: null, src: null }
})

async function load(id) {
  loading.value = true
  error.value = null
  video.value = null
  comments.value = []
  showComments.value = false
  try {
    video.value = await api.video(id)
  } catch (e) {
    error.value = String(e.message || e)
    const local = await db.videos.get(id)
    if (local) {
      video.value = {
        videoId: local.id,
        title: local.title,
        author: local.author,
        authorId: local.authorId,
        lengthSeconds: local.lengthSeconds,
        description: '',
        videoThumbnails: local.thumbnail ? [{ url: local.thumbnail }] : [],
        formatStreams: []
      }
      error.value = null
    }
  } finally {
    loading.value = false
  }
}

async function loadComments() {
  if (showComments.value) { showComments.value = false; return }
  showComments.value = true
  if (comments.value.length) return
  try { comments.value = await api.comments(route.params.id) }
  catch (e) { comments.value = [{ commentId: '_e', author: 'Error', content: String(e.message || e) }] }
}

onMounted(() => load(route.params.id))
watch(() => route.params.id, (id) => { if (id) load(id) })
</script>

<template>
  <div class="max-w-6xl mx-auto px-3 py-4">
    <div v-if="loading" class="text-muted text-sm py-12 text-center">Loading…</div>
    <div v-else-if="error && !video" class="text-red-400 text-sm py-12 text-center">{{ error }}</div>

    <div v-else-if="video">
      <div class="aspect-video bg-black rounded-xl overflow-hidden">
        <Player
          :video-id="isOffline ? null : route.params.id"
          :offline-video-id="isOffline ? route.params.id : null"
          :poster="poster"
        />
      </div>

      <h1 class="text-lg sm:text-xl font-semibold mt-3">{{ video.title }}</h1>

      <div class="flex flex-wrap items-center gap-3 mt-2 text-sm">
        <RouterLink :to="`/channel/${video.authorId}`" class="text-muted hover:text-white">
          {{ video.author }}
        </RouterLink>
        <span v-if="video.lengthSeconds" class="text-muted text-xs">
          {{ formatDuration(video.lengthSeconds) }}
        </span>

        <div class="ml-auto flex items-center gap-2">
          <span v-if="downloads.isActive(route.params.id)" class="text-xs text-accent">
            Downloading…
          </span>
          <span v-else-if="isOffline" class="text-xs text-green-400">
            ✓ Saved offline
          </span>
          <button
            v-else-if="video.formatStreams?.length"
            @click="showModal = true"
            class="h-9 px-4 rounded-full bg-accent hover:bg-accent/80 font-medium text-sm"
          >
            Download
          </button>
        </div>
      </div>

      <div
        v-if="video.description"
        class="mt-4 bg-surface rounded-xl p-4 text-sm whitespace-pre-wrap text-muted max-h-60 overflow-y-auto"
      >{{ video.description }}</div>

      <button
        @click="loadComments"
        class="mt-4 text-sm text-muted hover:text-white"
      >
        {{ showComments ? 'Hide comments' : 'Show comments' }}
      </button>

      <div v-if="showComments" class="mt-4 space-y-3">
        <div v-if="!comments.length" class="text-muted text-sm">No comments.</div>
        <div
          v-for="c in comments"
          :key="c.commentId"
          class="p-3 bg-surface rounded-lg"
        >
          <div class="text-sm font-medium">{{ c.author }}</div>
          <div class="text-xs text-muted mt-1 whitespace-pre-wrap">{{ c.content }}</div>
        </div>
      </div>
    </div>

    <DownloadModal
      v-if="showModal && video"
      :video="video"
      @close="showModal = false"
    />
  </div>
</template>
