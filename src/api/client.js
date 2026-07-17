/** HTTP 请求封装：自动注入 JWT，统一错误处理 */

const BASE_URL = import.meta.env.VITE_API_BASE || ''

let _token = null

/** 设置 JWT token */
export function setToken(token) {
  _token = token
}

/** 获取当前 token */
export function getToken() {
  return _token
}

/** 检测后端是否可用 */
export async function checkBackend() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    })
    return res.ok
  } catch {
    // 后端不可用（正常情况，非错误）
    return false
  }
}

/** 通用请求方法（10s 超时防悬挂） */
export async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }

  if (_token) {
    headers['Authorization'] = `Bearer ${_token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    signal: options.signal || AbortSignal.timeout(10000)
  })

  let data
  try { data = await res.json() } catch { throw new Error('后端返回异常') }

  if (!res.ok || data.ok === false) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.code = data.code
    err.status = res.status
    throw err
  }

  return data.data !== undefined ? data.data : data
}

/** GET 请求 */
export function get(path) {
  return request(path, { method: 'GET' })
}

/** POST 请求 */
export function post(path, body) {
  return request(path, { method: 'POST', body: JSON.stringify(body) })
}

/** PUT 请求 */
export function put(path, body) {
  return request(path, { method: 'PUT', body: JSON.stringify(body) })
}
