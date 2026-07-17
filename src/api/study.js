/** 学习数据 API 调用 */

import { get, put } from './client.js'

export const studyAPI = {
  /** 获取学习计划 */
  getPlan() {
    return get('/api/study/plan')
  },

  /** 同步学习计划（全量） */
  syncPlan(planData) {
    return put('/api/study/plan', { plan: planData })
  },

  /** 获取掌握进度 */
  getProgress(bookId) {
    return get(`/api/study/progress?bookId=${encodeURIComponent(bookId)}`)
  },

  /** 同步掌握进度 */
  syncProgress(bookId, wordIds) {
    return put('/api/study/progress', { bookId, wordIds })
  }
}
