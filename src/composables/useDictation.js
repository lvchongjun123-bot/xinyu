import { ref, computed, nextTick } from 'vue'

export function useDictation(speech, onWrongWord = null, markWordFn = null) {
  const isDictationMode = ref(false)
  const dictationType = ref('word')
  const currentDictationIndex = ref(0)
  const userAnswer = ref('')
  const showHint = ref(false)
  const showFeedback = ref(false)
  const isCorrect = ref(false)
  const dictationWords = ref([])
  /** 听写完成统计 */
  const isCompleted = ref(false)
  const correctList = ref([])
  const wrongList = ref([])
  const dictationElapsed = ref(0)
  let _dictStartTime = 0

  const currentDictationItem = computed(() => dictationWords.value[currentDictationIndex.value] || {})

  const correctAnswer = computed(() =>
    dictationType.value === 'word'
      ? currentDictationItem.value.word || ''
      : currentDictationItem.value.sentence || ''
  )

  function startDictation(words, type) {
    if (!words.length) return

    isDictationMode.value = true
    dictationType.value = type
    dictationWords.value = [...words].sort(() => Math.random() - 0.5)
    currentDictationIndex.value = 0
    userAnswer.value = ''
    showHint.value = false
    showFeedback.value = false
    isCompleted.value = false
    correctList.value = []
    wrongList.value = []
    dictationElapsed.value = 0
    _dictStartTime = Date.now()
  }

  function playCurrent() {
    const text = dictationType.value === 'word'
      ? currentDictationItem.value.word
      : currentDictationItem.value.sentence
    if (!text) return
    speech.speak(text, { lang: 'en-US', rate: 0.85 })
  }

  function submitAnswer(answer) {
    if (!answer?.trim() || showFeedback.value) return
    showFeedback.value = true
    isCorrect.value = answer.trim().toLowerCase() === correctAnswer.value.toLowerCase()
    // 记录统计
    if (isCorrect.value) {
      correctList.value.push({ ...currentDictationItem.value })
    } else {
      wrongList.value.push({ ...currentDictationItem.value })
    }
    // 记录错词
    if (!isCorrect.value && onWrongWord && currentDictationItem.value.id) {
      onWrongWord(currentDictationItem.value)
    }
    // 答对时驱动 FSRS + 游戏化（之前听写模式未接入 onWordLearned）
    if (isCorrect.value && markWordFn && currentDictationItem.value.id) {
      markWordFn(currentDictationItem.value.id)
    }
  }

  function nextItem() {
    if (currentDictationIndex.value < dictationWords.value.length - 1) {
      currentDictationIndex.value++
      userAnswer.value = ''
      showHint.value = false
      showFeedback.value = false
    } else {
      dictationElapsed.value = Math.round((Date.now() - _dictStartTime) / 1000)
      isCompleted.value = true
    }
  }

  function restartDictation() {
    const words = dictationWords.value
    const type = dictationType.value
    exitDictation()
    startDictation(words, type)
  }

  function exitDictation() {
    speech.stopAll()
    isDictationMode.value = false
  }

  return {
    isDictationMode, dictationType, currentDictationIndex,
    userAnswer, showHint, showFeedback, isCorrect,
    dictationWords, currentDictationItem, correctAnswer,
    isCompleted, correctList, wrongList, dictationElapsed,
    startDictation, playCurrent, submitAnswer, nextItem, restartDictation, exitDictation
  }
}
