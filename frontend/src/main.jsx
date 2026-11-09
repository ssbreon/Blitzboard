/*
 * Blitzboard Studio
 * Copyright (c) 2027 Breon Technologies LLC
 * All Rights Reserved
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { enableDraggableDialogs } from './utils/draggableDialogs'
import { initializeAuthentication } from './api/client'

enableDraggableDialogs()

initializeAuthentication().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
