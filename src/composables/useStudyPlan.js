import { ref, watch, toValue } from 'vue'
import { Card, FSRS } from 'fsrs.js'

const STORAGE_KEY = 'ev_study_plan'

/** 返回今日日期字符串 YYYY-MM-DD */
function today() {
  return new Date().toISOString().slice(0, 10)
}

/** 日期加 N 天 */
function addDays(dateStr, n) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// ===== FSRS 调度器（单例）=====
let _fsrs = null
function getFSRS() {
  if (!_fsrs) _fsrs = new FSRS({})
  return _fsrs
}

/**
 * 从存储记录重建 FSRS Card
 * - 有 fsrs_due 字段 → 从已保存的 FSRS 状态重建
 * - 无 fsrs_due 字段 → 旧格式或新词，返回全新 Card
 */
function cardFromRecord(record) {
  if (record?.fsrs_due != null) {
    return new Card({
      due: record.fsrs_due,
      stability: record.fsrs_stability ?? 0,
      difficulty: record.fsrs_difficulty ?? 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: record.fsrs_reps ?? 0,
      lapses: record.fsrs_lapses ?? 0,
      state: record.fsrs_state ?? 0,
      last_review: record.fsrs_last_review ?? new Date().toISOString(),
    })
  }
  // 旧格式或新词：用全新 Card，FSRS 会渐进适配
  return new Card()
}

/** 将 FSRS Card 状态写回记录 */
function saveCardToRecord(record, card) {
  record.fsrs_due = typeof card.due === 'string' ? card.due : card.due.toISOString()
  record.fsrs_stability = card.stability
  record.fsrs_difficulty = card.difficulty
  record.fsrs_reps = card.reps
  record.fsrs_lapses = card.lapses
  record.fsrs_state = card.state
  record.fsrs_last_review = typeof card.last_review === 'string'
    ? card.last_review
    : card.last_review.toISOString()
  // nextReview 保持日期字符串格式，供 getTodayWords 比较
  record.nextReview = record.fsrs_due.slice(0, 10)
}

/**
 * 每日学习计划 composable — FSRS 自适应调度版
 *
 * @param {import('vue').Ref<string|null>} userIdRef - 用户 ID（可选，用于数据隔离）
 *
 * 数据结构（localStorage）：
 * {
 *   "cet4": {
 *     words: {
 *       "1": {
 *         firstLearned, lastReviewed, reviewCount,
 *         nextReview,  // YYYY-MM-DD 日期（从 fsrs_due 提取）
 *         // FSRS 状态
 *         fsrs_due, fsrs_stability, fsrs_difficulty,
 *         fsrs_reps, fsrs_lapses, fsrs_state, fsrs_last_review
 *       }
 *     },
 *     dailyQuota: 20,
 *     streak: 5,
 *     lastStudyDate: "2026-06-24"
 *   }
 * }
 */
