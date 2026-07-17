/**
 * useStudyPlan — 艾宾浩斯 SRS 引擎测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useStudyPlan } from '../src/composables/useStudyPlan.js'
import { ref } from 'vue'

// 完全劫持 Date，控制"今天"
const RealDate = globalThis.Date
let _now = new RealDate('2026-06-26T12:00:00Z').getTime()

class MockDate extends RealDate {
  constructor(...args) {
    if (args.length === 0) {
      super(_now)
    } else {
      super(...args)
    }
  }
}
globalThis.Date = MockDate

function setToday(s) {
  _now = new RealDate(s + 'T12:00:00Z').getTime()
}

function uid() { return 'test-user-123' }

function makeWords(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1, word: `word${i + 1}`, phonetic: '-', definition: `释义${i + 1}`
  }))
}

function makePlan() {
  return useStudyPlan(ref(uid()))
}

describe('useStudyPlan', () => {
  let plan
  const bookId = 'gaokao'
  const words = makeWords(100)

  beforeEach(() => {
    localStorage.clear()
    setToday('2026-06-26')
    plan = makePlan()
  })

  describe('getStats', () => {
    it('返回默认配置', () => {
      const stats = plan.getStats(bookId, words)
      expect(stats.dailyQuota).toBe(20)
      expect(stats.total).toBe(100)
      expect(stats.learned).toBe(0)
      expect(stats.streak).toBe(0)
    })
  })

  describe('markWord', () => {
    it('标记为已学', () => {
      plan.markWord(bookId, 1)
      expect(plan.getStats(bookId, words).learned).toBe(1)
    })

    it('一天后到期', () => {
      plan.markWord(bookId, 1)
      setToday('2026-06-27')
      const today = plan.getTodayWords(bookId, words)
      expect(today.reviews.some(w => w.id === 1)).toBe(true)
    })
  })

  describe('markWordFailed', () => {
    it('重置后 reviewCount = 0 且 nextReview = 明天', () => {
      plan.markWord(bookId, 1)          // nextReview = 06-27
      setToday('2026-06-27')
      plan.markWordFailed(bookId, 1)    // nextReview = 06-28
      setToday('2026-06-28')
      const today = plan.getTodayWords(bookId, words)
      expect(today.reviews.some(w => w.id === 1)).toBe(true)
    })
  })

  describe('getTodayWords', () => {
    it('返回 20 个新词', () => {
      const today = plan.getTodayWords(bookId, words)
      expect(today.newWords.length).toBe(20)
      expect(today.reviews.length).toBe(0)
      expect(today.all.length).toBe(20)
    })

    it('优先复习到期词再补新词', () => {
      for (let i = 1; i <= 15; i++) plan.markWord(bookId, i)
      setToday('2026-06-27')
      const today = plan.getTodayWords(bookId, words)
      expect(today.reviews.length).toBe(15)
      expect(today.newWords.length).toBe(5)
      expect(today.all.length).toBe(20)
    })

    it('复习超出 quota 时 newWords 为 0', () => {
      for (let i = 1; i <= 30; i++) plan.markWord(bookId, i)
      setToday('2026-06-27')
      const today = plan.getTodayWords(bookId, words)
      expect(today.reviews.length).toBe(30)
      expect(today.newWords.length).toBe(0)
    })

    it('空词表返回空', () => {
      expect(plan.getTodayWords(bookId, []).all).toEqual([])
    })

    it('不同词本不共享', () => {
      plan.markWord(bookId, 1)
      expect(plan.getStats('cet4', words).learned).toBe(0)
    })
  })

  describe('streak', () => {
    it('第一天 streak=1', () => {
      plan.markWord(bookId, 1)
      expect(plan.getStats(bookId, words).streak).toBe(1)
    })

    it('连续三天 streak=3', () => {
      plan.markWord(bookId, 1)
      setToday('2026-06-27')
      plan.markWord(bookId, 2)
      setToday('2026-06-28')
      plan.markWord(bookId, 3)
      expect(plan.getStats(bookId, words).streak).toBe(3)
    })

    it('断更 reset', () => {
      plan.markWord(bookId, 1)
      setToday('2026-06-28')
      plan.markWord(bookId, 2)
      expect(plan.getStats(bookId, words).streak).toBe(1)
    })
  })
})
