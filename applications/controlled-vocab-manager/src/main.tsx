import { ThemeProvider } from 'next-themes'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './globals.css'
import { I18nextProvider } from "react-i18next"
import { i18nConfig } from './i18n.ts'
import { TooltipProvider } from './components/ui/tooltip.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute='class'>
      <I18nextProvider i18n={i18nConfig} defaultNS={'default'}>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </I18nextProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
