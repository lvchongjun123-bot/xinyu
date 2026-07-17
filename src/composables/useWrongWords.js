import { ref, computed, toValue, watch } from 'vue'

/**
 * 错题本 — 跨模块收集错误单词，支持复习
 *
 * 数据结构（localStorage per-user）：
 * {
 *   "gaokao": {
 *     "42": { word: "abandon", phonetic: "...", definition: "...",
 *             sentence: "...", sentence_cn: "...",
 *             wrongCount: 3, lastWrong: "2026-06-25", sources: ["typing", "flashcard"] }
 *   }
 * }
 */

const STORAGE_PREFIX = 'ev_wrong_words'

export function useWrongWords(userIdRef) {
  const data = ref({})

  function currentKey() {
    const uid = toValue(userIdRef)
    return uid ? `${STORAGE_PREFIX}_${uid}` : STORAGE_PREFIX
  }

  function load() {
    try {
      data.value = JSON.parse(localStorage.getItem(currentKey())) || {}
    } catch (e) {
      console.error('[WrongWords] 数据解析失败，已重置', e)
      data.value = {}
    }
  }

  load()

  // 用户切换时重新加载数据
  if (userIdRef) {
    watch(() => toValue(userIdRef), () => load())
  }

  function save() {
    try {
      localStorage.setItem(currentKey(), JSON.stringify(data.value))
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        window.__storage_full = true
        console.error('[WrongWords] localStorage 已满，错题数据保存失败')
      } else {
        console.error('[WrongWords] 数据保存失败', e)
      }
    }
  }

  /** 记录一个错词 */
  function recordWrong(bookId, wordObj, source = '') {
    if (!data.value[bookId]) data.value[bookId] = {}
    const entry = data.value[bookId]

    const wid = String(wordObj.id)
    if (entry[wid]) {
      entry[wid].wrongCount++
      entry[wid].lastWrong = new Date().toISOString().slice(0, 10)
      if (source && !entry[wid].sources.includes(source)) {
        entry[wid].sources.push(source)
      }
    } else {
      entry[wid] = {
        word: wordObj.word || '',
        phonetic: wordObj.phonetic || '',
        definition: wordObj.definition || '',
        sentence: wordObj.sentence || '',
        sentence_cn: wordObj.sentence_cn || '',
        wrongCount: 1,
        lastWrong: new Date().toISOString().slice(0, 10),
        sources: source ? [source] : []
      }
    }
    save()
  }

  /** 批量记录错词 */
  function recordWrongBatch(bookId, wordObjs, source = '') {
    for (const w of wordObjs) {
      recordWrong(bookId, w, source)
    }
  }

  /** 移除错词（掌握后清除） */
  function removeWrong(bookId, wordId) {
    if (!data.value[bookId]) return
    delete data.value[bookId][String(wordId)]
    save()
  }

  /** 清空某词库所有错词 */
  function clearWrong(bookId) {
    data.value[bookId] = {}
    save()
  }

  /** 获取错词数量 */
  function getWrongCount(bookId) {
    return data.value[bookId] ? Object.keys(data.value[bookId]).length : 0
  }

  /** 获取错词列表（按错误次数降序） */
  function getWrongList(bookId) {
    const entries = data.value[bookId] || {}
    return Object.entries(entries)
      .map(([id, info]) => ({ id: Number(id), ...info }))
      .sort((a, b) => b.wrongCount - a.wrongCount)
  }

  /** 移除指定数组中的所有错词（用于复习完成后批量清除） */
  function removeWrongBatch(bookId, wordIds) {
    if (!data.value[bookId]) return
    for (const wid of wordIds) {
      delete data.value[bookId][String(wid)]
    }
    save()
  }

  return {
    data,
    load,
    recordWrong,
    recordWrongBatch,
    removeWrong,
    removeWrongBatch,
    clearWrong,
    getWrongCount,
    getWrongList
  }
}
