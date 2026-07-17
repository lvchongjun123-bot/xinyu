import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

/**
 * 闪卡复习模式状态机
 *
 * 参考 DuoCards 设计：
 * - 卡片堆叠，正面单词 → 点击翻转 → 背面释义
 * - 标记"认识"或"不认识"
 * - 不认识 → 放回队尾重复练习
 * - 认识 → 记录到学习计划，推进 SRS 间隔
 *
 * 键盘快捷键：Space 翻转 | 1 忘记了 | 2 困难 | 3 良好 | 4 简单
 */
export function useFlashcard(words, markWordFn, onWrongWord = null) {
  // ===== 状态 =====
  const isActive = ref(false)
  let _customMarkFn = null  // startWithWords 覆盖用
  const queue = ref([])       // 待复习队列
  const currentIdx = ref(0)
  const isFlipped = ref(false)
  const isCompleted = ref(false)
  const difficultySort = ref(false) // 难度排序
  const dragOffset = ref(0) // 触摸滑动偏移
  const isDragging = ref(false)
  const dragStart = ref({ x: 0, y: 0 })
  let _dragLastY = 0  // ponytail: track vertical displacement for direction check

  // 统计
  const knownList = ref([])   // 已掌握的单词
  const unknownList = ref([]) // 未掌握的单词
  const reviewCount = ref(0)  // 当前轮次复习数

  // ===== 计算 =====
  const totalCards = computed(() => {
    // 总卡片 = 初始队列 + 不认识放回的
    return queue.value.length + unknownList.value.length
  })

  const currentCard = computed(() => {
    if (!queue.value.length) return null
    return queue.value[currentIdx.value] || null
  })

  const remaining = computed(() =>
    Math.max(0, queue.value.length - currentIdx.value)
  )

  const progress = computed(() => {
    const total = knownList.value.length + unknownList.value.length + remaining.value
    if (total === 0) return 0
    return Math.round((knownList.value.length / total) * 100)
  })

  const stats = computed(() => {
    // ponytail: dedupe — cards put back in queue appear in both unknownList and queue,
    // so count unique cards from queue + already-completed lists
    const inQueue = new Set(queue.value.map(c => c.id))
    const uniqueUnknown = unknownList.value.filter(c => !inQueue.has(c.id)).length
    const uniqueKnown = knownList.value.filter(c => !inQueue.has(c.id)).length
    return {
      known: knownList.value.length,
      unknown: unknownList.value.length,
      remaining: remaining.value,
      total: uniqueKnown + uniqueUnknown + remaining.value
    }
  })

  // ===== 方法 =====
  function start() {
    if (!words.value?.length) {
      window._showToast && window._showToast('当前没有可复习的单词')
      return
    }
    startWithWords(words.value)
  }

  /** 用指定词表启动（用于错题复习等） */
  function startWithWords(wordList, markWordCallback = null) {
    if (!wordList?.length) return
    _customMarkFn = null  // ponytail: clear stale callback from previous wrong-word review
    isActive.value = true
    isFlipped.value = false
    isCompleted.value = false
    currentIdx.value = 0
    knownList.value = []
    unknownList.value = []
    reviewCount.value = 0
    // 排序
    const sorted = [...wordList]
    sorted.sort(difficultySort.value
      ? (a, b) => (a.word?.length || 0) - (b.word?.length || 0)
      : () => Math.random() - 0.5)
    queue.value = sorted
    // 支持传入回调覆盖默认 markWordFn
    if (markWordCallback) {
      _customMarkFn = markWordCallback
    }
  }

  function exit() {
    isActive.value = false
  }

  function flip() {
    if (!isFlipped.value) {
      isFlipped.value = true
    }
  }

  /** 内部统一标记逻辑（ponytail: DRY — was 4 copy-pasted functions） */
  function _markCard(rating, { isWrong = false } = {}) {
    if (!currentCard.value || !isFlipped.value) return

    const list = isWrong ? unknownList : knownList
    list.value.push(currentCard.value)

    const fn = _customMarkFn || markWordFn
    if (fn) fn(currentCard.value.id, rating)

    if (isWrong && onWrongWord && currentCard.value.id) {
      onWrongWord(currentCard.value)
    }
    if (isWrong && reviewCount.value < 2) {
      queue.value.push(currentCard.value)
      reviewCount.value++
    }

    advance()
  }

  /** 标记"认识" (良好) */
  function markKnown() { _markCard(3) }
  /** 标记"困难" (Hard — 记得但花了很多力气) */
  function markHard() { _markCard(2) }
  /** 标记"简单" (Easy — 根本不用想) */
  function markEasy() { _markCard(4) }
  /** 标记"忘记了" (Again — rating=1) */
  function markUnknown() { _markCard(1, { isWrong: true }) }

  /** 跳过当前卡片（不写 SRS，不放回队列，仅跳过一次） */
  function skip() {
    if (!currentCard.value) return
    // 不调用 markWordFn，不加入 known/unknown，纯跳过
    advance()
  }

  function advance() {
    isFlipped.value = false
    currentIdx.value++

    if (currentIdx.value >= queue.value.length) {
      isCompleted.value = true
    }
  }

  function restart() {
    exit()
    start()
  }

  // ===== 触摸滑动 =====
  const SWIPE_THRESHOLD = 80  // ponytail: raised from 60, less prone to false triggers

  function onTouchStart(e) {
    if (!isActive.value || isCompleted.value) return
    const t = e.touches[0]
    dragStart.value = { x: t.clientX, y: t.clientY }
    isDragging.value = true
    dragOffset.value = 0
  }

  function onTouchMove(e) {
    if (!isDragging.value) return
    const t = e.touches[0]
    dragOffset.value = t.clientX - dragStart.value.x
    _dragLastY = t.clientY
  }

  function onTouchEnd() {
    if (!isDragging.value) return
    const dx = dragOffset.value
    const dy = _dragLastY - dragStart.value.y
    // ponytail: only trigger swipe when horizontal movement dominates vertical
    // This prevents accidental swipe during vertical scrolling
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx > SWIPE_THRESHOLD) {
        // 右滑 → 认识
        dragOffset.value = 200
        setTimeout(() => {
          markKnown()
          dragOffset.value = 0
        }, 200)
      } else {
        // 左滑 → 不认识
        dragOffset.value = -200
        setTimeout(() => {
          markUnknown()
          dragOffset.value = 0
        }, 200)
      }
    } else {
      // 弹回
      dragOffset.value = 0
    }
    isDragging.value = false
  }

  // ===== 键盘快捷键（仅在 active 时注册，避免全局泄漏） =====
  function onKeyDown(e) {
    if (!isActive.value || isCompleted.value) return
    // 忽略输入框中的按键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault()
      if (!isFlipped.value) {
        flip()
      }
    } else if (e.key === '1') {
      if (isFlipped.value) markUnknown()
    } else if (e.key === '2') {
      if (isFlipped.value) markHard()
    } else if (e.key === '3') {
      if (isFlipped.value) markKnown()
    } else if (e.key === '4') {
      if (isFlipped.value) markEasy()
    }
  }

  onMounted(() => {
    watch(isActive, (active) => {
      if (active) {
        window.addEventListener('keydown', onKeyDown)
      } else {
        window.removeEventListener('keydown', onKeyDown)
      }
    }, { immediate: true })
  })
  onUnmounted(() => window.removeEventListener('keydown', onKeyDown))

  return {
    // 状态
    isActive,
    queue,
    currentIdx,
    currentCard,
    isFlipped,
    isCompleted,
    difficultySort,
    // 计算
    totalCards,
    remaining,
    progress,
    stats,
    // 触摸
    dragOffset, isDragging,
    onTouchStart, onTouchMove, onTouchEnd,
    // 方法
    start,
    startWithWords,
    exit,
    flip,
    markKnown,
    markHard,
    markEasy,
    markUnknown,
    skip,
    restart
  }
}
