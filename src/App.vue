<template>
  <div :class="{ dark }">
    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-card card">
      <h3>❌ 数据加载失败</h3>
      <p>{{ errorMessage }}</p>
      <p>请检查 src/data/word.js 文件是否存在且格式正确</p>
    </div>

    <!-- 加载中提示 -->
    <div v-else-if="isLoading" class="loading-card card">
      <h3>⏳ 数据加载中...</h3>
    </div>

    <!-- 正常内容 -->
    <template v-else>
      <!-- 头部标题 -->
      <header class="header">
        <h1 class="title">📚 高中英语词汇</h1>
        <p class="subtitle">新东方乱序版 · 词根+联想记忆法</p>
      </header>

      <!-- 控制按钮组 -->
      <div class="btn-group">
        <button class="btn btn-outline" @click="dark = !dark">
          {{ dark ? '☀️ 日间' : '🌙 夜间' }}
        </button>
        <button class="btn btn-outline" @click="showPhonetic = !showPhonetic">
          {{ showPhonetic ? '🔤 隐藏音标' : '🔤 显示音标' }}
        </button>
        <button class="btn btn-outline" @click="showDefinition = !showDefinition">
          {{ showDefinition ? '📖 隐藏释义' : '📖 显示释义' }}
        </button>
        <button class="btn btn-outline" @click="showOnlyUnmastered = !showOnlyUnmastered">
          {{ showOnlyUnmastered ? '📚 全部单词' : '⭕ 未掌握' }}
        </button>
        <button class="btn btn-primary" @click="playAll">
          {{ isPlayingAll ? '⏹️ 停止' : '▶️ 全部播放' }}
        </button>
        <button class="btn btn-success" @click="startWordDictation">
          🎧 单词听写
        </button>
        <button class="btn btn-success" @click="startSentenceDictation">
          📝 句子听写
        </button>
      </div>

      <!-- 单元选择和搜索 -->
      <div class="controls">
        <div class="control-item">
          <label>选择单元：</label>
          <select v-model="unitId" class="unit-select">
            <option v-for="unit in units" :key="unit.id" :value="unit.id">
              {{ unit.name }} ({{ unit.words.length }}词)
            </option>
          </select>
        </div>
        <div class="control-item search-item">
          <input
            v-model="q"
            type="text"
            placeholder="🔍 搜索单词或释义..."
            class="search-input"
          />
        </div>
      </div>

      <!-- 学习进度 -->
      <div class="progress-card card">
        <div class="progress-header">
          <span class="progress-title">学习进度</span>
          <span class="progress-percent">{{ progressPercent }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-bar-fill" :style="{ width: `${progressPercent}%` }"></div>
        </div>
        <div class="progress-stats">
          <span>已掌握: {{ masteredCount }}</span>
          <span>未掌握: {{ unmasteredCount }}</span>
          <span>总计: {{ totalCount }}</span>
        </div>
      </div>

      <!-- 听写模式 -->
      <div v-if="isDictationMode" class="dictation-card card">
        <div class="dictation-header">
          <h3>{{ dictationType === 'word' ? '🎧 单词听写' : '📝 句子听写' }}</h3>
          <button class="btn btn-outline" @click="exitDictation">退出</button>
        </div>

        <div class="dictation-content">
          <div class="dictation-progress">
            <span>第 {{ currentDictationIndex + 1 }} / {{ dictationWords.length }} 个</span>
            <div class="progress-bar">
              <div class="progress-bar-fill" :style="{ width: `${((currentDictationIndex + 1) / dictationWords.length) * 100}%` }"></div>
            </div>
          </div>

          <div class="dictation-controls">
            <button class="btn btn-primary" @click="playCurrentDictation">🔊 播放</button>
            <button class="btn btn-outline" @click="showHint = !showHint">
              {{ showHint ? '隐藏提示' : '💡 显示提示' }}
            </button>
          </div>

          <div v-if="showHint" class="hint">
            <span v-if="dictationType === 'word'">音标: {{ currentDictationItem.phonetic }}</span>
            <span v-else>单词: {{ currentDictationItem.word }}</span>
          </div>

          <div class="answer-input">
            <input
              v-model="userAnswer"
              :placeholder="dictationType === 'word' ? '请输入你听到的单词...' : '请输入你听到的句子...'"
              @keyup.enter="submitAnswer"
              ref="answerInput"
            />
            <button class="btn btn-success" @click="submitAnswer">提交</button>
          </div>

          <div v-if="showFeedback" class="feedback" :class="{ correct: isCorrect, wrong: !isCorrect }">
            <span v-if="isCorrect">✅ 回答正确！太棒了！</span>
            <span v-else>❌ 回答错误！正确答案是: {{ correctAnswer }}</span>
          </div>

          <div v-if="showFeedback" class="next-btn">
            <button class="btn btn-primary" @click="nextDictationItem">下一个</button>
          </div>
        </div>
      </div>

      <!-- 单词列表 -->
      <div v-else class="word-list">
        <WordCard
          v-for="(word, index) in filteredWords"
          :key="word.id"
          :word-data="word"
          :index="index"
          :show-phonetic="showPhonetic"
          :show-definition="showDefinition"
          :is-playing="currentPlayingIndex === index"
          @toggle-master="toggleMaster"
          @play="playWord"
        />
      </div>

      <!-- 空状态 -->
      <div v-if="filteredWords.length === 0 && !isDictationMode" class="empty-state">
        <p>没有找到匹配的单词</p>
      </div>

      <!-- 底部 -->
      <footer class="footer">
        <p>点击卡片播放美式发音 · 点击国旗切换英式发音</p>
        <p>数据自动保存到本地 · 刷新不丢失</p>
      </footer>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import WordCard from './components/WordCard.vue'

// ---------- 状态管理 ----------
const errorMessage = ref('')
const isLoading = ref(true)
const units = ref([])

// 异步导入数据
import('./data/word.js')
  .then(module => {
    const data = module.default
    if (!Array.isArray(data)) {
      throw new Error('数据文件必须导出一个数组')
    }
    if (data.length === 0) {
      throw new Error('数据文件为空数组')
    }
    if (!data[0].id || !data[0].name || !Array.isArray(data[0].words)) {
      throw new Error('数据结构错误，每个单元必须包含 id、name 和 words 数组')
    }
    units.value = data
    isLoading.value = false
    errorMessage.value = ''
  })
  .catch(e => {
    isLoading.value = false
    errorMessage.value = e.message
    console.error('数据导入失败:', e)
  })

// 应用状态
const unitId = ref(1)
const dark = ref(false)
const showPhonetic = ref(true)
const showDefinition = ref(true)
const showOnlyUnmastered = ref(false)
const isPlayingAll = ref(false)
const currentPlayingIndex = ref(-1)
const q = ref('')

// 听写模式状态
const isDictationMode = ref(false)
const dictationType = ref('word')
const currentDictationIndex = ref(0)
const userAnswer = ref('')
const showHint = ref(false)
const showFeedback = ref(false)
const isCorrect = ref(false)
const dictationWords = ref([])
const answerInput = ref(null)

// ---------- 初始化 ----------
onMounted(() => {
  dark.value = localStorage.getItem('darkMode') === 'true'
  unitId.value = parseInt(localStorage.getItem('selectedUnitId') || '1')
})

// ---------- 计算属性 ----------
const currentUnit = computed(() => {
  if (errorMessage.value || isLoading.value || units.value.length === 0) return null
  return units.value.find(u => u.id === unitId.value)
})

const currentWords = computed(() => {
  if (!currentUnit.value || !currentUnit.value.words) return []
  return currentUnit.value.words.map(word => ({
    ...word,
    mastered: localStorage.getItem('mastered_' + word.id) === 'true'
  }))
})

const filteredWords = computed(() => {
  let words = currentWords.value
  if (q.value.trim()) {
    const query = q.value.trim().toLowerCase()
    words = words.filter(word =>
      word.word.toLowerCase().includes(query) ||
      word.definition.toLowerCase().includes(query) ||
      (word.sentence && word.sentence.toLowerCase().includes(query))
    )
  }
  if (showOnlyUnmastered.value) {
    words = words.filter(word => !word.mastered)
  }
  return words
})

const totalCount = computed(() => currentWords.value.length)
const masteredCount = computed(() => currentWords.value.filter(w => w.mastered).length)
const unmasteredCount = computed(() => totalCount.value - masteredCount.value)
const progressPercent = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((masteredCount.value / totalCount.value) * 100)
})

