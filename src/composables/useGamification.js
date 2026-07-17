/**
 * 游戏化系统 — XP、等级、徽章、连续打卡
 *
 * 用法：
 *   const gamify = useGamification(userId)
 *   gamify.addXP(10)          // 增加经验值
 *   gamify.stats.value.xp     // 当前总 XP
 *   gamify.stats.value.level  // 当前等级
 */

import { ref, computed, watch, toValue } from 'vue'

const STORAGE_KEY = 'ev_gamification'

/** 等级阈值（累计 XP） */
const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 3800,
  4700, 5700, 6800, 8000, 9300, 10700, 12200, 13800, 15500, 17300,
  19200, 21200, 23300, 25500, 27800, 30200, 32700, 35300, 38000, 40800,
  43700, 46700, 49800, 53000, 56300, 59700, 63200, 66800, 70500, 74300,
  78200, 82200, 86300, 90500, 94800, 99200, 103700, 108300, 113000, 117800
]

/** 徽章定义 */
const BADGES = [
  { id: 'first_word', name: '初识', desc: '学习第一个单词', icon: '🌱', check: (s) => s.totalLearned >= 1 },
  { id: 'words_100', name: '百词斩', desc: '累计学习 100 个单词', icon: '⚔️', check: (s) => s.totalLearned >= 100 },
  { id: 'words_500', name: '五百里', desc: '累计学习 500 个单词', icon: '🏇', check: (s) => s.totalLearned >= 500 },
  { id: 'words_1000', name: '千词达人', desc: '累计学习 1000 个单词', icon: '🏆', check: (s) => s.totalLearned >= 1000 },
  { id: 'words_3000', name: '词汇大师', desc: '累计学习 3000 个单词', icon: '👑', check: (s) => s.totalLearned >= 3000 },
  { id: 'streak_3', name: '三天打鱼', desc: '连续学习 3 天', icon: '🔥', check: (s) => s.highestStreak >= 3 },
  { id: 'streak_7', name: '周而复始', desc: '连续学习 7 天', icon: '📅', check: (s) => s.highestStreak >= 7 },
  { id: 'streak_30', name: '月下苦读', desc: '连续学习 30 天', icon: '🌙', check: (s) => s.highestStreak >= 30 },
  { id: 'streak_100', name: '百日筑基', desc: '连续学习 100 天', icon: '🏯', check: (s) => s.highestStreak >= 100 },
  { id: 'accuracy_90', name: '精益求精', desc: '单日正确率 ≥ 90%', icon: '🎯', check: (s) => s.bestAccuracy >= 90 },
  { id: 'perfect_day', name: '完美一天', desc: '单日学习 ≥ 50 词且全对', icon: '💎', check: (s) => s.bestDailyWords >= 50 && s.bestAccuracy >= 100 },
]

