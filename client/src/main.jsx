import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import useThemeStore from './store/theme.store.js'

// Apply the persisted theme (or the default) on first paint, before React
// renders, so there is no flash of the wrong theme.
useThemeStore.getState().setTheme(useThemeStore.getState().theme)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      refetchOnWindowFocus: false,
    },
  },
})

// Lazy-load the boot-time reveal so it doesn't block the initial bundle.
const ScissorReveal = React.lazy(() => import('./components/motion/ScissorReveal.jsx'))

function AppWithReveal() {
  return (
    <>
      <React.Suspense fallback={null}>
        <ScissorReveal />
      </React.Suspense>
      <App />
    </>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppWithReveal />
    </QueryClientProvider>
  </React.StrictMode>
)