const currentDictationItem = computed(() => dictationWords.value[currentDictationIndex.value])
const correctAnswer = computed(() => {
  if (dictationType.value === 'word') {
    return currentDictationItem.value?.word || ''
  } else {
    return currentDictationItem.value?.sentence || ''
  }
})

// ---------- 语音播放（Web Speech API）----------
const playWord = (index, type = 'us') => {
  window.speechSynthesis.cancel()

  const word = filteredWords.value[index].word
  if (!word) return

  const utterance = new SpeechSynthesisUtterance(word)
  utterance.lang = type === 'uk' ? 'en-GB' : 'en-US'
  utterance.rate = 0.9

  utterance.onend = () => {
    if (isPlayingAll.value) {
      const nextIndex = currentPlayingIndex.value + 1
      if (nextIndex < filteredWords.value.length) {
        setTimeout(() => playWord(nextIndex), 1000)
      } else {
        stopAll()
      }
    } else {
      currentPlayingIndex.value = -1
    }
  }

  window.speechSynthesis.speak(utterance)
  currentPlayingIndex.value = index
}

const playCurrentDictation = () => {
  window.speechSynthesis.cancel()

  const text = dictationType.value === 'word'
    ? currentDictationItem.value.word
    : currentDictationItem.value.sentence

  if (!text) return

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  utterance.rate = 0.9

  // 听写模式下不需要自动连播
  utterance.onend = null

  window.speechSynthesis.speak(utterance)
}

