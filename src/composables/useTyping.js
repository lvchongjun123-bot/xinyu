import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { playBeep } from '../utils/audio.js'

/**
 * 打字练习模式状态机
 *
 * 参考 Qwerty Learner 设计：
 * - 逐字母输入校验
 * - 输错 → 整词清空重来（避免错误肌肉记忆）
 * - 实时统计：WPM、正确率、用时
 * - 音效反馈：正确/错误 beep（共享 AudioContext，避免每次新建）
 */

export function useTyping(words, speech, onWrongWord = null, markWordFn = null) {
  // ===== 状态 =====
  const isActive = ref(false)
  const currentIndex = ref(0)
  const userInput = ref('')
  const isWrong = ref(false) // 当前是否有错误（触发抖动）
  const showDefinition = ref(false) // 完成当前词后显示释义
  const isCompleted = ref(false)
  const difficultySort = ref(false) // 难度排序

  // 内部排序后的词表副本（避免修改父数组）
  const _sortedWords = ref([])

  // 统计
  const startTime = ref(0)
  const _snapshotTime = ref(0)  // ponytail: frozen timestamp at completion (Date.now() non-reactive)
  const totalKeystrokes = ref(0) // 总击键数
  const correctKeystrokes = ref(0) // 正确击键数
  const completedWords = ref(0)
  const wordTimes = ref([]) // 每个词的完成时间 (ms)

  // ===== 计算 =====
  const totalWords = computed(() => _sortedWords.value?.length || 0)

  const currentWord = computed(() => {
    if (!_sortedWords.value?.length) return null
    return _sortedWords.value[currentIndex.value] || null
  })

  const currentWordText = computed(() => currentWord.value?.word || '')

  /** 逐字母状态: 'pending' | 'correct' | 'wrong' */
  const letterStates = computed(() => {
    const word = currentWordText.value
    const input = userInput.value
    const states = []
    for (let i = 0; i < word.length; i++) {
      if (i >= input.length) {
        states.push('pending')
      } else if (input[i] === word[i]) {
        states.push('correct')
      } else {
        states.push('wrong')
      }
    }
    return states
  })

  const progress = computed(() =>
    totalWords.value === 0 ? 0 : Math.round((currentIndex.value / totalWords.value) * 100)
  )

  /** WPM = (正确击键数 / 5) / 分钟数 */
  const wpm = computed(() => {
    const now = isCompleted.value && _snapshotTime.value ? _snapshotTime.value : Date.now()
    const elapsed = (now - startTime.value) / 1000 / 60
    if (elapsed <= 0) return 0
    return Math.round((correctKeystrokes.value / 5) / elapsed)
  })

  const accuracy = computed(() => {
    if (totalKeystrokes.value === 0) return 100
    return Math.round((correctKeystrokes.value / totalKeystrokes.value) * 100)
  })

  const elapsedSeconds = computed(() => {
    if (!startTime.value) return 0
    const now = isCompleted.value && _snapshotTime.value ? _snapshotTime.value : Date.now()
    return Math.round((now - startTime.value) / 1000)
  })

  const avgTimePerWord = computed(() => {
    if (wordTimes.value.length === 0) return 0
    const avg = wordTimes.value.reduce((a, b) => a + b, 0) / wordTimes.value.length
    return Math.round(avg / 1000 * 10) / 10 // 秒，保留1位小数
  })

  // ===== 方法 =====
  function start() {
    isActive.value = true
    currentIndex.value = 0
    userInput.value = ''
    isWrong.value = false
    showDefinition.value = false
    isCompleted.value = false
    startTime.value = Date.now()
    totalKeystrokes.value = 0
    correctKeystrokes.value = 0
    completedWords.value = 0
    wordTimes.value = []
    // 复制词表副本，排序（避免修改父数组）
    if (words.value?.length) {
      const sorted = [...words.value]
      if (difficultySort.value) {
        sorted.sort((a, b) => (a.word?.length || 0) - (b.word?.length || 0))
      } else {
        sorted.sort(() => Math.random() - 0.5)
      }
      _sortedWords.value = sorted
    }
    // 自动播放当前单词
    speakCurrent()
  }

  function exit() {
    isActive.value = false
    if (speech?.stopAll) speech.stopAll()
  }

  function restart() {
    exit()
    start()
  }

  function speakCurrent() {
    if (!currentWord.value || !speech) return
    speech.speak(currentWord.value.word, { lang: 'en-US', rate: 0.85 })
  }

  /** 处理键盘输入 */
  function handleKeydown(e) {
    if (!isActive.value || isCompleted.value) return
    if (showDefinition.value) {
      // 完成当前词后，按任意键进入下一个词
      nextWord()
      return
    }

    const word = currentWordText.value

    // 忽略功能键
    if (e.key.length > 1 && e.key !== 'Backspace') return

    if (e.key === 'Backspace') {
      if (userInput.value.length > 0) {
        userInput.value = userInput.value.slice(0, -1)
        isWrong.value = false
      }
      return
    }

    // 只处理字母输入
    if (!/^[a-zA-Z]$/.test(e.key)) return

    const pos = userInput.value.length
    totalKeystrokes.value++

    if (pos >= word.length) return // 已经输入完整

    const expectedChar = word[pos]
    const typedChar = e.key.toLowerCase()

    if (typedChar === expectedChar.toLowerCase()) {
      userInput.value += expectedChar
      correctKeystrokes.value++

      // 检查是否完成当前词
      if (userInput.value.length === word.length) {
        onWordComplete()
      }
    } else {
      // 输错 → 整词清空重来
      isWrong.value = true
      userInput.value = ''
      playBeep('error')

      // 记录错词
      if (onWrongWord && currentWord.value?.id) {
        onWrongWord(currentWord.value)
      }

      // 短暂显示错误后清除
      setTimeout(() => {
        if (isWrong.value) isWrong.value = false
      }, 500)
    }
  }

  function onWordComplete() {
    completedWords.value++
    const elapsed = Date.now() - startTime.value
    wordTimes.value.push(elapsed)

    playBeep('correct')

    // 记录到学习计划 + 游戏化
    if (markWordFn && currentWord.value?.id) {
      markWordFn(currentWord.value.id, 3)
    }

    // 显示释义
    showDefinition.value = true
  }

  function nextWord() {
    showDefinition.value = false
    userInput.value = ''
    isWrong.value = false

    if (currentIndex.value < totalWords.value - 1) {
      currentIndex.value++
      speakCurrent()
    } else {
      _snapshotTime.value = Date.now()  // ponytail: freeze timer at completion
      isCompleted.value = true
    }
  }

  // ===== 键盘监听（仅在 active 时注册，避免全局泄漏） =====
  function onKeyDown(e) { handleKeydown(e) }

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
    currentIndex,
    userInput,
    isWrong,
    showDefinition,
    isCompleted,
    difficultySort,
    // 计算
    totalWords,
    currentWord,
    currentWordText,
    letterStates,
    progress,
    wpm,
    accuracy,
    elapsedSeconds,
    avgTimePerWord,
    completedWords,
    // 方法
    start,
    exit,
    restart,
    nextWord,
    speakCurrent
  }
}
