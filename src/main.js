import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

// 全局 toast
window._showToast = (msg, dur = 2500) => {
  const el = document.createElement('div')
  el.className = 'app-toast'
  el.textContent = msg
  document.body.appendChild(el)
  requestAnimationFrame(() => el.classList.add('show'))
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300) }, dur)
}

const app = createApp(App)
app.use(createPinia())

// Error boundary — non-destructive overlay, doesn't replace entire UI
app.config.errorHandler = (err) => {
  console.error('[App Crashed]', err)
  // ponytail: dismissible banner, not body-replacing — user can still navigate
  const existing = document.getElementById('app-crash-banner')
  if (existing) existing.remove()
  const el = document.createElement('div')
  el.id = 'app-crash-banner'
  el.style.cssText = 'position:fixed;top:12px;left:50%;transform:translateX(-50%);max-width:720px;width:calc(100%-24px);padding:14px 18px;color:#dc2626;background:var(--card,#fff);border:1px solid var(--destructive,#dc2626);border-radius:var(--radius-lg,12px);font-family:monospace;font-size:12px;white-space:pre-wrap;z-index:99999;box-shadow:var(--shadow-lg)'
  el.innerHTML = '<strong>App Error</strong> <button onclick="this.parentElement.remove()" style="float:right;background:none;border:none;cursor:pointer;font-size:16px;color:var(--muted)">&times;</button><pre style="margin-top:6px;max-height:200px;overflow:auto"></pre>'
  el.querySelector('pre').textContent = err?.message || String(err)
  document.body.appendChild(el)
}

// Global handlers for errors Vue's errorHandler doesn't catch (event handlers, promises)
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Rejection]', event.reason)
  window._showToast('操作失败，请重试')
})

window.onerror = (message, source, lineno, colno, error) => {
  console.error('[Global Error]', { message, source, lineno, error })
  window._showToast('操作异常，请刷新后重试')
  return true
}

// PWA: capture install prompt event for app-controlled install flow
window._installPWA = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window._installPWA = e
})

// PWA: notify user when a new version is available (registerType: 'prompt')
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          window._showToast('新版本可用，刷新页面即可更新', 5000)
        }
      })
    })
  })
}

app.mount('#app')