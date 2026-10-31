import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// base './' lets the build work from any folder (Cloudflare Pages, GitHub Pages, a subpath…)
export default defineConfig({
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate', // new version downloads in the background and applies on next open
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Que si quesito que si',
        short_name: 'PF1e',
        description: 'Pathfinder 1e: hechizos, objetos, efectos y party',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#21182b',
        theme_color: '#21182b',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          // Supabase (login, sync, spell catalog) always goes to the network: never serve stale game data.
          { urlPattern: /^https:\/\/[^/]+\.supabase\.co\//, handler: 'NetworkOnly' },
          // Google Fonts: cached so the app keeps its look offline.
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'gfonts-css' } },
          { urlPattern: /^https:\/\/fonts\.gstatic\.com\//, handler: 'CacheFirst', options: { cacheName: 'gfonts-files', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } } },
        ],
      },
    }),
  ],
  test: { environment: 'jsdom', globals: true },
})
