/**
 * 共享 Web Audio API 音效模块（全局单例 AudioContext）
 *
 * 用法：import { playBeep } from '@/utils/audio.js'
 *       playBeep('correct')  // 正确提示音
 *       playBeep('error')    // 错误提示音
 */

let _ctx = null

/** 获取或创建共享 AudioContext（惰性初始化，避免未交互时创建） */
function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  // 浏览器挂起 AudioContext 时自动恢复
  if (_ctx.state === 'suspended') {
    _ctx.resume()
  }
  return _ctx
}

/**
 * 播放简短提示音
 * @param {'correct' | 'error'} type
 */
export function playBeep(type) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    gain.gain.value = 0.12

    if (type === 'correct') {
      osc.type = 'sine'
      osc.frequency.setValueAtTime(523, ctx.currentTime)
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.08)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.25)
    } else {
      osc.type = 'square'
      osc.frequency.setValueAtTime(200, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.15)
    }
  } catch (e) {
    // AudioContext 不可用时静默跳过
    console.debug('[Audio] 音效播放跳过', e.message)
  }
}
