/** 认证 API 调用 */

import { post, get, put } from './client.js'

export const authAPI = {
  /** 注册 */
  register(username, password) {
    return post('/api/auth/register', { username, password })
  },

  /** 登录 */
  login(username, password) {
    return post('/api/auth/login', { username, password })
  },

  /** 获取当前用户信息 */
  getProfile() {
    return get('/api/auth/profile')
  },

  /** 更新用户信息 */
  updateProfile(data) {
    return put('/api/auth/profile', data)
  }
}
