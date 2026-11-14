import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // `WEB_ORIGIN` of the api names this port; a busy port fails the start instead of moving to the next one.
  server: { port: 5173, strictPort: true },
  // React Compiler runs through Babel: the Rust port in `@vitejs/plugin-react` is experimental.
  plugins: [tanstackStart(), viteReact(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
})