const stopAll = () => {
  window.speechSynthesis.cancel()
  isPlayingAll.value = false
  currentPlayingIndex.value = -1
}

const exitDictation = () => {
  window.speechSynthesis.cancel()
  isDictationMode.value = false
}

// ---------- 单词播放控制 ----------
const playAll = () => {
  if (isPlayingAll.value) {
    stopAll()
    return
  }
  if (filteredWords.value.length === 0) return

  isPlayingAll.value = true
  currentPlayingIndex.value = 0
  playWord(0)
}

// ---------- 掌握状态切换 ----------
const toggleMaster = (id) => {
  const newValue = !(localStorage.getItem('mastered_' + id) === 'true')
  localStorage.setItem('mastered_' + id, newValue)
}

// ---------- 听写模式 ----------
const startWordDictation = () => {
  if (filteredWords.value.length === 0) return

  stopAll()
  isDictationMode.value = true
  dictationType.value = 'word'
  dictationWords.value = [...filteredWords.value].sort(() => Math.random() - 0.5)
  currentDictationIndex.value = 0
  userAnswer.value = ''
  showHint.value = false
  showFeedback.value = false

  nextTick(() => {
    answerInput.value.focus()
    playCurrentDictation()
  })
}

const startSentenceDictation = () => {
  const wordsWithSentence = filteredWords.value.filter(word => word.sentence && word.sentence.trim())

  if (wordsWithSentence.length === 0) {
    alert(`当前单元共有 ${filteredWords.value.length} 个单词，但都没有添加例句。\n\n请在 word.js 文件中为单词添加 sentence 字段。`)
    return
  }

  stopAll()
  isDictationMode.value = true
  dictationType.value = 'sentence'
  dictationWords.value = [...wordsWithSentence].sort(() => Math.random() - 0.5)
  currentDictationIndex.value = 0
  userAnswer.value = ''
  showHint.value = false
  showFeedback.value = false

  nextTick(() => {
    answerInput.value.focus()
    playCurrentDictation()
  })
}

