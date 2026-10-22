import { defineStore } from 'pinia'

export const DEFAULT_INSTANCE = 'https://invidious.f5.si'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    instanceUrl: localStorage.getItem('ot.instanceUrl') || DEFAULT_INSTANCE,
    defaultQuality: localStorage.getItem('ot.defaultQuality') || 'highest'
  }),
  actions: {
    setInstance(url) {
      const clean = (url || '').trim().replace(/\/+$/, '')
      if (!/^https?:\/\//i.test(clean)) return false
      this.instanceUrl = clean
      localStorage.setItem('ot.instanceUrl', clean)
      return true
    },
    setQuality(q) {
      this.defaultQuality = q
      localStorage.setItem('ot.defaultQuality', q)
    }
  }
})
