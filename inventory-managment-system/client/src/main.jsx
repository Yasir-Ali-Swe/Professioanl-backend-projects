import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { TooltipProvider } from "@/components/ui/tooltip"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"

createRoot(document.getElementById('root')).render(
  <TooltipProvider>
    <BrowserRouter>
      <Toaster richColors position="top-right" />
      <App />
    </BrowserRouter>
  </TooltipProvider>
)
