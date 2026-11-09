import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // `WEB_ORIGIN` of the api names this port; a busy port fails the start instead of moving to the next one.
  server: { port: 5173, strictPort: true },
  plugins: [tanstackStart(), viteReact(), tailwindcss()],
})
