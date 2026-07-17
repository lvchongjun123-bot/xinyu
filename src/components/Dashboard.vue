<template>
  <div class="dashboard">
    <!-- Hero — gradient background, big greeting -->
    <div class="dash-hero">
      <div class="dash-hero-content">
        <div class="dash-greeting">{{ greeting }}</div>
        <div class="dash-hero-sub">
          <span v-if="stats.streak > 0" class="dash-hero-streak">
            <span class="streak-fire">🔥</span> 连续 <strong>{{ stats.streak }}</strong> 天
          </span>
          <span v-else class="dash-hero-hint">🌱 今天开始学习吧！</span>
        </div>
      </div>
      <div class="dash-hero-deco">
        <svg viewBox="0 0 120 120" class="dash-hero-ring">
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="6"/>
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="6"
            stroke-dasharray="314" :stroke-dashoffset="314 - (314 * todayPercent / 100)"
            stroke-linecap="round" transform="rotate(-90 60 60)" style="transition: stroke-dashoffset 0.8s ease"/>
        </svg>
        <div class="dash-hero-ring-label">{{ todayPercent }}%</div>
      </div>
    </div>

    <!-- Stats Row — key metrics above the fold -->
    <div class="dash-stats">
      <div class="dash-stat">
        <span class="dash-stat-val">{{ stats.learned }}</span>
        <span class="dash-stat-label">已学单词</span>
      </div>
      <div class="dash-stat">
        <span class="dash-stat-val">{{ todayNew }}</span>
        <span class="dash-stat-label">今日新词</span>
      </div>
      <div class="dash-stat">
        <span class="dash-stat-val">{{ todayReview }}</span>
        <span class="dash-stat-label">今日复习</span>
      </div>
      <div class="dash-stat">
        <span class="dash-stat-val">{{ todayDone }}</span>
        <span class="dash-stat-label">今日已完成</span>
      </div>
    </div>

    <!-- Today Progress + Gamification -->
    <div class="dash-mid-row">
      <div class="dash-today-card">
        <div class="dash-today-header">📅 今日目标</div>
        <div class="dash-today-body">
          <span class="dash-today-big">{{ todayDone }}<span class="dash-today-total"> / {{ todayTotal }}</span></span>
          <span class="dash-today-pct">{{ todayPercent }}%</span>
        </div>
        <div class="progress-bar" style="margin-top:10px">
          <div class="progress-bar-fill" :style="{ width: todayPercent + '%' }"></div>
        </div>
      </div>

      <div class="dash-gamify" v-if="gamifyXp > 0">
        <div class="gamify-top">
          <span class="dash-gamify-lv-badge" :class="{ 'lvl-max': gamifyIsMaxLevel }">
            {{ gamifyIsMaxLevel ? '👑 MAX' : '⭐ Lv.' + gamifyLevel }}
          </span>
          <span class="dash-gamify-today-val">⚡ +{{ gamifyTodayXp }} XP</span>
        </div>
        <div class="dash-gamify-xp-bar-wrap">
          <div class="dash-gamify-xp-bar" :style="{ width: gamifyLevelProgress + '%' }"></div>
          <span class="dash-gamify-xp-text" v-if="!gamifyIsMaxLevel">{{ gamifyXp }} / {{ gamifyXpToNext }} XP</span>
        </div>
        <div class="gamify-badges" v-if="earnedBadges.length > 0">
          <span v-for="b in earnedBadges.slice(0,5)" :key="b.id" class="dash-badge" :title="b.name">{{ b.icon }}</span>
          <span class="badge-count">{{ earnedBadges.length }} 枚</span>
        </div>
      </div>
    </div>

    <!-- Alerts — high-priority CTAs -->
    <div class="dash-due-alert" v-if="dueReviews > 0">
      ⏰ 你有 <strong>{{ dueReviews }}</strong> 个单词待复习
    </div>
    <div class="dash-wrong-card" v-if="wrongWordsCount > 0" @click="$emit('go-wrong-words')">
      <span>📝</span> <span>错题本</span>
      <span class="wrong-count">{{ wrongWordsCount }} 个</span>
      <span style="margin-left:auto">→</span>
    </div>

    <!-- Module Cards — learning mode entry -->
    <div class="dash-section-label">选择学习模式</div>
    <div class="dash-modules">
      <button v-for="mod in modules" :key="mod.id" class="dash-module-card" @click="$emit('select-module', mod.id)">
        <div class="dash-mod-icon" :style="{ background: mod.color || 'var(--primary-subtle)' }"><component :is="iconMap[mod.id]" :size="22" /></div>
        <div class="dash-mod-info">
          <div class="dash-mod-title">{{ mod.title }}</div>
          <div class="dash-mod-desc">{{ mod.desc }}</div>
        </div>
        <div class="dash-mod-meta">{{ mod.meta }}</div>
        <div class="dash-mod-bar-wrap" v-if="mod.progress != null">
          <div class="dash-mod-bar" :style="{ width: mod.progress + '%' }"></div>
        </div>
      </button>
    </div>

    <!-- Heatmap -->
    <div class="dash-heatmap" v-if="heatmapData.length > 0">
      <div class="dash-section-label">📊 学习记录</div>
      <div class="dash-heatmap-grid">
        <span v-for="(day, i) in heatmapData" :key="i" class="dash-heatmap-cell"
          :class="'lvl-' + day.level" :title="day.label"></span>
      </div>
      <div class="dash-heatmap-legend">
        <span>少</span>
        <span class="dash-heatmap-cell lvl-0"></span><span class="dash-heatmap-cell lvl-1"></span>
        <span class="dash-heatmap-cell lvl-2"></span><span class="dash-heatmap-cell lvl-3"></span>
        <span class="dash-heatmap-cell lvl-4"></span>
        <span>多</span>
      </div>
    </div>

    <!-- Weekly Chart -->
    <div class="dash-report" v-if="weeklyStats">
      <div class="dash-report-header">
        <span class="dash-report-title">📈 本周趋势</span>
        <span class="dash-report-summary">共学 <strong>{{ weeklyStats.total }}</strong> 词 · 活跃 <strong>{{ weeklyStats.activeDays }}</strong> 天</span>
      </div>
      <canvas ref="chartCanvas" class="dash-report-chart" width="740" height="120"></canvas>
    </div>

    <!-- Tools -->
    <div class="dash-tools">
      <button class="dash-tool-btn" @click="$emit('select-module', 'import')">📥 导入词库</button>
      <button class="dash-tool-btn" @click="$emit('select-module', 'profile')">⚙️ 个人中心</button>
    </div>

    <!-- Banners -->
    <div class="dash-done-banner" v-if="stats.percent >= 100 && stats.total > 0">
      🎉 已掌握全部 {{ stats.total }} 个单词！
      <div style="margin-top:8px;display:flex;gap:8px;justify-content:center">
        <button class="btn btn-primary btn-sm" @click="$emit('select-module', 'browse')">浏览词库</button>
        <button class="btn btn-outline btn-sm" @click="$emit('switch-book')">切换词库 →</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Keyboard, Layers, BookOpen, Headphones, Pencil, BookMarked } from 'lucide-vue-next'

