<script setup>
import { computed } from 'vue'
import { bestThumbnail, formatDuration } from '../api/invidious'

const props = defineProps({
  video: { type: Object, required: true }
})

const thumb = computed(() => bestThumbnail(props.video))
const duration = computed(() => props.video.lengthSeconds ? formatDuration(props.video.lengthSeconds) : null)
const authorName = computed(() => props.video.author || props.video.authorName || '')
</script>

<template>
  <RouterLink :to="`/watch/${video.videoId}`" class="block group">
    <div class="relative aspect-video bg-surface rounded-xl overflow-hidden">
      <img
        v-if="thumb"
        :src="thumb.url"
        :alt="video.title"
        loading="lazy"
        class="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
      />
      <span
        v-if="duration"
        class="absolute bottom-1.5 right-1.5 bg-black/80 text-[11px] px-1.5 py-0.5 rounded"
      >{{ duration }}</span>
    </div>
    <div class="mt-2 min-w-0">
      <h3 class="font-medium text-sm line-clamp-2 group-hover:text-white">{{ video.title }}</h3>
      <p v-if="authorName" class="text-xs text-muted mt-1 truncate">{{ authorName }}</p>
    </div>
  </RouterLink>
</template>
