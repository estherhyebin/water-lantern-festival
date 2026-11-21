import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const isSafari =
  /^((?!chrome|chromium|android|edg).)*safari/i.test(navigator.userAgent) ||
  (typeof CSS !== 'undefined' && CSS.supports('font: -apple-system-body') && !window.chrome)

if (isSafari) document.documentElement.classList.add('is-safari')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
