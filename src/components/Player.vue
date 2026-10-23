<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import shaka from 'shaka-player/dist/shaka-player.compiled.js'

const props = defineProps({
  videoId: { type: String, default: null },
  offlineVideoId: { type: String, default: null },
  poster: { type: String, default: null }
})

const videoEl = ref(null)
const error = ref(null)
let player = null
let objectUrl = null

// Use the official YouTube iframe for all online videos to bypass IP blocks
const useIframe = computed(() => props.videoId && !props.offlineVideoId)

async function setupPlayer() {
  if (useIframe.value) return
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
    <!-- Official YouTube Iframe for online videos -->
    <iframe 
      v-if="useIframe"
      :src="`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`"
      class="w-full h-full border-0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>

    <!-- Shaka Player for offline videos -->
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
