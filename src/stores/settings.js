import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    defaultQuality: localStorage.getItem('ot.defaultQuality') || 'highest'
  }),
  actions: {
    setQuality(q) {
      this.defaultQuality = q
      localStorage.setItem('ot.defaultQuality', q)
    }
  }
})