const iconMap = {
  typing: Keyboard, flashcard: Layers, browse: BookOpen,
  dictation: Headphones, reading: BookMarked, sentenceTyping: Pencil
}

const props = defineProps({
  stats: { type: Object, default: () => ({ streak: 0, learned: 0, total: 0, percent: 0 }) },
  todayNew: { type: Number, default: 0 },
  todayReview: { type: Number, default: 0 },
  todayDone: { type: Number, default: 0 },
  todayPercent: { type: Number, default: 0 },
  userName: { type: String, default: '' },
  dueReviews: { type: Number, default: 0 },
  wrongWordsCount: { type: Number, default: 0 },
  weeklyStats: { type: Object, default: null },
  gamifyLevel: { type: Number, default: 1 },
  gamifyXp: { type: Number, default: 0 },
  gamifyTodayXp: { type: Number, default: 0 },
  gamifyLevelProgress: { type: Number, default: 0 },
  gamifyXpToNext: { type: Number, default: 100 },
  gamifyIsMaxLevel: { type: Boolean, default: false },
  earnedBadges: { type: Array, default: () => [] },
  heatmapData: { type: Array, default: () => [] },
  sentenceCount: { type: Number, default: 0 }
})
defineEmits(['select-module', 'go-wrong-words', 'switch-book'])

