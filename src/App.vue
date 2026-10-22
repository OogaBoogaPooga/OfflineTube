<script setup>
import { ref, onMounted } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from './stores/library'
import DownloadToasts from './components/DownloadToasts.vue'
import Sidebar from './components/Sidebar.vue'

const library = useLibraryStore()
const route = useRoute()
const router = useRouter()
const q = ref('')

onMounted(() => library.refresh())

function doSearch() {
  if (!q.value.trim()) return
  router.push({ path: '/search', query: { q: q.value } })
}
</script>

<template>
  <div class="min-h-screen flex bg-bg text-text">
    <Sidebar />
    <div class="flex-1 ml-60 flex flex-col min-h-screen">
      <header class="sticky top-0 z-30 bg-bg/95 backdrop-blur h-14 flex items-center px-6 border-b border-white/5">
        <form @submit.prevent="doSearch" class="flex-1 max-w-2xl mx-auto">
          <input
            v-model="q"
            type="search"
            placeholder="Search / Go to URL"
            class="w-full h-9 px-4 rounded-full bg-surface border border-white/10 focus:outline-none focus:border-white/30 text-sm"
          />
        </form>
      </header>
      <main class="flex-1 p-6">
        <RouterView />
      </main>
    </div>
    <DownloadToasts />
  </div>
</template>
