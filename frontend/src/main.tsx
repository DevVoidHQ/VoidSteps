import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App.tsx'
import { applyFontScale } from './lib/preferences'
import './index.css'

// Before first paint, or the app renders at the default size and visibly
// jumps once React mounts.
applyFontScale()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
