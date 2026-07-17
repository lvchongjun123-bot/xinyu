/**
 * useProgress — 单词掌握状态测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgress } from '../src/composables/useProgress.js'
import { ref } from 'vue'

function makeWords(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    word: `word${i + 1}`,
    definition: `释义${i + 1}`,
    sentence: `例句${i + 1}`
  }))
}

describe('useProgress', () => {
  beforeEach(() => localStorage.clear())

  it('初始所有单词为 false（未掌握）', () => {
    const bookId = ref('gaokao')
    const words = ref(makeWords(10))
    const userId = ref('test-user')
    const { masteredMap } = useProgress(bookId, words, userId)
    const values = Object.values(masteredMap.value)
    expect(values).toHaveLength(10)
    expect(values.every(v => v === false)).toBe(true)
  })

  it('toggleMaster 切换掌握/未掌握', () => {
    const bookId = ref('gaokao')
    const words = ref(makeWords(10))
    const userId = ref('test-user')
    const { masteredMap, toggleMaster } = useProgress(bookId, words, userId)

    toggleMaster(1)
    expect(masteredMap.value[1]).toBe(true)

    toggleMaster(1)
    expect(masteredMap.value[1]).toBe(false)
  })

  it('不同用户不共享', () => {
    const bookId = ref('gaokao')
    const words = ref(makeWords(10))
    const userA = ref('userA')
    const userB = ref('userB')

    const a = useProgress(bookId, words, userA)
    const b = useProgress(bookId, words, userB)

    a.toggleMaster(1)
    expect(a.masteredMap.value[1]).toBe(true)
    expect(b.masteredMap.value[1]).toBe(false)
  })
})
