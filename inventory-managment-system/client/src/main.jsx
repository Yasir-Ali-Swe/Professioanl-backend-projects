import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { TooltipProvider } from "@/components/ui/tooltip"
import { BrowserRouter } from "react-router-dom"
import { Toaster } from "@/components/ui/sonner"
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from "./store/index.js";
import { ThemeProvider } from "@/components/ThemeProvider.jsx";

createRoot(document.getElementById('root')).render(
  <TooltipProvider>
    <BrowserRouter>
      <Toaster richColors position="bottom-right" />
      <Provider store={store}>
        <ThemeProvider defaultTheme="light" storageKey="stockpilot-theme">
          <App />
        </ThemeProvider>
      </Provider>
    </BrowserRouter>
  </TooltipProvider>
)
