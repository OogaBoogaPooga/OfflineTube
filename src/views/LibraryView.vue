<script setup>
import { onMounted } from 'vue'
import { useLibraryStore } from '../stores/library'
import { formatBytes } from '../api/piped-client'

const library = useLibraryStore()
onMounted(() => library.refresh())

async function remove(id) {
  if (confirm('Delete this download?')) await library.remove(id)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-3 py-4">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-xl font-semibold">Library</h1>
      <span class="text-xs text-muted">{{ library.complete.length }} saved</span>
    </div>

    <div v-if="library.loading" class="text-muted text-sm py-12 text-center">Loading…</div>

    <div v-else-if="!library.complete.length" class="text-muted text-sm py-12 text-center">
      No offline videos yet. Download one to play without internet.
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="v in library.complete" :key="v.id" class="bg-surface rounded-lg overflow-hidden">
        <RouterLink :to="`/watch/${v.id}`">
          <div class="aspect-video bg-surface-2">
            <img v-if="v.thumbnail" :src="v.thumbnail" class="w-full h-full object-cover" alt="" />
          </div>
        </RouterLink>
        <div class="p-3">
          <div class="font-medium text-sm line-clamp-2">{{ v.title }}</div>
          <div class="text-xs text-muted mt-1">{{ v.author }}</div>
          <div class="flex items-center justify-between mt-2">
            <span class="text-[11px] text-muted">{{ formatBytes(v.size) }}</span>
            <button
              @click="remove(v.id)"
              class="text-xs text-red-400 hover:text-red-300"
            >Delete</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
