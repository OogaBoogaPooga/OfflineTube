<script setup>
import { ref, onMounted } from 'vue'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from './stores/library'
import DownloadToasts from './components/DownloadToasts.vue'

const library = useLibraryStore()
const route = useRoute()
const router = useRouter()
const q = ref('')

onMounted(() => library.refresh())

function doSearch() {
  if (!q.value.trim()) return
  router.push({ path: '/search', query: { q: q.value } })
}

const nav = [
  { to: '/',          label: 'Home' },
  { to: '/library',   label: 'Library' },
  { to: '/downloads', label: 'Downloads' },
  { to: '/settings',  label: 'Settings' }
]

function isActive(to) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg text-text">
    <header class="sticky top-0 z-30 bg-bg/95 backdrop-blur border-b border-white/5">
      <div class="max-w-7xl mx-auto flex items-center gap-3 px-3 h-14">
        <RouterLink to="/" class="flex items-center gap-2 font-bold shrink-0">
          <div class="w-8 h-8 rounded-md bg-accent flex items-center justify-center">
            <svg viewBox="0 0 24 24" class="w-5 h-5 text-white" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
          <span class="hidden sm:inline">Offline Tube</span>
        </RouterLink>

        <form @submit.prevent="doSearch" class="flex-1 max-w-xl mx-auto">
          <input
            v-model="q"
            type="search"
            placeholder="Search"
            class="w-full h-9 px-4 rounded-full bg-surface border border-white/10 focus:outline-none focus:border-white/30 text-sm"
          />
        </form>

        <nav class="flex items-center gap-0.5 shrink-0">
          <RouterLink
            v-for="n in nav"
            :key="n.to"
            :to="n.to"
            class="h-9 px-2.5 rounded-full flex items-center text-xs sm:text-sm transition-colors"
            :class="isActive(n.to) ? 'bg-surface text-white' : 'text-muted hover:text-white hover:bg-surface'"
          >
            {{ n.label }}
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <RouterView />
    </main>

    <DownloadToasts />
  </div>
</template>
