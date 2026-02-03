import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import rollbar from './lib/rollbar'

// Capturar erros globais não tratados
window.addEventListener('error', (event) => {
  if (import.meta.env.PROD) {
    rollbar.error(event.error || event.message, {
      type: 'unhandled_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  }
});

// Capturar promises rejeitadas não tratadas
window.addEventListener('unhandledrejection', (event) => {
  if (import.meta.env.PROD) {
    rollbar.error('Unhandled Promise Rejection', {
      type: 'unhandled_rejection',
      reason: event.reason,
    });
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
