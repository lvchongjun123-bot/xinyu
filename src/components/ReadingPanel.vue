<template>
  <div class="reading-panel card">
    <!-- 工具栏 -->
    <div class="reading-toolbar">
      <h3>📖 {{ passage?.title || '阅读理解' }}</h3>
      <button class="btn btn-outline" @click="$emit('exit')">退出</button>
    </div>

    <!-- 结果页 -->
    <div v-if="showResult" class="reading-result">
      <div class="result-icon">{{ resultIcon }}</div>
      <div class="result-score">{{ score }}分</div>
      <div class="result-detail">
        {{ correctCount }} / {{ totalQuestions }} 题正确
      </div>
      <div class="result-review">
        <h4>📋 答案解析</h4>
        <div
          v-for="(q, i) in passage.questions"
          :key="q.id"
          class="review-item"
          :class="{ correct: userAnswers[i]?.isCorrect, wrong: !userAnswers[i]?.isCorrect }"
        >
          <div class="review-question">
            <span class="review-badge">{{ userAnswers[i]?.isCorrect ? '✅' : '❌' }}</span>
            第{{ i + 1 }}题. {{ q.question }}
          </div>
          <div class="review-answers">
            <template v-if="q.type === 'choice'">
              <div v-for="(opt, oi) in q.options" :key="oi"
                   :class="{ 'correct-answer': oi === q.answer, 'user-wrong': oi === userAnswers[i]?.userAnswer && !userAnswers[i]?.isCorrect }">
                {{ opt }}
              </div>
            </template>
            <template v-else>
              <div>你的答案: {{ userAnswers[i]?.userAnswer ? 'True' : 'False' }}</div>
              <div>正确答案: {{ q.answer ? 'True' : 'False' }}</div>
            </template>
            <div class="review-explanation" v-if="q.explanation">
              💡 {{ q.explanation }}
            </div>
          </div>
        </div>
      </div>
      <div class="result-actions">
        <button class="btn btn-outline" @click="restart">🔄 重新作答</button>
        <button class="btn btn-primary" @click="$emit('exit')">返回首页</button>
      </div>
    </div>

    <!-- 答题页 -->
    <template v-else>
      <!-- 进度条 -->
      <div class="reading-progress">
        <span>第 {{ currentQuestionIndex + 1 }} / {{ totalQuestions }} 题</span>
        <div class="progress-bar">
          <div class="progress-bar-fill" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>

      <!-- 文章区（始终显示，可折叠） -->
      <div class="reading-passage">
        <div class="passage-header" @click="passageCollapsed = !passageCollapsed">
          <div class="passage-source" v-if="passage?.source">📰 {{ passage.source }}</div>
          <span class="passage-toggle">{{ passageCollapsed ? '展开原文 ▲' : '收起原文 ▼' }}</span>
        </div>
        <div v-if="!passageCollapsed" class="passage-text">{{ passage?.passage }}</div>
        <div v-if="!passageCollapsed && passage?.words?.length" class="passage-vocab">
          <span class="vocab-label">📚 本文重点词汇：</span>
          <span v-for="w in passage.words" :key="w" class="vocab-tag">{{ w }}</span>
        </div>
      </div>

      <!-- 题目区 -->
      <Transition name="view-fade" mode="out-in">
      <div class="reading-question-area" v-if="currentQuestion" :key="currentQuestionIndex">
        <div class="question-type-badge">
          {{ currentQuestion.type === 'choice' ? '单选题' : '判断题' }}
        </div>
        <div class="question-text">{{ currentQuestion.question }}</div>

        <!-- 选择题选项 -->
        <div v-if="currentQuestion.type === 'choice'" class="question-options">
          <button
            v-for="(opt, oi) in currentQuestion.options"
            :key="oi"
            class="option-btn"
            :class="{ selected: selectedOption === oi, revealed: submittedForCurrent }"
            :disabled="submittedForCurrent"
            @click="selectOption(oi)"
          >
            <span class="option-letter">{{ ['A','B','C','D'][oi] }}</span>
            <span class="option-text">{{ opt.slice(3) }}</span>
          </button>
        </div>

        <!-- 判断题选项 -->
        <div v-else class="question-options tf-options">
          <button class="option-btn" :class="{ selected: tfAnswer === true }"
                  :disabled="submittedForCurrent" @click="tfAnswer = true">
            <span class="option-letter">T</span>
            <span class="option-text">正确 (True)</span>
          </button>
          <button class="option-btn" :class="{ selected: tfAnswer === false }"
                  :disabled="submittedForCurrent" @click="tfAnswer = false">
            <span class="option-letter">F</span>
            <span class="option-text">错误 (False)</span>
          </button>
        </div>

        <!-- 提交后的反馈 -->
        <div v-if="submittedForCurrent" class="question-feedback" :class="lastAnswerCorrect ? 'correct' : 'wrong'">
          <span v-if="lastAnswerCorrect">✅ 回答正确！</span>
          <span v-else>
            ❌ 回答错误！
            <template v-if="currentQuestion.type === 'choice'">
              正确答案是 {{ ['A','B','C','D'][currentQuestion.answer] }}
            </template>
            <template v-else>
              正确答案是 {{ currentQuestion.answer ? 'True（正确）' : 'False（错误）' }}
            </template>
          </span>
          <div v-if="currentQuestion.explanation" class="feedback-explanation">
            💡 {{ currentQuestion.explanation }}
          </div>
        </div>
      </div>

      </Transition>

      <!-- 底部导航 -->
      <div class="reading-nav">
        <button class="btn btn-outline" @click="prevQuestion"
                :disabled="currentQuestionIndex === 0">
          ← 上一题
        </button>
        <button v-if="!submittedForCurrent"
                class="btn btn-primary"
                :disabled="!canSubmit"
                @click="handleSubmit">
          提交答案
        </button>
        <button v-else
                class="btn btn-primary" @click="handleNext">
          {{ isLastQuestion ? '查看结果 →' : '下一题 →' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  passage: { type: Object, default: null },
  currentQuestionIndex: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  userAnswers: { type: Array, default: () => [] },
  showResult: { type: Boolean, default: false },
  correctCount: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  progress: { type: Number, default: 0 },
})

