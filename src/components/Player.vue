<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import shaka from 'shaka-player/dist/shaka-player.compiled.js'

const props = defineProps({
  src:             { type: String, default: null },
  offlineVideoId:  { type: String, default: null },
  poster:          { type: String, default: null }
})

const videoEl = ref(null)
const error   = ref(null)
const ready   = ref(false)

let player    = null
let objectUrl = null
let destroyed = false

async function setupPlayer() {
  if (!videoEl.value) return
  destroyed = false
  error.value = null

  shaka.polyfill.installAll()
  if (!shaka.Player.isBrowserSupported()) {
    error.value = 'Browser not supported by shaka-player.'
    return
  }

  player = new shaka.Player()
  player.addEventListener('error', (e) => {
    error.value = e.detail?.message || e.detail?.code || 'Playback error'
  })

  try {
    await player.attach(videoEl.value)
  } catch (e) {
    error.value = `Attach failed: ${e.message || e}`
    return
  }

  player.configure({
    streaming: { rebufferingGoal: 5, bufferingGoal: 20 },
    manifest: { retryParameters: { maxAttempts: 2 } }
  })

  await loadSource()
}

async function loadSource() {
  if (!player) return
  let url = props.src
  let mime

  if (props.offlineVideoId) {
    try {
      const { assembleBlob } = await import('../db')
      const blob = await assembleBlob(props.offlineVideoId)
      if (destroyed) return
      if (blob.size === 0) throw new Error('Empty offline file')
      objectUrl = URL.createObjectURL(blob)
      url = objectUrl
      mime = 'video/mp4'
    } catch (e) {
      error.value = `Offline load failed: ${e.message || e}`
      return
    }
  } else if (url) {
    mime = 'video/mp4'
  }

  if (!url) return

  try {
    await player.load(url, undefined, mime)
    ready.value = true
  } catch (e) {
    error.value = e.message || String(e)
  }
}

onMounted(setupPlayer)

onBeforeUnmount(() => {
  destroyed = true
  try { player?.destroy() } catch { /* noop */ }
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
})

watch(
  () => [props.src, props.offlineVideoId],
  async () => {
    ready.value = false
    try { player?.unload() } catch { /* noop */ }
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null }
    await loadSource()
  }
)
</script>

<template>
  <div class="relative w-full h-full bg-black flex items-center justify-center">
    <video
      ref="videoEl"
      controls
      playsinline
      :poster="poster || undefined"
      class="w-full h-full"
    ></video>
    <div
      v-if="error"
      class="absolute inset-0 flex items-center justify-center bg-black/80 text-center p-4"
    >
      <p class="text-red-400 text-sm">{{ error }}</p>
    </div>
  </div>
</template>
