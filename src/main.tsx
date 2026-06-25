import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProvider } from './store/AppContext'
import App from './App'
import './styles/global.css'
import { applyTheme, watchSystemTheme } from './lib/theme'

applyTheme()
watchSystemTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
)
