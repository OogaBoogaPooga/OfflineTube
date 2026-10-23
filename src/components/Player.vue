<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import shaka from 'shaka-player/dist/shaka-player.compiled.js'

const props = defineProps({
  videoId: { type: String, default: null },
  offlineVideoId: { type: String, default: null },
  poster: { type: String, default: null },
  hasStream: { type: Boolean, default: true }
})

const videoEl = ref(null)
const error = ref(null)
const forceIframe = ref(false)

let player = null
let objectUrl = null

const useIframe = computed(() => {
  if (props.offlineVideoId) return false;
  if (forceIframe.value) return true;
  return props.videoId && !props.hasStream;
})

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

// Watch for changes to reset the iframe fallback
watch(() => props.videoId, () => {
  forceIframe.value = false
  error.value = null
})

onMounted(setupPlayer)
onBeforeUnmount(() => {
  if (player) player.destroy()
  if (objectUrl) URL.revokeObjectURL(objectUrl)
})
</script>

<template>
  <div class="relative w-full h-full bg-black flex items-center justify-center">
    <!-- Iframe Fallback -->
    <iframe 
      v-if="useIframe"
      :src="`https://www.youtube.com/embed/${videoId}?autoplay=1`"
      class="w-full h-full border-0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>

    <!-- Standard Player -->
    <video
      v-else
      ref="videoEl"
      controls
      playsinline
      :poster="poster || undefined"
      class="w-full h-full"
      @error="forceIframe = true"
    ></video>
    
    <div v-if="error" class="absolute inset-0 flex items-center justify-center text-red-400 p-4 text-center bg-black/80">
      {{ error }}
    </div>
  </div>
</template>
