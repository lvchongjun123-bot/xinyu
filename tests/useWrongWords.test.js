/**
 * useWrongWords — 跨模块错题本测试
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useWrongWords } from '../src/composables/useWrongWords.js'
import { ref } from 'vue'

describe('useWrongWords', () => {
  beforeEach(() => localStorage.clear())

  it('初始空错题本', () => {
    const userId = ref('test-user')
    const ww = useWrongWords(userId)
    expect(ww.getWrongCount('gaokao')).toBe(0)
    expect(ww.getWrongList('gaokao')).toEqual([])
  })

  it('recordWrong 记录错词', () => {
    const userId = ref('test-user')
    const ww = useWrongWords(userId)
    const word = { id: 1, word: 'test', phonetic: '-' }
    ww.recordWrong('gaokao', word, 'typing')
    expect(ww.getWrongCount('gaokao')).toBe(1)
  })

  it('同一单词多次错误应增加计数', () => {
    const userId = ref('test-user')
    const ww = useWrongWords(userId)
    const word = { id: 1, word: 'test', phonetic: '-' }
    ww.recordWrong('gaokao', word, 'typing')
    ww.recordWrong('gaokao', word, 'flashcard')
    const list = ww.getWrongList('gaokao')
    expect(list[0].wrongCount).toBe(2)
    expect(list[0].sources).toContain('typing')
    expect(list[0].sources).toContain('flashcard')
  })

  it('removeWrong 移除错词', () => {
    const userId = ref('test-user')
    const ww = useWrongWords(userId)
    ww.recordWrong('gaokao', { id: 1, word: 'a', phonetic: '-' }, 'typing')
    ww.recordWrong('gaokao', { id: 2, word: 'b', phonetic: '-' }, 'flashcard')
    ww.removeWrong('gaokao', 1)
    expect(ww.getWrongCount('gaokao')).toBe(1)
    expect(ww.getWrongList('gaokao')[0].id).toBe(2)
  })

  it('按错误次数降序排列', () => {
    const userId = ref('test-user')
    const ww = useWrongWords(userId)
    ww.recordWrong('gaokao', { id: 1, word: 'a', phonetic: '-' }, 'typing')
    ww.recordWrong('gaokao', { id: 1, word: 'a', phonetic: '-' }, 'typing')
    ww.recordWrong('gaokao', { id: 1, word: 'a', phonetic: '-' }, 'dictation')
    ww.recordWrong('gaokao', { id: 2, word: 'b', phonetic: '-' }, 'flashcard')
    const list = ww.getWrongList('gaokao')
    expect(list[0].id).toBe(1) // count=3, should be first
    expect(list[1].id).toBe(2) // count=1
    expect(list[0].wrongCount).toBe(3)
  })

  it('不同词本独立管理', () => {
    const userId = ref('test-user')
    const ww = useWrongWords(userId)
    ww.recordWrong('gaokao', { id: 1, word: 'a', phonetic: '-' }, 'typing')
    ww.recordWrong('cet4', { id: 1, word: 'a', phonetic: '-' }, 'flashcard')
    expect(ww.getWrongCount('gaokao')).toBe(1)
    expect(ww.getWrongCount('cet4')).toBe(1)
  })
})
