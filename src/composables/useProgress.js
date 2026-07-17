import { ref, watch, toValue } from 'vue'

const STORAGE_PREFIX = 'ev_mastered_v2_'

/**
 * 单词掌握状态管理（book 级别，不再依赖 unitId）
 *
 * v2: 合并为单个 JSON blob 存储，替代逐词 localStorage key
 *
 * @param {import('vue').Ref<string>} bookId - 词库 ID ref
 * @param {import('vue').Ref<Array>} words - 单词列表 ref
 * @param {import('vue').Ref<string|null>} userIdRef - 用户 ID ref（可选）
 */
export function useProgress(bookId, words, userIdRef) {
  const masteredMap = ref({})

  /** 单 book 的存储 key */
  function bookKey(bookIdVal) {
    const uid = toValue(userIdRef)
    if (uid) {
      return `${STORAGE_PREFIX}${uid}_${bookIdVal}`
    }
    return `${STORAGE_PREFIX}${bookIdVal}`
  }

  /** 旧版逐词 key（用于迁移） */
  function legacyWordKey(bookIdVal, wordId) {
    const uid = toValue(userIdRef)
    if (uid) {
      return `${STORAGE_PREFIX}${uid}_${bookIdVal}_${wordId}`
    }
    return `${STORAGE_PREFIX}${bookIdVal}_${wordId}`
  }

  /** 尝试从旧格式迁移到新格式（迁移后写 flag 避免重复扫描） */
  function migrateIfNeeded(bid, ws) {
    try {
      const bk = bookKey(bid)
      // 新格式已存在或迁移已完成，跳过
      if (localStorage.getItem(bk)) return
      const migratedFlag = `${bk}_migrated`
      if (localStorage.getItem(migratedFlag)) return

      // 检查是否存在旧格式数据
      const map = {}
      let hasLegacy = false
      for (const w of ws) {
        const val = localStorage.getItem(legacyWordKey(bid, w.id))
        if (val !== null) {
          map[w.id] = val === 'true'
          hasLegacy = true
        }
      }
      if (hasLegacy) {
        // 写入新格式
        localStorage.setItem(bk, JSON.stringify(map))
        // 删除旧 key
        for (const w of ws) {
          localStorage.removeItem(legacyWordKey(bid, w.id))
        }
      }
      // 无论是否找到旧数据，标记迁移已完成
      localStorage.setItem(migratedFlag, '1')
    } catch (e) {
      console.error('[Progress] 迁移失败，跳过', e)
      // ponytail: migration failure is non-fatal — retry on next load
    }
  }

  function loadMastered() {
    const bid = toValue(bookId)
    const ws = toValue(words)
    if (!bid || !ws) return

    // 首次加载时尝试迁移
    migrateIfNeeded(bid, ws)

    // 从新格式加载
    const raw = localStorage.getItem(bookKey(bid))
    let data = {}
    try { if (raw) data = JSON.parse(raw) } catch (e) { console.error('[Progress] 数据解析失败', e) }
    const map = {}
    for (const w of ws) {
      map[w.id] = data[w.id] === true
    }
    masteredMap.value = map
  }

  function toggleMaster(wordId) {
    // ponytail: in-memory source of truth, debounced write to avoid double-click race
    masteredMap.value = { ...masteredMap.value, [wordId]: !masteredMap.value[wordId] }
  }

  // Debounced persistence — writes masteredMap to localStorage after changes settle
  let _persistTimer = null
  function persistMastered() {
    const bid = toValue(bookId)
    if (!bid) return
    const bk = bookKey(bid)
    try {
      localStorage.setItem(bk, JSON.stringify(masteredMap.value))
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        window.__storage_full = true
        console.error('[Progress] localStorage 已满')
      }
    }
  }
  watch(masteredMap, () => {
    clearTimeout(_persistTimer)
    _persistTimer = setTimeout(persistMastered, 300)
  }, { deep: true })

  // 监听 bookId 和 words 变化（userId 变化也触发 reload）
  watch([bookId, words, () => toValue(userIdRef)], loadMastered, { immediate: true })

  return { masteredMap, toggleMaster, loadMastered }
}
