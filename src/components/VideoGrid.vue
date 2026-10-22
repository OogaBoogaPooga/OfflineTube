<script setup>
import VideoCard from './VideoCard.vue'
defineProps({ videos: { type: Array, default: () => [] } })
</script>

<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6">
    <VideoCard v-for="v in videos" :key="v.videoId" :video="v" />
  </div>
</template>
