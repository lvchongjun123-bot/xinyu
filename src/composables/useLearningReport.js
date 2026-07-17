import { ref, computed } from 'vue'

/**
 * 学习报告 — 周报/月报数据 + Canvas 趋势图
 *
 * 用法：
 *   const report = useLearningReport(studyPlan, activeBook, allBookWords)
 *   report.weeklyStats  → { daily: [{date, count}], total, streak, avgDaily }
 */

const STORAGE_PREFIX = 'ev_report_cache'

export function useLearningReport(studyPlan, activeBook, allBookWords) {
  const reportDays = ref(30) // 默认显示最近 30 天

  /** 获取某天的学习词数（从 studyPlan 的 studyDays + words 数据推断） */
  function getDailyCounts(days = 30) {
    const bp = (studyPlan.data.value[activeBook.value] || {})
    const words = bp.words || {}
    const studyDays = bp.studyDays || []
    const counts = {}

    // 计算每天学习的词数（去重：同一天的 firstLearned 和 lastReviewed 只计一次）
    const seen = new Set()
    for (const [wordId, record] of Object.entries(words)) {
      if (record.firstLearned) {
        counts[record.firstLearned] = (counts[record.firstLearned] || 0) + 1
        seen.add(`${wordId}_${record.firstLearned}`)
      }
      if (record.lastReviewed && record.lastReviewed !== record.firstLearned) {
        const dedupeKey = `${wordId}_${record.lastReviewed}`
        if (!seen.has(dedupeKey)) {
          counts[record.lastReviewed] = (counts[record.lastReviewed] || 0) + 1
          seen.add(dedupeKey)
        }
      }
    }

    // 生成最近 N 天的数组
    const result = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      result.push({
        date: dateStr,
        count: counts[dateStr] || 0,
        label: `${d.getMonth() + 1}/${d.getDate()}`
      })
    }

    return result
  }

  /** 月报统计（主计算，周报从它 slice） */
  const monthlyStats = computed(() => {
    const daily = getDailyCounts(30)
    const total = daily.reduce((s, d) => s + d.count, 0)
    const activeDays = daily.filter(d => d.count > 0).length
    return {
      daily,
      total,
      activeDays,
      avgDaily: activeDays > 0 ? Math.round(total / activeDays) : 0,
      maxDay: Math.max(...daily.map(d => d.count), 1)
    }
  })

  /** 周报统计 — ponytail: slice from monthlyStats, avoids second getDailyCounts traversal */
  const weeklyStats = computed(() => {
    const daily = monthlyStats.value.daily.slice(-7)
    const total = daily.reduce((s, d) => s + d.count, 0)
    const activeDays = daily.filter(d => d.count > 0).length
    return {
      daily,
      total,
      activeDays,
      avgDaily: activeDays > 0 ? Math.round(total / activeDays) : 0,
      maxDay: Math.max(...daily.map(d => d.count), 1)
    }
  })

  /** 当前词库总体进度 */
  const bookProgress = computed(() => {
    const bp = (studyPlan.data.value[activeBook.value] || {})
    // ponytail: count only words that have been reviewed at least once (not just encountered)
    const learned = Object.values(bp.words || {}).filter(
      r => r.fsrs_state !== 0 && r.reviewCount > 0
    ).length
    const total = allBookWords.value.length
    return {
      learned,
      total,
      percent: total > 0 ? Math.round((learned / total) * 100) : 0
    }
  })

  /** 预计完成天数（按当前速度） */
  const estimatedDays = computed(() => {
    const bp = (studyPlan.data.value[activeBook.value] || {})
    const remaining = allBookWords.value.length - Object.keys(bp.words || {}).length
    const quota = bp.dailyQuota || 20
    if (remaining <= 0) return 0
    return Math.ceil(remaining / quota)
  })

  return {
    reportDays,
    weeklyStats,
    monthlyStats,
    bookProgress,
    estimatedDays,
    getDailyCounts
  }
}
