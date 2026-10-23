<script setup>
import { useAuthStore } from '../stores/auth'
defineProps({ title: { type: String, required: true } })
const auth = useAuthStore()
</script>

<template>
  <div class="flex flex-col items-center justify-center h-[70vh] text-center px-4">
    <div class="w-24 h-24 bg-surface rounded-full flex items-center justify-center mb-6 shadow-lg">
      <svg viewBox="0 0 24 24" class="w-12 h-12 fill-accent"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
    </div>
    <h1 class="text-3xl font-bold mb-3">{{ title }}</h1>
    <p class="text-muted max-w-md mb-8">
      To see your personal {{ title.toLowerCase() }}, you need to log in with your YouTube account.
    </p>
    <button @click="auth.login()" class="px-6 py-3 rounded-full bg-accent text-white font-bold hover:bg-red-700 transition-colors shadow-lg">
      Log In to YouTube
    </button>
  </div>
</template>