const chartCanvas = ref(null)
const greeting = computed(() => {
  const h = new Date().getHours()
  const namePart = props.userName ? `，${props.userName}` : ''
  if (h < 6) return `夜深了${namePart} 🌙`
  if (h < 12) return `早上好${namePart} ☀️`
  if (h < 18) return `下午好${namePart} 🌤️`
  return `晚上好${namePart} 🌆`
})
const todayTotal = computed(() => props.todayNew + props.todayReview)

const modules = computed(() => {
  const t = todayTotal.value
  const p = t > 0 ? Math.round((props.todayDone / t) * 100) : 0
  return [
    { id: 'typing', title: '打字练习', desc: '逐字母输入锻炼拼写', meta: `🆕 ${t} 词`, progress: p, color: 'var(--primary-subtle)' },
    { id: 'flashcard', title: '闪卡复习', desc: '卡片翻转快速判断', meta: `🔄 ${t} 词`, progress: p, color: 'var(--primary-subtle)' },
    { id: 'browse', title: '单词浏览', desc: '浏览详细释义例句', meta: `📚 ${t} 个`, progress: p, color: 'var(--success-subtle)' },
    { id: 'dictation', title: '听写模式', desc: '听发音默写单词', meta: '✏️ 检验拼写', progress: null, color: 'var(--warning-subtle)' },
    { id: 'reading', title: '阅读理解', desc: '读文章回答理解题', meta: '📋 5 道题目', progress: null, color: 'var(--warning-subtle)' },
    { id: 'sentenceTyping', title: '句子听打', desc: '听句子默打训练', meta: props.sentenceCount > 0 ? `🎧 ${props.sentenceCount} 句` : '暂无可练', progress: null, color: 'var(--primary-subtle)' }
  ]
})

function drawChart() {
  const canvas = chartCanvas.value; if (!canvas || !props.weeklyStats?.daily) return
  const daily = props.weeklyStats.daily; const maxVal = props.weeklyStats.maxDay || 1
  const ctx = canvas.getContext('2d'); const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr; ctx.scale(dpr, dpr)
  const w = rect.width - 8, h = rect.height - 16, barW = Math.max(2, (w / daily.length) - 3)
  ctx.clearRect(0, 0, w, h + 16)
  const cs = getComputedStyle(canvas)
  ctx.strokeStyle = cs.getPropertyValue('--border').trim() || '#e2e8f0'; ctx.lineWidth = 0.5
  for (let i = 0; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(4, 2 + (h/2)*i); ctx.lineTo(w, 2 + (h/2)*i); ctx.stroke() }
  const primary = cs.getPropertyValue('--primary').trim() || '#2563eb'
  daily.forEach((d, i) => {
    const x = 4 + i * (barW + 1), barH = d.count > 0 ? Math.max(2, (d.count / maxVal) * h) : 0, y = h - barH + 2
    ctx.fillStyle = d.count > 0 ? primary : cs.getPropertyValue('--card').trim() || '#f1f5f9'
    ctx.fillRect(x, y, barW, barH || 1)
  })
  ctx.fillStyle = cs.getPropertyValue('--muted-foreground').trim() || '#64748b'; ctx.font = '9px system-ui'; ctx.textAlign = 'center'
  daily.forEach((d, i) => { const date = new Date(d.date); if (date.getDay() === 1 || i === 0 || i === daily.length - 1) { const x = 4 + i * (barW + 1) + barW / 2; ctx.fillText(`${date.getMonth()+1}/${date.getDate()}`, x, h + 14) } })
}

