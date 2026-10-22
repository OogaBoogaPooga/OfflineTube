import { defineStore } from 'pinia'
import { db, deleteVideo } from '../db'

export const useLibraryStore = defineStore('library', {
  state: () => ({ videos: [], loading: false }),
  getters: {
    complete: (s) => s.videos.filter(v => v.status === 'complete')
  },
  actions: {
    async refresh() {
      this.loading = true
      try {
        this.videos = await db.videos.orderBy('addedAt').reverse().toArray()
      } finally {
        this.loading = false
      }
    },
    isComplete(id) {
      return this.videos.some(v => v.id === id && v.status === 'complete')
    },
    async remove(id) {
      await deleteVideo(id)
      this.videos = this.videos.filter(v => v.id !== id)
    }
  }
})
