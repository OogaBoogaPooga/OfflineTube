<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import shaka from 'shaka-player/dist/shaka-player.compiled.js'

const props = defineProps({
  videoId: { type: String, default: null },
  offlineVideoId: { type: String, default: null },
  poster: { type: String, default: null },
  hasStream: { type: Boolean, default: true } // New prop to check if we have a direct MP4
})

const videoEl = ref(null)
const error = ref(null)
let player = null
let objectUrl = null

// If we don't have a direct stream, we use the YouTube iframe
const useIframe = computed(() => props.videoId && !props.offlineVideoId && !props.hasStream)

async function setupPlayer() {
  if (useIframe.value) return // Skip Shaka setup if using iframe
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
  }
}

onMounted(setupPlayer)
onBeforeUnmount(() => {
  if (player) player.destroy()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
})
</script>

<template>
  <div class="relative w-full h-full bg-black flex items-center justify-center">
    <!-- 1. Iframe Fallback -->
    <iframe 
      v-if="useIframe"
      :src="`https://www.youtube.com/embed/${videoId}?autoplay=1`"
      class="w-full h-full border-0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>

    <!-- 2. Standard Player -->
    <video
      v-else
      ref="videoEl"
      controls
      playsinline
      :poster="poster || undefined"
      class="w-full h-full"
    ></video>
    
    <div v-if="error" class="absolute inset-0 flex items-center justify-center text-red-400 p-4 text-center bg-black/80">
      {{ error }}
    </div>
  </div>
</template>