let _obs = null
onMounted(() => { nextTick(drawChart); if (chartCanvas.value) { _obs = new ResizeObserver(() => nextTick(drawChart)); _obs.observe(chartCanvas.value) } })
onBeforeUnmount(() => { if (_obs) _obs.disconnect() })
watch(() => props.weeklyStats, () => nextTick(drawChart), { deep: true })
</script>

<style scoped>
.dashboard { max-width: 920px; margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: var(--space-xl); }

/* Hero */
.dash-hero { display: flex; align-items: center; justify-content: space-between; padding: var(--space-2xl) 36px; border-radius: var(--radius-xl); background: var(--gradient-hero); color: #fff; gap: var(--space-xl); }
.dash-greeting { font-size: var(--text-2xl); font-weight: var(--font-extrabold); letter-spacing: -0.02em; }
.dash-hero-sub { font-size: var(--text-base); opacity: 0.85; margin-top: 6px; }
.dash-hero-streak strong { font-size: 18px; }
.streak-fire { display: inline-block; animation: firePulse 2s ease-in-out infinite; }
@keyframes firePulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.15) } }
.dash-hero-deco { position: relative; width: 90px; height: 90px; flex-shrink: 0; }
.dash-hero-ring { width: 100%; height: 100%; }
.dash-hero-ring-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: var(--text-xl); font-weight: var(--font-extrabold); }

/* Section label */
.dash-section-label { font-size: var(--text-lg); font-weight: var(--font-bold); color: var(--foreground); padding: 0 2px; }

/* Module Cards */
.dash-modules { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.dash-module-card { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; padding: var(--space-xl); background: var(--card); box-shadow: var(--shadow-sm); border-radius: var(--radius-xl); cursor: pointer; transition: all var(--transition-fast); text-align: left; font-family: inherit; font-size: var(--text-base); color: var(--foreground); }
.dash-module-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-lg); }
.dash-module-card:active { transform: translateY(0) scale(0.98); }
.dash-mod-icon { width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: var(--radius-md); font-size: 22px; }
.dash-mod-title { font-size: var(--text-base); font-weight: var(--font-bold); }
.dash-mod-desc { font-size: var(--text-sm); color: var(--muted); line-height: 1.4; }
.dash-mod-meta { font-size: var(--text-sm); font-weight: var(--font-semibold); color: var(--primary); margin-top: auto; }
.dash-mod-bar-wrap { width: 100%; height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; }
.dash-mod-bar { height: 100%; background: var(--primary); border-radius: 2px; transition: width 600ms ease-out; }

/* Stats */
.dash-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-md); }
.dash-stat { padding: 18px var(--space-md); background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-lg); text-align: center; transition: all var(--transition-fast); }
.dash-stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.dash-stat-val { display: block; font-size: var(--text-2xl); font-weight: var(--font-extrabold); color: var(--foreground); font-variant-numeric: tabular-nums; }
.dash-stat-label { display: block; font-size: var(--text-sm); color: var(--muted); margin-top: var(--space-xs); }

/* Today + Gamify row */
.dash-mid-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.dash-today-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-xl); }
.dash-today-header { font-size: var(--text-base); font-weight: var(--font-semibold); color: var(--foreground); margin-bottom: 10px; }
.dash-today-body { display: flex; align-items: baseline; gap: 10px; }
.dash-today-big { font-size: 40px; font-weight: var(--font-extrabold); color: var(--primary); font-variant-numeric: tabular-nums; line-height: 1; }
.dash-today-total { font-size: 18px; font-weight: var(--font-medium); color: var(--muted-foreground); }
.dash-today-pct { font-size: var(--text-base); color: var(--muted); }

