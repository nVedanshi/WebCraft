import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * ThemeStore — manages dark/light/system theme.
 *
 * Persists the user's theme preference to localStorage so it survives
 * session restarts. Applies the theme to the document on mount.
 *
 * Theme options:
 *   - 'dark'   - always dark
 *   - 'light'  - always light
 *   - 'system' - follows system preference
 */
export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',

      setTheme: (theme) => {
        set({ theme })
        applyTheme(theme)
      },

      toggleTheme: () => {
        const current = get().theme
        const next = current === 'dark' ? 'light' : 'dark'
        set({ theme: next })
        applyTheme(next)
      },
    }),
    {
      name: 'wc-theme',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
)

function applyTheme(theme) {
  const root = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    root.classList.toggle('dark', prefersDark)
  } else {
    root.setAttribute('data-theme', theme)
    root.classList.toggle('dark', theme === 'dark')
  }
}

export default useThemeStore