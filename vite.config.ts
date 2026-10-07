import { defineConfig } from 'vite'

// Two pages: the site, and the player page the snippet frames.
export default defineConfig({
  build: {
    rollupOptions: {
      input: { main: 'index.html', h5p: 'h5p.html' }
    }
  }
})