const submitAnswer = () => {
  if (!userAnswer.value.trim()) return
  showFeedback.value = true
  isCorrect.value = userAnswer.value.trim().toLowerCase() === correctAnswer.value.toLowerCase()
}

const nextDictationItem = () => {
  if (currentDictationIndex.value < dictationWords.value.length - 1) {
    currentDictationIndex.value++
    userAnswer.value = ''
    showHint.value = false
    showFeedback.value = false

    nextTick(() => {
      answerInput.value.focus()
      playCurrentDictation()
    })
  } else {
    exitDictation()
    alert('听写完成！')
  }
}

// ---------- 持久化设置 ----------
watch(dark, (val) => localStorage.setItem('darkMode', val))
watch(unitId, (val) => localStorage.setItem('selectedUnitId', val))
</script>

<style scoped>
.error-card {
  padding: 24px;
  margin: 24px auto;
  max-width: 600px;
  text-align: center;
  border-left: 4px solid #ef4444;
  background: rgba(239, 68, 68, 0.05);
}

.dark .error-card {
  background: rgba(239, 68, 68, 0.1);
}

.error-card h3 {
  color: #ef4444;
  margin-bottom: 16px;
}

.loading-card {
  padding: 48px;
  margin: 48px auto;
  max-width: 400px;
  text-align: center;
}

.header {
  text-align: center;
  margin-bottom: 24px;
}

.title {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 16px;
  color: #64748b;
}

.dark .subtitle {
  color: #94a3b8;
}

.btn-group {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  align-items: center;
}

.control-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1e293b;
}

.dark .control-item {
  color: #f8fafc;
}

.search-item {
  flex: 1;
  min-width: 300px;
}

.search-input {
  width: 100%;
}

.progress-card {
  padding: 16px;
  margin-bottom: 24px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-title {
  font-weight: 600;
  color: #1e293b;
}

.dark .progress-title {
  color: #f8fafc;
}

.progress-percent {
  font-weight: 700;
  color: #3b82f6;
}

.progress-stats {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 14px;
  color: #64748b;
}

.dark .progress-stats {
  color: #94a3b8;
}

.dictation-card {
  padding: 24px;
  margin-bottom: 24px;
}

.dictation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.dark .dictation-header {
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.dictation-header h3 {
  color: #1e293b;
}

.dark .dictation-header h3 {
  color: #f8fafc;
}

.dictation-progress {
  margin-bottom: 24px;
  color: #1e293b;
}

.dark .dictation-progress {
  color: #f8fafc;
}

.dictation-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.hint {
  background: rgba(96, 165, 250, 0.1);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 24px;
  color: #3b82f6;
}

.dark .hint {
  background: rgba(96, 165, 250, 0.2);
  color: #60a5fa;
}

.answer-input {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.feedback {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 24px;
  text-align: center;
  font-weight: 500;
}

.feedback.correct {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.dark .feedback.correct {
  background: rgba(34, 197, 94, 0.2);
}

.feedback.wrong {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.dark .feedback.wrong {
  background: rgba(239, 68, 68, 0.2);
}

.next-btn {
  text-align: center;
}

.word-list {
  margin-bottom: 48px;
}

.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: #64748b;
}

.dark .empty-state {
  color: #94a3b8;
}

.footer {
  text-align: center;
  font-size: 14px;
  color: #64748b;
  line-height: 1.8;
  padding-top: 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.dark .footer {
  color: #64748b;
  border-top-color: rgba(255, 255, 255, 0.1);
}
</style>