.dash-gamify { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: var(--space-xl); display: flex; flex-direction: column; gap: var(--space-md); }
.gamify-top { display: flex; align-items: center; gap: var(--space-md); }
.dash-gamify-lv-badge { padding: var(--space-xs) 14px; background: var(--gradient-hero); color: #fff; border-radius: 20px; font-size: 13px; font-weight: var(--font-bold); }
.dash-gamify-today-val { font-size: 15px; font-weight: var(--font-bold); color: var(--primary); }
.dash-gamify-xp-bar-wrap { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; position: relative; }
.dash-gamify-xp-bar { height: 100%; background: var(--gradient-xp); border-radius: 4px; transition: width 0.5s; }
.dash-gamify-xp-text { position: absolute; right: 0; top: -18px; font-size: var(--text-xs); color: var(--muted); }
.gamify-badges { display: flex; align-items: center; gap: var(--space-xs); }
.dash-badge { font-size: 18px; }
.badge-count { font-size: var(--text-sm); color: var(--muted); margin-left: var(--space-xs); }

/* Alerts */
.dash-due-alert { padding: 14px 18px; background: var(--warning-subtle); border: 1px solid var(--warning); border-radius: var(--radius-md); font-size: var(--text-base); text-align: center; color: var(--warning); }
.dash-wrong-card { display: flex; align-items: center; gap: 10px; padding: 14px 20px; background: var(--card); box-shadow: var(--shadow-sm); border-left: 3px solid var(--destructive); border-radius: var(--radius-lg); cursor: pointer; transition: all var(--transition-fast); font-size: var(--text-base); color: var(--foreground); }
.dash-wrong-card:hover { background: var(--destructive-subtle); }
.wrong-count { font-weight: var(--font-bold); color: var(--destructive); }

/* Heatmap */
.dash-heatmap { padding: var(--space-xs); }
.dash-heatmap-grid { display: grid; grid-template-columns: repeat(7, 1fr); grid-auto-flow: column; gap: 3px; overflow-x: auto; padding: var(--space-sm) 0; }
.dash-heatmap-cell { width: 14px; height: 14px; border-radius: 3px; background: var(--heatmap-l0); transition: transform var(--transition-fast); }
.dash-heatmap-cell:hover { transform: scale(1.4); z-index: 1; }
.dash-heatmap-cell.lvl-1 { background: var(--heatmap-l1) }
.dash-heatmap-cell.lvl-2 { background: var(--heatmap-l2) }
.dash-heatmap-cell.lvl-3 { background: var(--heatmap-l3) }
.dash-heatmap-cell.lvl-4 { background: var(--heatmap-l4) }
.dash-heatmap-legend { display: flex; align-items: center; gap: var(--space-xs); font-size: var(--text-xs); color: var(--muted); margin-top: var(--space-xs); }

/* Report */
.dash-report { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 18px 22px; }
.dash-report-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.dash-report-title { font-size: 15px; font-weight: var(--font-bold); color: var(--foreground); }
.dash-report-summary { font-size: var(--text-sm); color: var(--muted); }
.dash-report-chart { width: 100%; min-width: 100%; height: 120px; display: block; }

/* Tools */
.dash-tools { display: flex; gap: 10px; }
.dash-tool-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--card); color: var(--muted); cursor: pointer; font-size: 13px; font-family: inherit; transition: all var(--transition-fast); }
.dash-tool-btn:hover { color: var(--foreground); border-color: var(--primary); }

/* Banner */
.dash-done-banner { padding: var(--space-xl); border-radius: var(--radius-xl); background: linear-gradient(135deg, var(--success-subtle), var(--primary-subtle)); border: 1px solid var(--success); text-align: center; color: var(--foreground); font-size: var(--text-lg); }

/* Mobile responsive */
@media (max-width: 768px) {
  .dash-stats { grid-template-columns: repeat(2, 1fr); }
  .dash-modules { grid-template-columns: 1fr; }
  .dash-mid-row { grid-template-columns: 1fr; }
}
</style>