const emit = defineEmits(['submit-answer', 'next-question', 'prev-question', 'restart', 'exit'])

// 本地状态
const selectedOption = ref(-1)
const tfAnswer = ref(null)
const submittedForCurrent = ref(false)
const lastAnswerCorrect = ref(false)
const passageCollapsed = ref(false) // 原文折叠状态

// 计算
const currentQuestion = computed(() => {
  if (!props.passage) return null
  return props.passage.questions[props.currentQuestionIndex] || null
})

const isLastQuestion = computed(() =>
  props.currentQuestionIndex >= props.totalQuestions - 1
)

const canSubmit = computed(() => {
  if (!currentQuestion.value) return false
  return currentQuestion.value.type === 'choice'
    ? selectedOption.value >= 0
    : tfAnswer.value !== null
})

const resultIcon = computed(() => {
  const s = props.score
  if (s >= 80) return '🎉'
  if (s >= 60) return '👍'
  return '📚'
})

// 监听题目切换：重置本地状态
watch(() => props.currentQuestionIndex, () => {
  selectedOption.value = -1
  tfAnswer.value = null
  submittedForCurrent.value = false
  lastAnswerCorrect.value = false
})

// 也监听 passage 变化（首次加载）
watch(() => props.passage, () => {
  selectedOption.value = -1
  tfAnswer.value = null
  submittedForCurrent.value = false
  lastAnswerCorrect.value = false
})

function selectOption(index) {
  if (submittedForCurrent.value) return
  selectedOption.value = index
}

function handleSubmit() {
  if (submittedForCurrent.value) return
  const answer = currentQuestion.value.type === 'choice'
    ? selectedOption.value
    : tfAnswer.value

  emit('submit-answer', answer)
  submittedForCurrent.value = true

  // 判断对错（从 userAnswers 中取最后一个）
  const last = props.userAnswers[props.userAnswers.length - 1]
  lastAnswerCorrect.value = last ? last.isCorrect : false
}

function handleNext() {
  emit('next-question')
  // 重置会在 watch currentQuestionIndex 中处理
}

function prevQuestion() {
  if (props.currentQuestionIndex > 0) {
    emit('prev-question')
  }
}

function restart() {
  emit('restart')
}

// ── 键盘快捷键 ──
function onKeydown(e) {
  if (props.showResult) return
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

  const q = currentQuestion.value
  if (!q) return

  if (!submittedForCurrent.value) {
    if (q.type === 'choice') {
      const keyMap = { a: 0, b: 1, c: 2, d: 3 }
      if (keyMap[e.key.toLowerCase()] !== undefined) selectOption(keyMap[e.key.toLowerCase()])
    } else if (q.type === 'tf') {
      if (e.key.toLowerCase() === 't') tfAnswer.value = true
      if (e.key.toLowerCase() === 'f') tfAnswer.value = false
    }
    if (e.key === 'Enter' && canSubmit.value) handleSubmit()
  } else {
    if (e.key === 'Enter') handleNext()
  }
  if (e.key === 'ArrowRight') handleNext()
  if (e.key === 'ArrowLeft') prevQuestion()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>
