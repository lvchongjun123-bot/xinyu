/**
 * Canvas 纸屑动画（零依赖，手写 ~40 行）
 *
 * 用法：
 *   import { launchConfetti } from './confetti.js'
 *   launchConfetti()  // 默认 100 片，3s
 *   launchConfetti({ count: 200, duration: 5000 })
 */

export function launchConfetti(opts = {}) {
  const count = opts.count || 100
  const duration = opts.duration || 3000

  const canvas = document.createElement('canvas')
  canvas.className = 'confetti-canvas'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height

  // 生成纸屑
  const particles = []
  const colors = ['#2563eb', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h * -0.5,
      w: 5 + Math.random() * 8,
      h: 3 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 3,
      vy: 2 + Math.random() * 4,
      rot: Math.random() * 360,
      dv: (Math.random() - 0.5) * 10
    })
  }

  const start = performance.now()
  let frame
  let cleanedUp = false

  function cleanup() {
    if (cleanedUp) return
    cleanedUp = true
    if (frame) cancelAnimationFrame(frame)
    if (canvas.parentNode) canvas.remove()
  }

  // 标签页隐藏时清理（避免 Canvas 泄漏）
  const onVisibility = () => {
    if (document.hidden) cleanup()
  }
  document.addEventListener('visibilitychange', onVisibility, { once: true })
  // 兜底：duration 结束后自动清理（超出 10% 容错）
  setTimeout(cleanup, duration * 1.1)

  function tick(now) {
    const elapsed = now - start
    if (elapsed >= duration) {
      cleanup()
      return
    }

    ctx.clearRect(0, 0, w, h)

    const progress = elapsed / duration
    const opacity = progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2

    for (const p of particles) {
      p.x += p.vx
      p.y += p.vy
      p.rot += p.dv

      ctx.save()
      ctx.globalAlpha = opacity
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot * Math.PI / 180)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }

    frame = requestAnimationFrame(tick)
  }

  frame = requestAnimationFrame(tick)
}