export function useGamification(userIdRef) {
  function key() {
    const uid = toValue(userIdRef)
    return uid ? `${STORAGE_KEY}_${uid}` : STORAGE_KEY
  }

  function load() {
    try {
      const raw = localStorage.getItem(key())
      return raw ? JSON.parse(raw) : defaultData()
    } catch (e) {
      console.error('[Gamification] 数据解析失败，已重置', e)
      return defaultData()
    }
  }

  const data = ref(load())

  // 用户切换/登录后重载数据
  if (userIdRef) {
    watch(() => toValue(userIdRef), () => { data.value = load() })
  }

  function defaultData() {
    return {
      xp: 0,
      totalLearned: 0,
      totalReviews: 0,
      highestStreak: 0,
      bestAccuracy: 0,
      bestDailyWords: 0,
      earnedBadges: [],
      dailyXPHistory: {}, // { '2026-06-26': 50 }
      dailyWordCount: {}   // { '2026-06-26': 5 } 精确单词数，不靠 XP 反推
    }
  }

  function save() {
    try {
      localStorage.setItem(key(), JSON.stringify(data.value))
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        window.__storage_full = true
        console.error('[Gamification] localStorage 已满')
      }
    }
  }

  /** 同步外部数据 */
  function syncStudyData(stats) {
    let changed = false
    if (stats.learned > data.value.totalLearned) {
      data.value.totalLearned = stats.learned
      changed = true
    }
    if (stats.streak > data.value.highestStreak) {
      data.value.highestStreak = stats.streak
      changed = true
    }
    if (changed) save()
  }

  /** 记录一次学习行为 */
  function recordAction(action) {
    // 新词学习：+20 XP
    // 复习：+10 XP
    // 正确率奖励：accuracy >= 90% → ×1.5

    const isNew = action.type === 'new'
    let xp = isNew ? 20 : 10
    if (action.accuracy >= 90) xp = Math.round(xp * 1.5)

    data.value.xp += xp
    data.value.totalReviews += action.count || 1
    if (isNew) data.value.totalLearned += action.count || 1

    // 记录每日 XP
    const today = new Date().toISOString().slice(0, 10)
    data.value.dailyXPHistory[today] = (data.value.dailyXPHistory[today] || 0) + xp

    // 精确单词计数（不靠 XP 反推，避免新词 20XP/复习 10XP 差异造成的偏差）
    data.value.dailyWordCount[today] = (data.value.dailyWordCount[today] || 0) + (action.count || 1)

    // ponytail: cap at 365 days — find min key via reduce, not sort
    for (const hist of ['dailyXPHistory', 'dailyWordCount']) {
      const keys = Object.keys(data.value[hist])
      if (keys.length > 365) {
        const oldest = keys.reduce((a, b) => a < b ? a : b)
        delete data.value[hist][oldest]
      }
    }

    // 更新最佳记录
    if (data.value.dailyWordCount[today] > data.value.bestDailyWords) {
      data.value.bestDailyWords = data.value.dailyWordCount[today]
    }
    if (action.accuracy > data.value.bestAccuracy) {
      data.value.bestAccuracy = action.accuracy
    }

    // 检查新徽章（recordAction 显式调用，不依赖 deep watcher）
    const prevEarned = [...data.value.earnedBadges]
    checkBadges()
    checkAndNotify(prevEarned)

    save()
  }

  /** 检查并解锁新徽章（不调 save，由 recordAction 统一保存） */
  function checkBadges() {
    const s = data.value
    for (const badge of BADGES) {
      if (!s.earnedBadges.includes(badge.id) && badge.check(s)) {
        s.earnedBadges.push(badge.id)
      }
    }
  }

  /** 每日 XP */
  const todayXP = computed(() => {
    const today = new Date().toISOString().slice(0, 10)
    return data.value.dailyXPHistory[today] || 0
  })

  /** 当前等级 */
  const level = computed(() => {
    let lv = 1
    for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
      if (data.value.xp >= LEVEL_THRESHOLDS[i]) lv = i + 1
    }
    return lv
  })

  /** 下一级所需 XP（满级返回 Infinity） */
  const isMaxLevel = computed(() => level.value >= LEVEL_THRESHOLDS.length)
  const xpToNext = computed(() => {
    if (isMaxLevel.value) return Infinity
    return LEVEL_THRESHOLDS[level.value]
  })

  /** 等级进度百分比 */
  const levelProgress = computed(() => {
    const prev = LEVEL_THRESHOLDS[level.value - 1] || 0
    const next = LEVEL_THRESHOLDS[Math.min(level.value, LEVEL_THRESHOLDS.length - 1)] || prev + 100
    if (next <= prev) return 100
    return Math.min(100, Math.round(((data.value.xp - prev) / (next - prev)) * 100))
  })

  /** 所有徽章（含未解锁） */
  const allBadges = computed(() => {
    const s = data.value
    return BADGES.map(b => ({
      ...b,
      earned: (s.earnedBadges || []).includes(b.id)
    }))
  })

  /** 刚解锁的新徽章（本次会话） */
  const newlyEarned = ref([])
  function checkAndNotify(prevEarned) {
    const newBadges = data.value.earnedBadges.filter(id => !prevEarned.includes(id))
    if (newBadges.length) {
      newlyEarned.value = newBadges
      setTimeout(() => { newlyEarned.value = [] }, 5000)
    }
  }

  /** 当前 XP（computed，兼容模板直接访问） */
  const xp = computed(() => data.value.xp)

  /** 已解锁徽章 ID 列表（computed，兼容模板直接访问） */
  const earnedBadges = computed(() => data.value.earnedBadges)

  return {
    data,
    xp,
    todayXp: todayXP,
    level,
    xpToNext,
    isMaxLevel,
    levelProgress,
    earnedBadges,
    allBadges,
    newlyEarned,
    recordAction,
    syncStudyData,
    checkBadges
  }
}