export function useStudyPlan(userIdRef) {
  // ===== 状态 =====
  const data = ref({})

  /** 当前的 localStorage key */
  function currentKey() {
    const uid = toValue(userIdRef)
    return uid ? `${STORAGE_KEY}_${uid}` : STORAGE_KEY
  }

  /** 从 localStorage 加载数据 */
  function load() {
    try {
      const raw = localStorage.getItem(currentKey())
      data.value = raw ? JSON.parse(raw) : {}
    } catch (e) {
      console.error('[StudyPlan] 数据解析失败，已重置', e)
      data.value = {}
    }
  }

  // 初始加载
  load()

  // 用户切换时重新加载
  if (userIdRef) {
    watch(() => toValue(userIdRef), () => load())
  }

  // ===== 工具方法 =====
  function save() {
    try {
      localStorage.setItem(currentKey(), JSON.stringify(data.value))
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        window.__storage_full = true
        console.error('[StudyPlan] localStorage 已满')
      }
    }
  }

  /** 初始化某本书的学习计划 */
  function ensureBook(bookId) {
    if (!data.value[bookId]) {
      data.value[bookId] = {
        words: {},
        dailyQuota: 20,
        streak: 0,
        lastStudyDate: ''
      }
    }
    return data.value[bookId]
  }

  // ===== 核心：获取今日待学单词 =====
  /**
   * @param {string} bookId - 词库 ID
   * @param {Array} allWords - 该词库所有单词的扁平数组
   * @returns {{ reviews: Array, newWords: Array, all: Array }}
   */
  function getTodayWords(bookId, allWords) {
    const bp = ensureBook(bookId)
    const t = today()

    // 单次遍历：同时收集到期复习词和新词池
    const reviewSet = []
    const newPool = []
    for (const w of allWords) {
      const record = bp.words[w.id]
      // fsrs_state=0 (New) → 尚未首次复习，不算到期复习
      if (record && record.nextReview <= t && record.fsrs_state !== 0) {
        reviewSet.push(w)
      } else if (!record || record.fsrs_state === 0) {
        newPool.push(w)
      }
    }

    // 每日新词数 = quota - 复习数（至少为 0）
    const newCount = Math.max(0, bp.dailyQuota - reviewSet.length)
    const newWords = newPool.slice(0, newCount)

    return {
      reviews: reviewSet,
      newWords,
      all: [...reviewSet, ...newWords]
    }
  }

  // ===== 标记单词已学/已复习（FSRS 自适应调度）=====
  /**
   * @param {string} bookId
   * @param {number} wordId
   * @param {number} rating - 1=Again(忘了), 2=Hard(困难), 3=Good(良好), 4=Easy(简单)，默认 3
   */
  function markWord(bookId, wordId, rating = 3) {
    const bp = ensureBook(bookId)
    const t = today()
    const existing = bp.words[wordId] || null

    // 用 FSRS 计算下次复习时间
    const fsrs = getFSRS()
    const card = cardFromRecord(existing)
    const result = fsrs.repeat(card, new Date())
    const nextState = result[rating] || result[3] // fallback to Good

    bp.words[wordId] = {
      firstLearned: existing?.firstLearned || t,
      lastReviewed: t,
      reviewCount: (existing?.reviewCount || 0) + 1,
    }
    saveCardToRecord(bp.words[wordId], nextState.card)

    // 记录学习日（限制 365 条，防止无限增长）
    if (!bp.studyDays) bp.studyDays = []
    if (!bp.studyDays.includes(t)) {
      bp.studyDays.push(t)
      if (bp.studyDays.length > 365) bp.studyDays = bp.studyDays.slice(-365)
    }

    // 更新连续学习天数
    if (bp.lastStudyDate !== t) {
      const yesterday = addDays(t, -1)
      bp.streak = (bp.lastStudyDate === yesterday) ? bp.streak + 1 : 1
      bp.lastStudyDate = t
    }

    save()
  }

  /** 标记单词"忘记了"→ 等价于 markWord(rating=1, Again) */
  function markWordFailed(bookId, wordId) {
    markWord(bookId, wordId, 1)
  }

  // ===== 统计 =====
  /**
   * @param {string} bookId
   * @param {Array} allWords
   */
  function getStats(bookId, allWords, dueCount) {
    const bp = ensureBook(bookId)
    const t = today()
    const learned = Object.keys(bp.words).length

    // ponytail: dueCount from caller avoids iterating allWords twice
    let dueReviews = dueCount
    if (dueReviews === undefined) {
      dueReviews = 0
      for (const w of allWords) {
        const r = bp.words[w.id]
        if (r && r.nextReview <= t) dueReviews++
      }
    }

    return {
      streak: bp.streak,
      learned,
      total: allWords.length,
      percent: allWords.length ? Math.round((learned / allWords.length) * 100) : 0,
      dailyQuota: bp.dailyQuota,
      dueReviews
    }
  }

  /** 设置每日新词量 */
  function setQuota(bookId, n) {
    const bp = ensureBook(bookId)
    bp.dailyQuota = Math.max(5, Math.min(100, n))
    save()
  }

  /** 判断单词是否已学 */
  function isLearned(bookId, wordId) {
    const bp = ensureBook(bookId)
    return !!bp.words[wordId]
  }

  /** 获取某本书的学习日数组 */
  function getStudyDays(bookId) {
    const bp = ensureBook(bookId)
    return bp.studyDays || []
  }

  return {
    data,
    getTodayWords,
    markWord,
    markWordFailed,
    getStats,
    getStudyDays,
    setQuota,
    isLearned,
    ensureBook
  }
}
