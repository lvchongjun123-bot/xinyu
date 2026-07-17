import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const isDesktop = mode === 'desktop'
  const plugins = [vue()]
  // PWA only in web mode — desktop app runs locally, no offline caching needed
  if (!isDesktop) {
    plugins.push(VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'favicon.svg', 'icon.ico', 'icon-192x192.png', 'icon-512x512.png'],
      workbox: {
        globIgnores: ['**/ielts-*.js', '**/cet4-*.js', '**/cet6-*.js'],
        runtimeCaching: [{
          urlPattern: /^https:\/\/images\.pexels\.com\/.*/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'pexels-images',
            expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }
          }
        }, {
          urlPattern: /^.*\/(ielts|cet4|cet6)-.*\.js$/,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'word-data',
            expiration: { maxEntries: 10, maxAgeSeconds: 30 * 24 * 60 * 60 }
          }
        }]
      },
      manifest: {
        name: '语海求索 — 英语词汇学习',
        short_name: '语海求索',
        description: '高中英语词汇学习工具，支持高考/四级/六级/雅思词库，6种学习模式，FSRS自适应间隔重复',
        lang: 'zh-CN',
        theme_color: '#3b82f6',
        background_color: '#f0f4ff',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: 'icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }))
  }
  return {
    plugins,
    base: isDesktop ? '/' : '/xinyu/',
    resolve: { alias: { '@': '/src' } },
  }
})