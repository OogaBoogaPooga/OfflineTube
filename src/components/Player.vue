<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import shaka from 'shaka-player/dist/shaka-player.compiled.js'
import { Innertube } from 'youtubei.js'

const props = defineProps({
  videoId: { type: String, default: null },
  offlineVideoId: { type: String, default: null },
  poster: { type: String, default: null }
})

const videoEl = ref(null)
const error = ref(null)
let player = null
let objectUrl = null

async function setupPlayer() {
  if (!videoEl.value) return
  shaka.polyfill.installAll()
  player = new shaka.Player()
  player.attach(videoEl.value)

  if (props.offlineVideoId) {
    try {
      const { assembleBlob } = await import('../db')
      const blob = await assembleBlob(props.offlineVideoId)
      objectUrl = URL.createObjectURL(blob)
      await player.load(objectUrl, undefined, 'video/mp4')
    } catch (e) {
      error.value = `Offline load failed: ${e.message}`
    }
  } else if (props.videoId) {
    try {
      const yt = await Innertube.create({
        fetch: async (input, init) => {
          const url = typeof input === 'string' ? input : input.url
          return fetch(`/api/proxy?url=${encodeURIComponent(url)}`, init)
        },
      })
      const info = await yt.getInfo(props.videoId)
      const manifest = await info.toDash(url => `/api/proxy?url=${encodeURIComponent(url)}`)
      
      // Create blob URL for the DASH manifest
      const manifestBlob = new Blob([manifest], { type: 'application/dash+xml' })
      const manifestUrl = URL.createObjectURL(manifestBlob)
      
      await player.load(manifestUrl)
    } catch (e) {
      error.value = e.message || 'Playback failed'
    }
  }
}

onMounted(setupPlayer)
onBeforeUnmount(() => {
  if (player) player.destroy()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
})
</script>

<template>
  <div class="relative w-full h-full bg-black">
    <video ref="videoEl" controls playsinline :poster="poster || undefined" class="w-full h-full"></video>
    <div v-if="error" class="absolute inset-0 flex items-center justify-center text-red-400 p-4 text-center bg-black/80">
      {{ error }}
    </div>
  </div>
</template>
