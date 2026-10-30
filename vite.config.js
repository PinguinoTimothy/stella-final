import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// base './' lets the build work from any folder (GitHub Pages, Netlify, a subpath…)
export default defineConfig({
  base: './',
  plugins: [vue()],
  test: { environment: 'jsdom', globals: true },
})
