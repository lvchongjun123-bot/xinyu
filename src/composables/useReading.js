import { ref, computed } from 'vue'

/**
 * 阅读理解模式的状态管理
 *
 * 数据流：
 * 1. 用户选择"阅读理解"模式 → startReading(passage)
 * 2. 显示文章 → 用户阅读 → 逐题作答
 * 3. 全部答完 → 显示分数 → 可重新开始
 */
export function useReading() {
  // ===== 状态 =====
  const passage = ref(null)           // 当前阅读文章对象
  const currentQuestionIndex = ref(0) // 当前题目索引
  const userAnswers = ref([])         // 用户答案数组 { questionId, answer, isCorrect }
  const showResult = ref(false)       // 是否显示最终结果
  const selectedOption = ref(-1)      // 当前题目选中的选项索引
  const tfAnswer = ref(null)          // 判断题答案 (true/false)
  const isReadingMode = ref(false)    // 是否在阅读模式

  // ponytail: optional callback for awarding XP on completion
  let _onComplete = null

  // ===== 计算属性 =====
  const currentQuestion = computed(() => {
    if (!passage.value) return null
    return passage.value.questions[currentQuestionIndex.value] || null
  })

  const totalQuestions = computed(() => passage.value?.questions.length || 0)

  const correctCount = computed(() =>
    userAnswers.value.filter(a => a.isCorrect).length
  )

  const score = computed(() => {
    if (totalQuestions.value === 0) return 0
    return Math.round((correctCount.value / totalQuestions.value) * 100)
  })

  const progress = computed(() => {
    if (totalQuestions.value === 0) return 0
    return Math.round((currentQuestionIndex.value / totalQuestions.value) * 100)
  })

  const isComplete = computed(() =>
    userAnswers.value.length === totalQuestions.value && totalQuestions.value > 0
  )

  // ===== 方法 =====
  function startReading(readingPassage, onComplete = null) {
    passage.value = readingPassage
    currentQuestionIndex.value = 0
    userAnswers.value = []
    showResult.value = false
    selectedOption.value = -1
    tfAnswer.value = null
    isReadingMode.value = true
    _onComplete = onComplete || null
  }

  function exitReading() {
    isReadingMode.value = false
    passage.value = null
    currentQuestionIndex.value = 0
    userAnswers.value = []
    showResult.value = false
    selectedOption.value = -1
    tfAnswer.value = null
  }

  /**
   * 提交当前题目的答案
   * @param {*} answer - 选择题为选项索引，判断题为 true/false
   */
  function submitAnswer(answer) {
    if (!currentQuestion.value) return false

    let isCorrect = false
    const q = currentQuestion.value

    if (q.type === 'choice') {
      isCorrect = answer === q.answer
    } else if (q.type === 'tf') {
      isCorrect = answer === q.answer
    }

    // ponytail: replace-on-duplicate — prevQuestion + re-answer now works
    const entry = { questionId: q.id, userAnswer: answer, correctAnswer: q.answer, isCorrect }
    const existingIdx = userAnswers.value.findIndex(a => a.questionId === q.id)
    if (existingIdx >= 0) {
      userAnswers.value[existingIdx] = entry
    } else {
      userAnswers.value.push(entry)
    }

    selectedOption.value = -1
    tfAnswer.value = null
    return isCorrect
  }

  function nextQuestion() {
    if (currentQuestionIndex.value < totalQuestions.value - 1) {
      currentQuestionIndex.value++
    } else {
      showResult.value = true
      // ponytail: fire completion callback for XP
      if (_onComplete) {
        const correct = userAnswers.value.filter(a => a.isCorrect).length
        _onComplete({ score: correct, total: totalQuestions.value, passage: passage.value })
      }
    }
  }

  function prevQuestion() {
    if (currentQuestionIndex.value > 0) {
      currentQuestionIndex.value--
    }
  }

  /**
   * 获取用户对某题的答案（用于回顾）
   */
  function getUserAnswer(questionIndex) {
    return userAnswers.value[questionIndex] || null
  }

  /**
   * 重新开始当前文章
   */
  function restart() {
    currentQuestionIndex.value = 0
    userAnswers.value = []
    showResult.value = false
    selectedOption.value = -1
    tfAnswer.value = null
  }

  return {
    // 状态
    passage,
    currentQuestionIndex,
    userAnswers,
    showResult,
    isReadingMode,
    // 计算
    currentQuestion,
    totalQuestions,
    correctCount,
    score,
    progress,
    isComplete,
    // 方法
    startReading,
    exitReading,
    submitAnswer,
    nextQuestion,
    prevQuestion,
    getUserAnswer,
    restart
  }
}
