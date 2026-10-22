<script setup>
import { useDownloadsStore } from '../stores/downloads'
import { formatBytes } from '../api/piped-client'

const props = defineProps({
  video: { type: Object, required: true }
})
const emit = defineEmits(['close'])
const downloads = useDownloadsStore()

const formats = (props.video.formatStreams || []).filter(f => {
  const t = (f.type || '').toLowerCase()
  const c = (f.container || '').toLowerCase()
  return t.includes('mp4') || c === 'mp4'
})

function pick(format) {
  downloads.start(props.video, format.url)
  emit('close')
}
</script>

<template>
  <div class="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" @click.self="$emit('close')">
    <div class="bg-surface rounded-xl p-4 max-w-md w-full border border-white/5">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-semibold">Choose quality</h2>
        <button @click="$emit('close')" class="text-muted hover:text-white text-xl leading-none">×</button>
      </div>
      <p class="text-xs text-muted mb-3 line-clamp-2">{{ video.title }}</p>
      <div v-if="!formats.length" class="text-sm text-muted py-6 text-center">
        No MP4 streams available.
      </div>
      <div class="space-y-2 max-h-80 overflow-y-auto">
        <button
          v-for="(f, i) in formats"
          :key="i"
          @click="pick(f)"
          class="w-full text-left px-3 py-2.5 rounded bg-surface-2 hover:bg-surface-3 flex items-center justify-between transition-colors"
        >
          <span class="text-sm font-medium">{{ f.qualityLabel || f.quality || f.resolution || 'unknown' }}</span>
          <span class="text-xs text-muted">
            {{ f.container || 'mp4' }}
            <template v-if="f.contentLength"> · {{ formatBytes(parseInt(f.contentLength, 10)) }}</template>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
