import { ref } from 'vue'

/**
 * PWA 浏览器通知 — 每日复习提醒
 *
 * 用法：
 *   const notify = useNotification()
 *   notify.requestPermission()  // 用户首次点击"开启提醒"时调用
 *   notify.scheduleReminder('20:00')  // 每晚 8 点提醒
 */

const STORAGE_KEY = 'ev_notify'

export function useNotification() {
  const permission = ref(Notification?.permission || 'default')
  const scheduled = ref(false)

  // 模块级定时器（多实例共享，避免函数对象属性冲突）
  let _timer = null

  // 恢复状态
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved) {
      scheduled.value = saved.scheduled || false
    }
  } catch (e) { console.error('[Notify] 通知状态读取失败', e) }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ scheduled: scheduled.value }))
  }

  /** 请求通知权限 */
  async function requestPermission() {
    if (!('Notification' in window)) {
      console.warn('[Notify] 浏览器不支持 Notification')
      return 'denied'
    }
    const result = await Notification.requestPermission()
    permission.value = result
    return result
  }

  /** 发送一条即时通知 */
  function send(title, options = {}) {
    if (permission.value !== 'granted') return
    const opts = {
      icon: '/xinyu/icon.svg',
      badge: '/xinyu/icon.svg',
      tag: 'english-vocab-reminder',
      requireInteraction: true,
      ...options
    }
    try {
      new Notification(title, opts)
    } catch (e) {
      console.warn('[Notify] 发送失败:', e)
    }
  }

  /** 设置每日提醒（使用 setInterval 轮询，轻量无依赖） */
  function scheduleReminder(timeStr = '20:00') {
    if (permission.value !== 'granted') return

    scheduled.value = true
    save()

    const [h, m] = timeStr.split(':').map(Number)

    // 清除旧定时器
    if (_timer) clearInterval(_timer)

    // 每分钟检查一次是否到时间
    _timer = setInterval(() => {
      const now = new Date()
      if (now.getHours() === h && now.getMinutes() === m) {
        send('📚 别忘了复习单词！', {
          body: '每天坚持几分钟，词汇量稳步提升～',
          requireInteraction: true
        })
      }
    }, 60_000)

    // 立即发一条确认
    send('✅ 提醒已开启', {
      body: `每天 ${timeStr} 会提醒你复习单词`,
      requireInteraction: false
    })
  }

  /** 取消每日提醒 */
  function cancelReminder() {
    if (_timer) {
      clearInterval(_timer)
      _timer = null
    }
    scheduled.value = false
    save()
  }

  return {
    permission,
    scheduled,
    requestPermission,
    send,
    scheduleReminder,
    cancelReminder
  }
}
