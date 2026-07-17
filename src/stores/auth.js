/** 认证状态管理 — Pinia Store
 *
 *  两种模式：
 *  - local : localStorage 存用户，纯前端
 *  - mysql : Flask API + JWT，需要后端运行
 *
 *  启动时自动检测 /api/health 决定模式。
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { checkBackend, setToken, getToken } from '../api/client.js'
import { authAPI } from '../api/auth.js'

const USERS_KEY = 'ev_users'
const LOCAL_TOKEN_KEY = 'ev_local_token'

// ── localStorage 用户管理（local 模式）─────────────

function loadUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? JSON.parse(raw) : { users: [], activeUserId: null }
  } catch (e) {
    console.error('[Auth] 用户数据解析失败，已重置', e)
    return { users: [], activeUserId: null }
  }
}

function saveUsers(data) {
  localStorage.setItem(USERS_KEY, JSON.stringify(data))
}

/** Web Crypto SHA-256 简单哈希 */
async function sha256(message) {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export const useAuthStore = defineStore('auth', () => {
  // ── 状态 ──────────────────────────────────────────
  const mode = ref('detecting') // 'detecting' | 'local' | 'mysql'
  const user = ref(null) // { id, username, avatar, createdAt }
  const token = ref(null)
  const error = ref(null)
  const authReady = ref(false)

  // ── 计算属性 ──────────────────────────────────────
  const isLoggedIn = computed(() => !!user.value)
  const isMySQLMode = computed(() => mode.value === 'mysql')
  const isLocalMode = computed(() => mode.value === 'local')
  const userId = computed(() => user.value?.id || null)

  // ── 初始化 ────────────────────────────────────────
  async function init() {
    error.value = null

    // 1) 立即以 local 模式启动，让 UI 尽快渲染
    mode.value = 'local'
    const data = loadUsers()
    if (data.activeUserId) {
      const u = data.users.find(u => u.id === data.activeUserId)
      if (u) {
        user.value = {
          id: u.id,
          username: u.username,
          avatar: u.avatar || '',
          createdAt: u.createdAt || ''
        }
      }
    }
    authReady.value = true

    // 2) 后台探测后端（无论有无 token），探测到就切 MySQL 模式
    const savedToken = localStorage.getItem(LOCAL_TOKEN_KEY)
    checkBackend().then(async (backendOk) => {
      if (!backendOk) return

      mode.value = 'mysql'

      if (savedToken) {
        setToken(savedToken)
        token.value = savedToken
        try {
          const profile = await authAPI.getProfile()
          user.value = {
            id: profile.id,
            username: profile.username,
            avatar: profile.avatar || '',
            createdAt: profile.createdAt || ''
          }
        } catch {
          setToken(null)
          token.value = null
          localStorage.removeItem(LOCAL_TOKEN_KEY)
        }
      }
    }).catch((e) => {
      // 后端不可用，保持 local 模式
      console.debug('[Auth] 后端探测失败，使用本地模式', e.message)
    })
  }

  // ── 注册 ──────────────────────────────────────────
  async function register(username, password) {
    error.value = null

    if (mode.value === 'mysql') {
      try {
        const result = await authAPI.register(username, password)
        setToken(result.token)
        token.value = result.token
        localStorage.setItem(LOCAL_TOKEN_KEY, result.token)
        user.value = {
          id: result.id,
          username: result.username,
          avatar: '',
          createdAt: ''
        }
      } catch (e) {
        error.value = '网络连接失败，请稍后重试'
        console.error('[Auth] 注册失败', e)
      }
      return
    }

    // local 模式
    const data = loadUsers()
    if (data.users.find(u => u.username === username)) {
      error.value = '用户名已被注册'
      return
    }

    const id = 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    const passwordHash = await sha256(password + username)
    const newUser = {
      id,
      username,
      passwordHash,
      avatar: '',
      createdAt: new Date().toISOString()
    }

    data.users.push(newUser)
    data.activeUserId = id
    saveUsers(data)

    user.value = {
      id: newUser.id,
      username: newUser.username,
      avatar: newUser.avatar,
      createdAt: newUser.createdAt
    }
  }

  // ── 登录 ──────────────────────────────────────────
  async function login(username, password) {
    error.value = null

    if (mode.value === 'mysql') {
      try {
        const result = await authAPI.login(username, password)
        setToken(result.token)
        token.value = result.token
        localStorage.setItem(LOCAL_TOKEN_KEY, result.token)
        user.value = {
          id: result.id,
          username: result.username,
          avatar: result.avatar || '',
          createdAt: ''
        }
      } catch (e) {
        error.value = '网络连接失败，请稍后重试'
        console.error('[Auth] 登录失败', e)
      }
      return
    }

    // local 模式
    const data = loadUsers()
    const u = data.users.find(u => u.username === username)
    if (!u) {
      error.value = '用户名不存在'
      return
    }

    const passwordHash = await sha256(password + username)
    if (passwordHash !== u.passwordHash) {
      error.value = '密码错误'
      return
    }

    data.activeUserId = u.id
    saveUsers(data)

    user.value = {
      id: u.id,
      username: u.username,
      avatar: u.avatar || '',
      createdAt: u.createdAt || ''
    }
  }

  // ── 退出 ──────────────────────────────────────────
  function logout() {
    error.value = null

    if (mode.value === 'mysql') {
      setToken(null)
      token.value = null
      localStorage.removeItem(LOCAL_TOKEN_KEY)
    } else {
      const data = loadUsers()
      data.activeUserId = null
      saveUsers(data)
    }

    user.value = null
  }

  // ── 更新个人信息 ──────────────────────────────────
  async function updateProfile(updates) {
    error.value = null

    if (mode.value === 'mysql') {
      await authAPI.updateProfile(updates)
    } else {
      // local 模式：写入 localStorage
      const data = loadUsers()
      const u = data.users.find(u => u.id === user.value.id)
      if (u) {
        if (updates.username) u.username = updates.username
        if (updates.avatar !== undefined) u.avatar = updates.avatar
        saveUsers(data)
      }
    }

    // 更新本地状态
    if (updates.username) user.value.username = updates.username
    if (updates.avatar !== undefined) user.value.avatar = updates.avatar
  }

  return {
    mode, user, token, error, authReady,
    isLoggedIn, isMySQLMode, isLocalMode, userId,
    init, register, login, logout, updateProfile
  }
})
