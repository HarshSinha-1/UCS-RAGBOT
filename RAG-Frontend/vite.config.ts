import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    sourcemap: false, // avoid any source maps that use eval
  },
  server: {
    // optional, but you can disable HMR if needed
    hmr: {
      overlay: false
    }
  }
})
