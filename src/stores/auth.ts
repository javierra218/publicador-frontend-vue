import { defineStore } from 'pinia'

import { fetchCurrentStrapiUser, loginWithStrapi } from '@/services/auth'
import {
  clearStoredAuthSession,
  isFrontendAdminUser,
  readStoredAuthToken,
  readStoredAuthUser,
  writeStoredAuthSession,
  type AuthUser,
} from '@/utils/auth-storage'

type AuthState = {
  jwt: string
  user: AuthUser | null
  hydrated: boolean
  sessionChecked: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    jwt: '',
    user: null,
    hydrated: false,
    sessionChecked: false,
  }),

  getters: {
    isAuthenticated: (state) => Boolean(state.jwt && state.user),
    isFrontendAdmin: (state) => isFrontendAdminUser(state.user),
  },

  actions: {
    hydrate() {
      if (this.hydrated) {
        return
      }

      this.jwt = readStoredAuthToken()
      this.user = readStoredAuthUser()
      this.hydrated = true
      this.sessionChecked = false
    },

    async ensureSession(): Promise<boolean> {
      this.hydrate()

      if (!this.jwt) {
        this.user = null
        this.sessionChecked = true
        return false
      }

      if (this.sessionChecked && this.user?.role) {
        return true
      }

      try {
        const currentUser = await fetchCurrentStrapiUser()
        this.user = currentUser
        this.sessionChecked = true
        writeStoredAuthSession(this.jwt, currentUser)
        return true
      } catch {
        this.logout()
        return false
      }
    },

    async login(identifier: string, password: string): Promise<void> {
      const session = await loginWithStrapi(identifier, password)

      this.jwt = session.jwt
      this.user = session.user
      this.hydrated = true
      this.sessionChecked = true
      writeStoredAuthSession(session.jwt, session.user)
    },

    logout() {
      this.jwt = ''
      this.user = null
      this.hydrated = true
      this.sessionChecked = true
      clearStoredAuthSession()
    },
  },
})
