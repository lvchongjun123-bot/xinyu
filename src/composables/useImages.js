import { ref } from 'vue'

/**
 * Pexels 图片搜索 composable
 *
 * 功能：
 * - 根据单词搜索关联图片
 * - 本地缓存避免重复请求
 * - 200次/小时免费额度
 *
 * 用法：
 *   const { getImage, imageCache } = useImages()
 *   const url = await getImage('apple')
 */
export function useImages() {
  const API_KEY = import.meta.env.VITE_PEXELS_API_KEY
  const BASE_URL = 'https://api.pexels.com/v1/search'

  // 本地缓存：{ 'apple': 'https://...jpg' }
  const imageCache = ref({})
  const loadingMap = ref({})    // 正在加载中的单词
  const errorCount = ref(0)

  // 尝试从 localStorage 恢复缓存
  try {
    const saved = localStorage.getItem('ev_image_cache')
    if (saved) imageCache.value = JSON.parse(saved)
  } catch (e) { console.error('[Images] 缓存读取失败', e) }

  function saveCache() {
    try {
      // 限制缓存大小（最多存 500 个 URL）
      const entries = Object.entries(imageCache.value)
      if (entries.length > 500) {
        const trimmed = entries.slice(-500)
        imageCache.value = Object.fromEntries(trimmed)
      }
      localStorage.setItem('ev_image_cache', JSON.stringify(imageCache.value))
    } catch (e) { console.error('[Images] 缓存读取失败', e) }
  }

  /**
   * 获取单词对应的图片 URL
   * @param {string} word - 英文单词
   * @returns {Promise<string|null>} 图片 URL 或 null
   */
  async function getImage(word) {
    if (!API_KEY || API_KEY === 'your_api_key_here') return null

    // 命中缓存
    if (imageCache.value[word]) return imageCache.value[word]

    // 正在加载中，防重复请求
    if (loadingMap.value[word]) return null

    loadingMap.value[word] = true
    try {
      const params = new URLSearchParams({
        query: word,
        per_page: '1',
        orientation: 'square',
        size: 'small'
      })

      const res = await fetch(`${BASE_URL}?${params}`, {
        headers: { Authorization: API_KEY },
        signal: AbortSignal.timeout(8000)
      })

      if (!res.ok) {
        if (res.status === 429) errorCount.value++
        return null
      }

      const data = await res.json()
      const url = data.photos?.[0]?.src?.small || null

      if (url) {
        imageCache.value[word] = url
        saveCache()
      }
      return url
    } catch (e) {
      console.warn('Pexels 图片获取失败:', e.message)
      return null
    } finally {
      loadingMap.value[word] = false
    }
  }

  /**
   * 批量预加载图片（可选，用于当前单元全部单词）
   */
  async function preloadImages(words, delay = 1000) {
    for (const w of words) {
      if (imageCache.value[w.word]) continue
      await getImage(w.word)
      // 请求间隔，避免触发限流
      await new Promise(r => setTimeout(r, delay))
    }
  }

  return { imageCache, getImage, preloadImages, errorCount }
}
