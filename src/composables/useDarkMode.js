import { ref, watch } from 'vue'

export function useDarkMode() {
  const stored = localStorage.getItem('darkMode')
  const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  const dark = ref(stored !== null ? stored === 'true' : prefersDark)

  watch(dark, (val) => {
    try {
      localStorage.setItem('darkMode', String(val))
    } catch (e) {
      if (e.name === 'QuotaExceededError') window.__storage_full = true
    }
  })

  return { dark }
}
