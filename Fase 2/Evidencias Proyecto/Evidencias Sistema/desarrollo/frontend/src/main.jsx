import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { SesionProvider } from './sesion/SesionContext.jsx'
import TemaProvider from './tema/TemaProvider.jsx'
import './index.css'
import './tema-oscuro.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SesionProvider>
        <TemaProvider>
          <App />
        </TemaProvider>
      </SesionProvider>
    </BrowserRouter>
  </StrictMode>,
)
