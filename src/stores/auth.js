import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isLoggedIn: false,
    user: null,
  }),
  actions: {
    login() {
      alert("To enable real YouTube OAuth, we need a backend to securely handle the token exchange. For now, enjoy the anonymous feed!")
    }
  }
})
