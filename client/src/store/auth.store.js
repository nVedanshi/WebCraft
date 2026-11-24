import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * AuthStore — client-side authentication state (Zustand).
 *
 * Holds the current user and access token. Persisted to localStorage so the
 * session survives page reloads. The access token is also mirrored into the
 * axios client so every API request is authenticated.
 *
 * State shape:
 *   { user: { id, email, name, ... } | null, accessToken: string | null }
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,

      setSession: (user, accessToken) => {
        set({ user, accessToken })
      },

      clearSession: () => {
        set({ user: null, accessToken: null })
        localStorage.removeItem('wc_access_token')
        localStorage.removeItem('wc_refresh_token')
      },
    }),
    {
      name: 'wc-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken }),
    }
  )
)

export default useAuthStore
