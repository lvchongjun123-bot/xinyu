import { ref, computed } from 'vue'
import { playBeep } from '../utils/audio.js'

/**
 * 句子听打模式 v5 — 逐词填空 + 下划线书写 + 快捷键 + 语速调节 + 提示
 *
 * 流程：语音播报 → 逐词 input（下划线）→ 满长自动跳下一个
 *       → 提交 → 逐词判定对错 → 全对自动下一句 / 手动下一句
 *
 * 快捷键：Tab 下一词 | Shift+Tab 上一词 | Enter 提交/跳词 | Esc 跳过
 *
 * 注意：input 值用独立 wordInputs 数组存储（字符串），不放 words 对象中。
 *       因为 ref([]) 会 reactive() 包裹数组元素，自动展开嵌套 Ref，
 *       导致 ref('') 被解包为 '' → .value 访问失败。
 */

export function useSentenceTyping(speech, markWordFn = null, onWrongWordFn = null) {
  // ===== 状态 =====
  const isActive = ref(false)
  const currentIndex = ref(0)
  const submitted = ref(false)
  const isCompleted = ref(false)
  const focusIndex = ref(0)

  // 统计
  const startTime = ref(0)
  const totalWordsSubmitted = ref(0)
  const correctWordsCount = ref(0)
  const completedCount = ref(0)
  const totalCorrectChars = ref(0)
  const skippedCount = ref(0)

  // 数据
  const sentences = ref([])
  /** @type {Ref<Array<{text: string, correct: boolean|null, revealed: boolean}>>} */
  const words = ref([]) // 当前句子的词（不含 input ref）
  const wordInputs = ref([]) // 当前句子每个词的输入值（字符串数组）

  // 配置
  const speechRate = ref(0.8)
  const autoAdvanceTimer = ref(null)

  // 错题
  const wrongSentences = ref([])
  const reviewMode = ref(false)
  const originalSentences = ref(null)

  // 连续正确 & 计时
  const consecutiveStreak = ref(0)
  const sentenceStartTime = ref(0)
  const sentenceTimes = ref([])

  // ===== 计算 =====
  const totalSentences = computed(() => sentences.value.length)

  const currentSentence = computed(() =>
    sentences.value[currentIndex.value] || { sentence: '', sentence_cn: '', word: '', wordId: null, definition: '' }
  )

  const currentSentenceText = computed(() => currentSentence.value.sentence || '')

  const progress = computed(() =>
    totalSentences.value === 0 ? 0 : Math.round((currentIndex.value / totalSentences.value) * 100)
  )

  const wpm = computed(() => {
    const elapsed = (Date.now() - startTime.value) / 1000 / 60
    if (elapsed <= 0) return 0
    return Math.round((totalCorrectChars.value / 5) / elapsed)
  })

  const accuracy = computed(() => {
    if (totalWordsSubmitted.value === 0) return 100
    return Math.round((correctWordsCount.value / totalWordsSubmitted.value) * 100)
  })

  const elapsedSeconds = computed(() => {
    if (!startTime.value) return 0
    return Math.round((Date.now() - startTime.value) / 1000)
  })

  /** 当前句是否全部答对（不含已揭示词） */
  const isAllCorrect = computed(() => {
    if (!submitted.value) return false
    return words.value.every(w => w.correct === true || w.revealed === true)
  })

  /** 最近一句耗时（秒） */
  const latestSentenceTime = computed(() => {
    const times = sentenceTimes.value
    return times.length ? times[times.length - 1].seconds : 0
  })

  /** 平均单句耗时 */
  const avgSentenceTime = computed(() => {
    const times = sentenceTimes.value
    if (!times.length) return 0
    return Math.round(times.reduce((s, t) => s + t.seconds, 0) / times.length)
  })

  // ===== 内部方法 =====

  function buildWords(sentence) {
    const parts = sentence.split(' ')
    wordInputs.value = parts.map(() => '')
    words.value = parts.map(text => ({ text, correct: null, revealed: false }))
    sentenceStartTime.value = Date.now()
  }

  function clearAutoAdvance() {
    if (autoAdvanceTimer.value) {
      clearTimeout(autoAdvanceTimer.value)
      autoAdvanceTimer.value = null
    }
  }

  function saveWrongSentence() {
    wrongSentences.value.push({
      index: currentIndex.value,
      sentence: currentSentence.value.sentence,
      sentence_cn: currentSentence.value.sentence_cn,
      word: currentSentence.value.word,
      wordId: currentSentence.value.wordId,
      definition: currentSentence.value.definition,
      words: words.value.map(w => ({ text: w.text, correct: w.correct })),
      wordInputs: [...wordInputs.value]
    })
    // 即时写入全局错题本（不再等 goHome 批量收集，防止关浏览器丢数据）
    if (onWrongWordFn && currentSentence.value.wordId) {
      onWrongWordFn({
        id: currentSentence.value.wordId,
        word: currentSentence.value.word,
        definition: currentSentence.value.definition
      })
    }
  }

  // ===== 公开方法 =====

  function start(rawWords) {
    const filtered = (rawWords || [])
      .filter(w => w.sentence?.trim())
      .map(w => ({
        sentence: w.sentence.trim(),
        sentence_cn: w.sentence_cn || '',
        word: w.word || '',
        wordId: w.id,
        definition: w.definition || ''
      }))
    if (!filtered.length) return false

    sentences.value = filtered.sort(() => Math.random() - 0.5)

    isActive.value = true
    currentIndex.value = 0
    submitted.value = false
    isCompleted.value = false
    reviewMode.value = false
    originalSentences.value = null
    focusIndex.value = 0
    startTime.value = Date.now()
    totalWordsSubmitted.value = 0
    correctWordsCount.value = 0
    completedCount.value = 0
    totalCorrectChars.value = 0
    skippedCount.value = 0
    consecutiveStreak.value = 0
    sentenceTimes.value = []
    wrongSentences.value = []
    buildWords(sentences.value[0].sentence)

    speakCurrent()
    return true
  }

  function exit() {
    clearAutoAdvance()
    isActive.value = false
    submitted.value = false
    speech.stopAll()
  }

  function restart() {
    exit()
    const source = (reviewMode.value && originalSentences.value) ? originalSentences.value : sentences.value
    start(source.map(s => ({
      sentence: s.sentence,
      sentence_cn: s.sentence_cn,
      word: s.word,
      id: s.wordId,
      definition: s.definition
    })))
  }

  function speakCurrent() {
    const text = currentSentenceText.value
    if (!text || !speech) return
    speech.speak(text, { lang: 'en-US', rate: speechRate.value })
  }

  /** 提交：逐词比对，忽略大小写，揭示词不计入统计 */
  function submit() {
    if (submitted.value || !isActive.value) return

    submitted.value = true
    clearAutoAdvance()

    let allCorrect = true

    for (let i = 0; i < words.value.length; i++) {
      const w = words.value[i]
      const userWord = (wordInputs.value[i] || '').trim()

      // 揭示词不计入统计
      if (w.revealed) continue

      totalWordsSubmitted.value++

      if (userWord.toLowerCase() === w.text.toLowerCase()) {
        w.correct = true
        correctWordsCount.value++
        totalCorrectChars.value += w.text.length
      } else {
        w.correct = false
        allCorrect = false
      }
    }

    // 记录单句耗时
    sentenceTimes.value.push({
      seconds: Math.round((Date.now() - sentenceStartTime.value) / 1000)
    })

    if (allCorrect) {
      completedCount.value++
      consecutiveStreak.value++
      playBeep('correct')
      // 调用学习计划回调
      if (markWordFn && currentSentence.value.wordId) {
        markWordFn(currentSentence.value.wordId)
      }
      // 全对自动下一句（1.2s 延迟）
      autoAdvanceTimer.value = setTimeout(() => {
        nextSentence()
      }, 1200)
    } else {
      consecutiveStreak.value = 0
      playBeep('error')
      // 记录错题供复习
      saveWrongSentence()
    }
  }

  function nextSentence() {
    clearAutoAdvance()
    submitted.value = false
    focusIndex.value = 0

    if (currentIndex.value < totalSentences.value - 1) {
      currentIndex.value++
      buildWords(sentences.value[currentIndex.value].sentence)
      speakCurrent()
    } else {
      isCompleted.value = true
      speech.stopAll()
    }
  }

  /** 跳过当前句：所有空词标记为揭示，不计入统计 */
  function skipSentence() {
    if (submitted.value || !isActive.value) return

    clearAutoAdvance()

    // 标记所有未填词为揭示
    for (let i = 0; i < words.value.length; i++) {
      const val = (wordInputs.value[i] || '').trim()
      if (!val) {
        words.value[i].revealed = true
      }
    }

    // 对已填词提交判定
    let allCorrect = true
    for (let i = 0; i < words.value.length; i++) {
      const w = words.value[i]
      const userWord = (wordInputs.value[i] || '').trim()

      if (w.revealed || !userWord) continue

      totalWordsSubmitted.value++
      if (userWord.toLowerCase() === w.text.toLowerCase()) {
        w.correct = true
        correctWordsCount.value++
        totalCorrectChars.value += w.text.length
      } else {
        w.correct = false
        allCorrect = false
      }
    }

    skippedCount.value++
    consecutiveStreak.value = 0

    // 记录错题
    if (!allCorrect) {
      saveWrongSentence()
    }

    nextSentence()
  }

  /** 提示：揭示下一个空白词 */
  function revealNextWord() {
    if (submitted.value) return

    for (let i = 0; i < words.value.length; i++) {
      const val = (wordInputs.value[i] || '').trim()
      if (!val) {
        wordInputs.value[i] = words.value[i].text
        words.value[i].revealed = true
        // 如果揭示后所有词都有输入，聚焦最后一个
        const allFilled = wordInputs.value.every(v => (v || '').trim().length > 0)
        if (allFilled) {
          focusIndex.value = words.value.length - 1
        }
        return
      }
    }
  }

  /** input 事件：满长自动跳下一个 */
  function onWordInput(wordIndex) {
    const w = words.value[wordIndex]
    if (!w) return
    if ((wordInputs.value[wordIndex] || '').length >= w.text.length) {
      const nextIdx = wordIndex + 1
      if (nextIdx < words.value.length) {
        focusIndex.value = nextIdx
      }
    }
  }

  /** keydown 事件：退格跳回 / Enter 提交 / Tab 导航 */
  function onWordKeydown(wordIndex, e) {
    if (e.key === 'Backspace') {
      const val = wordInputs.value[wordIndex] || ''
      if (val.length === 0 && wordIndex > 0) {
        e.preventDefault()
        focusIndex.value = wordIndex - 1
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (wordIndex === words.value.length - 1) {
        submit()
      } else {
        focusIndex.value = wordIndex + 1
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        // Shift+Tab → 上一词
        focusIndex.value = Math.max(wordIndex - 1, 0)
      } else {
        // Tab → 下一词
        focusIndex.value = Math.min(wordIndex + 1, words.value.length - 1)
      }
    }
  }

  /** 开始错题复习 */
  function startReview() {
    if (!wrongSentences.value.length) return

    // 备份原句
    if (!originalSentences.value) {
      originalSentences.value = sentences.value
    }

    reviewMode.value = true
    isCompleted.value = false
    currentIndex.value = 0
    submitted.value = false
    focusIndex.value = 0

    // 用错题替换 sentences
    sentences.value = wrongSentences.value.map(ws => ({
      sentence: ws.sentence,
      sentence_cn: ws.sentence_cn,
      word: ws.word,
      wordId: ws.wordId,
      definition: ws.definition
    }))

    // 清空错题列表（准备新一轮收集）
    wrongSentences.value = []

    buildWords(sentences.value[0].sentence)
    speakCurrent()
  }

  return {
    // 状态
    isActive, currentIndex, submitted, isCompleted,
    sentences, words, wordInputs, focusIndex,
    // 配置
    speechRate,
    // 统计
    completedCount, correctWordsCount, totalWordsSubmitted,
    skippedCount,
    // 错题
    wrongSentences, reviewMode,
    // 连续 & 计时
    consecutiveStreak, sentenceTimes,
    // 计算
    totalSentences, currentSentence, currentSentenceText,
    progress, wpm, accuracy, elapsedSeconds,
    isAllCorrect, latestSentenceTime, avgSentenceTime,
    // 方法
    start, exit, restart, submit, nextSentence, speakCurrent,
    skipSentence, revealNextWord, startReview,
    onWordInput, onWordKeydown
  }
}
