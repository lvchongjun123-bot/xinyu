<template>
  <div class="ai-panel-root">
    <!-- Tab bar -->
    <div class="ai-tabs">
      <button :class="['ai-tab', { active: tab === 'browse' }]" @click="tab = 'browse'">📖 浏览词典</button>
      <button :class="['ai-tab', { active: tab === 'typing' }]" @click="tab = 'typing'">⌨️ 打字练习</button>
      <button :class="['ai-tab', { active: tab === 'quiz' }]" @click="tab = 'quiz'">📝 测验</button>
    </div>

    <!-- Browse -->
    <div v-if="tab === 'browse'" class="ai-browse">
      <div class="ai-filter-bar">
        <button class="btn btn-ghost" @click="$emit('back')">← 返回</button>
        <div class="ai-search-wrap">
          <svg class="ai-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchQuery" class="ai-search-input" :placeholder="`搜索 ${terms.length} 个术语...`" />
        </div>
        <select v-model="levelFilter" class="ai-select">
          <option value="all">全部难度</option>
          <option value="basic">🔰 入门</option>
          <option value="intermediate">📖 进阶</option>
          <option value="advanced">🧠 专业</option>
        </select>
        <select v-model="catFilter" class="ai-select">
          <option value="all">全部类别</option>
          <option v-for="c in categories" :key="c.key" :value="c.key">{{ c.icon }} {{ c.label }}</option>
        </select>
      </div>
      <div class="ai-divider"></div>
      <div class="ai-cards">
          <div v-for="t in filteredTerms" :key="t.id" :class="['ai-card', { expanded: expandedId === t.id }]"
            role="button" :tabindex="0" :aria-expanded="expandedId === t.id"
            @click="toggleExpand(t.id)"
            @keydown.enter.prevent="toggleExpand(t.id)"
            @keydown.space.prevent="toggleExpand(t.id)">
            <div class="ai-card-header">
              <span class="ai-card-word">{{ t.word }}<span class="ai-card-phonetic" v-if="t.phonetic"> {{ t.phonetic }}</span></span>
              <button class="ai-card-speak" @click.stop="speakWord(t.word)" aria-label="发音">🔊</button>
            </div>
            <div class="ai-card-summary">{{ t.summary || t.definition.substring(0, 60) }}</div>
            <div class="ai-card-tags">
              <span class="ai-tag ai-tag-cat">{{ catLabel(t.category) }}</span>
              <span :class="['ai-tag', 'ai-tag-lvl', 'lvl-' + t.level]">{{ lvlLabel(t.level) }}</span>
            </div>
            <div v-if="expandedId === t.id" class="ai-card-detail">
              <div class="ai-card-def">{{ t.definition }}</div>
              <div v-if="t.sentence" class="ai-card-sentence">📝 {{ t.sentence }}<br/><span class="muted">{{ t.sentence_cn }}</span></div>
              <div v-if="t.usage" class="ai-card-usage">💡 {{ t.usage }}</div>
              <div v-if="t.source" class="ai-card-source">📎 {{ t.source }}</div>
            </div>
          </div>
          <div v-if="!filteredTerms.length" class="empty-hint">没有匹配的术语</div>
      </div>
    </div>

    <!-- Typing -->
    <div v-else-if="tab === 'typing'" class="ai-typing">
      <button class="btn btn-ghost" @click="$emit('back')">← 返回首页</button>
      <div v-if="!typingStarted" class="ai-typing-setup">
        <p>看到中文释义，输入对应的英文术语。</p>
        <div class="ai-lvl-btns">
          <button v-for="o in typingOptions" :key="o.key" class="btn btn-outline btn-sm" @click="startTyping(o.key)">{{ o.label }}</button>
        </div>
      </div>
      <div v-else-if="typingDone" class="ai-typing-result">
        <h3>🎉 练习完成！</h3>
        <p>正确率：{{ typingCorrect }} / {{ typingTotal }} ({{ typingPct }}%)</p>
        <p>用时：{{ typingElapsed }}s，WPM：{{ typingWpm }}</p>
        <div v-if="typingMistakes.length" class="ai-mt-3">
          <p>跳过的词：</p>
          <span v-for="m in typingMistakes" :key="m.id" class="ai-mistake-tag">{{ m.word }}</span>
        </div>
        <button class="btn btn-primary btn-sm ai-mt-3" @click="resetTyping">再来一轮</button>
      </div>
      <div v-else class="ai-typing-game">
        <div class="ai-typing-stats">
          <span>✅ {{ typingCorrect }} / {{ typingTotal }}</span>
          <span>⏱ {{ typingElapsed }}s</span>
          <span>📊 {{ typingWpm }} WPM</span>
          <span>🔥 {{ typingStreak }}</span>
        </div>
        <div class="ai-typing-card">
          <div class="ai-typing-hint">{{ currentTypingWord?.definition }}</div>
          <div class="ai-typing-hint-en muted" v-if="currentTypingWord?.sentence_cn">{{ currentTypingWord.sentence_cn }}</div>
          <div class="ai-typing-word">
            <span v-for="(c, i) in typingChars" :key="i" :class="'typing-' + c.state">{{ c.char }}</span>
          </div>
          <input ref="typingInput" v-model="typingInputText"
                 :class="['ai-typing-input', { 'typing-error': isTypingError }]"
                 placeholder="输入英文术语..." autocomplete="off"
                 @input="onTypingInput" />
        </div>
        <div class="ai-typing-actions">
          <button class="btn btn-ghost btn-sm" @click="skipTyping">跳过 ⏭</button>
          <button class="btn btn-ghost btn-sm" @click="resetTyping">重新开始 🔄</button>
        </div>
      </div>
    </div>

    <!-- Quiz -->
    <div v-else-if="tab === 'quiz'" class="ai-quiz">
      <button class="btn btn-ghost" @click="$emit('back')">← 返回首页</button>
      <div v-if="!quizStarted" class="ai-quiz-setup">
        <p>英译中选择 — 看到英文术语，选出正确的中文释义。10 题一轮。</p>
        <button class="btn btn-primary" @click="startQuiz">开始测验</button>
      </div>
      <div v-else-if="quizDone" class="ai-quiz-result">
        <h3>📊 测验结果</h3>
        <p>得分：{{ quizScore }} / 10 ({{ quizScore * 10 }}%)</p>
        <p>最长连击：{{ quizMaxStreak }}</p>
        <div v-if="quizWrong.length" class="ai-mt-3">
          <p>答错的词：</p>
          <span v-for="w in quizWrong" :key="w.id" class="ai-mistake-tag">{{ w.word }}</span>
        </div>
        <p v-else>全部正确！🎉</p>
        <button class="btn btn-primary btn-sm ai-mt-3" @click="startQuiz">再来一轮</button>
      </div>
      <div v-else class="ai-quiz-game">
        <div class="ai-quiz-stats">
          <span>📝 {{ quizIdx + 1 }}/10</span>
          <span>✅ {{ quizScore }}</span>
          <span>🔥 连击 {{ quizStreak }}</span>
          <span>⏱ {{ quizTimer }}s</span>
        </div>
        <div class="ai-quiz-term">
          <span class="quiz-word">{{ quizCurrent?.word }}</span>
          <span v-if="quizCurrent?.phonetic" class="ai-card-phonetic"> {{ quizCurrent.phonetic }}</span>
        </div>
        <div class="ai-quiz-options">
          <button v-for="(o, i) in quizOptions" :key="o.id"
                  :class="['ai-quiz-opt', o._state || '']"
                  :disabled="quizAnswered"
                  @click="answerQuiz(o, i)">
            <span class="ai-quiz-opt-letter">{{ 'ABCD'[i] }}</span>
            <span>{{ o.summary || o.definition.substring(0, 60) }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useSpeech } from '../composables/useSpeech.js'

const emit = defineEmits(['back'])
const speech = useSpeech()

// ===== Data =====
const tab = ref('browse')

const terms = ref([])
// ponytail: load from ai_terms.js directly via dynamic import
import('../data/ai_terms.js').then(m => {
  const units = m.default || m
  terms.value = units.flatMap(u => u.words)
})

const CAT_META = [
  { key: 'basics', icon: '📂', label: '基础概念' },
  { key: 'architecture', icon: '🏗', label: '架构' },
  { key: 'training', icon: '🎓', label: '训练' },
  { key: 'inference', icon: '⚡', label: '推理优化' },
  { key: 'rag', icon: '🔍', label: 'RAG 检索' },
  { key: 'prompt', icon: '💬', label: 'Prompt' },
  { key: 'agent', icon: '🤖', label: 'Agent' },
  { key: 'safety', icon: '🛡', label: '安全' },
  { key: 'ecosystem', icon: '🌐', label: '生态' },
]
const LVL_MAP = { basic: '🔰 入门', intermediate: '📖 进阶', advanced: '🧠 专业' }

function getCat(t) {
  const d = (t.word + ' ' + t.definition).toLowerCase()
  if (/transformer|attention|token|embedding|encoder|decoder|positional|feed.forward|kv.cache|moe|mixture.*expert|parameter/.test(d)) return 'architecture'
  if (/pre.training|fine.tuning|sft|rlhf|dpo|lora|quantization|distillation|scaling.law|synthetic.data|overfitting|gradient|backpropagation|loss.function|epoch|reinforcement.learning|ground.truth/.test(d)) return 'training'
  if (/hallucination|temperature|top.p|speculative.decoding|flash.attention|test.time.compute|inference|latency/.test(d)) return 'inference'
  if (/rag|retrieval|vector.database|graph.rag|grounding|semantic.search/.test(d)) return 'rag'
  if (/prompt|chain.of.thought|zero.shot|few.shot|system.prompt|meta.prompt/.test(d)) return 'prompt'
  if (/agent|tool.use|mcp|multi.agent|structured.output|computer.use/.test(d)) return 'agent'
  if (/alignment|guardrails|jailbreaking|prompt.injection|bias|safety/.test(d)) return 'safety'
  if (/benchmark|model.collapse|eu.ai.act|perplexity|open.source|compute|vibe.coding|swe.bench|coding.agent/.test(d)) return 'ecosystem'
  return 'basics'
}
function getLevel(t) {
  const d = (t.word + ' ' + t.definition).toLowerCase()
  if (/\b(artificial intelligence|machine learning|deep learning|neural network|token|parameter|inference|overfitting|open source|hallucination|bias|compute|benchmark|temperature|fine.tuning|embedding|large language model)\b/.test(d)) return 'basic'
  if (/mixture.*expert|kv.cache|speculative.decoding|flash.attention|test.time.compute|graph.rag|meta.prompt|multi.agent|model.collapse|encoder.decoder|perplexity|dpo|knowledge.distillation|scaling.law|synthetic.data|positional.encoding/.test(d)) return 'advanced'
  return 'intermediate'
}
function getSummary(t) {
  const parts = (t.definition || '').split('—')
  return parts.length > 1 ? parts[1].trim().replace(/[。，]$/, '') : (t.definition || '').substring(0, 60)
}

// Augment terms with computed fields
const enrichedTerms = computed(() => terms.value.map(t => ({
  ...t,
  category: t.category || t.source ? getCat(t) : 'basics',
  level: t.level || getLevel(t),
  summary: t.summary || getSummary(t)
})))

const categories = computed(() => CAT_META.map(c => ({
  ...c,
  count: enrichedTerms.value.filter(t => t.category === c.key).length
})).filter(c => c.count > 0))

function catLabel(k) {
  const found = CAT_META.find(c => c.key === k)
  return found ? found.icon + ' ' + found.label : k
}
function lvlLabel(k) { return LVL_MAP[k] || k }

// ===== Browse =====
const searchQuery = ref('')
const levelFilter = ref('all')
const catFilter = ref('all')
const expandedId = ref(null)

const filteredTerms = computed(() => {
  let arr = enrichedTerms.value
  if (catFilter.value !== 'all') arr = arr.filter(t => t.category === catFilter.value)
  if (levelFilter.value !== 'all') arr = arr.filter(t => t.level === levelFilter.value)
  const q = searchQuery.value.toLowerCase()
  if (q) arr = arr.filter(t => t.word.toLowerCase().includes(q) || (t.definition || '').toLowerCase().includes(q))
  return arr
})

function toggleExpand(id) { expandedId.value = expandedId.value === id ? null : id }
function speakWord(word) {
  if (!window.speechSynthesis) return
  speech.speak(word, { lang: 'en-US', rate: 0.85 })
}

// ===== Typing =====
const typingStarted = ref(false)
const typingDone = ref(false)
const typingWords = ref([])
const typingIdx = ref(0)
const typingCorrect = ref(0)
const typingTotal = ref(0)
const typingStreak = ref(0)
const typingMistakes = ref([])
const typingInputText = ref('')
const typingElapsed = ref(0)
const typingWpm = ref(0)
let typingStartTime = 0
let typingTimer = null
let typingErrorTimer = null
const isTypingError = ref(false)

const typingOptions = computed(() => [
  { key: 'all', label: `全部 (${terms.value.length})` },
  { key: 'basic', label: '🔰 入门' },
  { key: 'intermediate', label: '📖 进阶' },
  { key: 'advanced', label: '🧠 专业' },
])

const currentTypingWord = computed(() => typingWords.value[typingIdx.value] || null)
const typingChars = computed(() => {
  const t = currentTypingWord.value
  if (!t) return []
  const target = t.word
  const input = typingInputText.value
  return target.split('').map((char, i) => {
    if (i >= input.length) return { char, state: 'pending' }
    return { char, state: input[i].toLowerCase() === char.toLowerCase() ? 'correct' : 'wrong' }
  })
})
const typingPct = computed(() => typingTotal.value ? Math.round(typingCorrect.value / typingTotal.value * 100) : 0)

function startTyping(level) {
  let pool = enrichedTerms.value
  if (level !== 'all') pool = pool.filter(t => t.level === level)
  if (!pool.length) {
    window._showToast('该难度下没有术语，请换一个试试', 3000)
    return
  }
  typingWords.value = [...pool].sort(() => Math.random() - 0.5)
  typingIdx.value = 0
  typingCorrect.value = 0
  typingTotal.value = typingWords.value.length
  typingStreak.value = 0
  typingMistakes.value = []
  typingInputText.value = ''
  typingElapsed.value = 0
  typingWpm.value = 0
  typingStarted.value = true
  typingDone.value = false
  typingStartTime = Date.now()
  typingTimer = setInterval(() => {
    const s = Math.floor((Date.now() - typingStartTime) / 1000)
    typingElapsed.value = s
    if (s > 0) typingWpm.value = Math.round(typingCorrect.value / s * 60)
  }, 1000)
  nextTick(() => document.querySelector('.ai-typing-input')?.focus())
}

function onTypingInput() {
  const t = currentTypingWord.value
  if (!t) return
  const input = typingInputText.value
  const target = t.word
  // 纠正错误后取消清空定时器
  clearTimeout(typingErrorTimer)
  if (input.toLowerCase() === target.toLowerCase()) {
    typingCorrect.value++
    typingStreak.value++
    isTypingError.value = false
    advanceTyping()
  } else {
    let mismatch = false
    for (let i = 0; i < Math.min(input.length, target.length); i++) {
      if (input[i].toLowerCase() !== target[i].toLowerCase()) { mismatch = true; break }
    }
    if (mismatch) {
      typingStreak.value = 0
      isTypingError.value = true
      typingErrorTimer = setTimeout(() => {
        typingInputText.value = ''
        isTypingError.value = false
      }, 400)
    }
  }
}

function advanceTyping() {
  typingIdx.value++
  typingInputText.value = ''
  if (typingIdx.value >= typingWords.value.length) {
    clearInterval(typingTimer)
    typingDone.value = true
  }
  nextTick(() => document.querySelector('.ai-typing-input')?.focus())
}

function skipTyping() {
  if (!currentTypingWord.value) return
  clearTimeout(typingErrorTimer)
  typingMistakes.value.push(currentTypingWord.value)
  typingStreak.value = 0
  isTypingError.value = false
  advanceTyping()
}

function resetTyping() {
  clearInterval(typingTimer)
  clearTimeout(typingErrorTimer)
  typingStarted.value = false
  typingDone.value = false
}

// Keyboard shortcuts for quiz (A/B/C/D)
function onQuizKeydown(e) {
  if (!quizStarted.value || quizDone.value || quizAnswered.value) return
  const idx = { a: 0, b: 1, c: 2, d: 3 }[e.key.toLowerCase()]
  if (idx !== undefined) answerQuiz(quizOptions.value[idx], idx)
}

onMounted(() => window.addEventListener('keydown', onQuizKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onQuizKeydown)
  clearInterval(typingTimer)
  clearTimeout(typingErrorTimer)
  clearInterval(quizTimerId)
})

// Tab 切换时清除旧定时器，防止泄漏和更新错乱
watch(tab, (to) => {
  if (to !== 'typing') {
    clearInterval(typingTimer)
    clearTimeout(typingErrorTimer)
  }
  if (to !== 'quiz') {
    clearInterval(quizTimerId)
  }
})

// ===== Quiz =====
const quizStarted = ref(false)
const quizDone = ref(false)
const quizTerms = ref([])
const quizIdx = ref(0)
const quizScore = ref(0)
const quizStreak = ref(0)
const quizMaxStreak = ref(0)
const quizWrong = ref([])
const quizTimer = ref(10)
const quizAnswered = ref(false)
const quizOptions = ref([])
let quizTimerId = null

const quizCurrent = computed(() => quizTerms.value[quizIdx.value] || null)

function startQuiz() {
  quizTerms.value = [...enrichedTerms.value].sort(() => Math.random() - 0.5).slice(0, 10)
  quizIdx.value = 0
  quizScore.value = 0
  quizStreak.value = 0
  quizMaxStreak.value = 0
  quizWrong.value = []
  quizAnswered.value = false
  quizStarted.value = true
  quizDone.value = false
  showQuizQuestion()
}

function showQuizQuestion() {
  if (quizIdx.value >= quizTerms.value.length) return finishQuiz()
  const t = quizTerms.value[quizIdx.value]
  quizAnswered.value = false
  quizTimer.value = 10
  clearInterval(quizTimerId)
  quizTimerId = setInterval(() => {
    quizTimer.value--
    if (quizTimer.value <= 0) {
      clearInterval(quizTimerId)
      quizWrong.value.push(t)
      quizStreak.value = 0
      quizIdx.value++
      showQuizQuestion()
    }
  }, 1000)
  // Generate 4 options (correct + 3 distractors same category)
  const pool = enrichedTerms.value.filter(x => x.id !== t.id && x.category === (getCat(t) || 'basics'))
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  const distractors = shuffled.length >= 3 ? shuffled.slice(0, 3) : enrichedTerms.value.filter(x => x.id !== t.id).slice(0, 3)
  const opts = [t, ...distractors].sort(() => Math.random() - 0.5).map(o => ({ ...o, _state: '' }))
  quizOptions.value = opts
}

function answerQuiz(opt, idx) {
  if (quizAnswered.value) return
  quizAnswered.value = true
  clearInterval(quizTimerId)
  const t = quizTerms.value[quizIdx.value]
  const correct = opt.id === t.id
  if (correct) {
    quizScore.value++
    quizStreak.value++
    if (quizStreak.value > quizMaxStreak.value) quizMaxStreak.value = quizStreak.value
    quizOptions.value[idx]._state = 'quiz-correct'
  } else {
    quizStreak.value = 0
    quizWrong.value.push(t)
    quizOptions.value[idx]._state = 'quiz-wrong'
    const ci = quizOptions.value.findIndex(o => o.id === t.id)
    if (ci >= 0) quizOptions.value[ci]._state = 'quiz-correct'
  }
  setTimeout(() => { quizIdx.value++; showQuizQuestion() }, 800)
}

function finishQuiz() {
  clearInterval(quizTimerId)
  quizDone.value = true
}

onUnmounted(() => clearInterval(quizTimerId))
</script>

<style scoped>
/* ===== Root layout ===== */
.ai-panel-root {
  padding: var(--space-xl) 28px var(--space-4xl);
  max-width: 960px;
  margin: 0 auto;
  min-height: 0;
}

/* ===== Tab bar ===== */
.ai-tabs {
  display: flex;
  gap: var(--space-xs);
  margin-bottom: var(--space-lg);
  background: var(--card);
  border-radius: var(--radius-lg);
  padding: var(--space-xs);
  width: fit-content;
}
.ai-tab {
  padding: 9px 22px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: var(--text-base);
  font-family: var(--font-sans);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.ai-tab:hover { color: var(--foreground); }
.ai-tab.active {
  background: var(--card);
  color: var(--foreground);
  font-weight: var(--font-semibold);
  box-shadow: var(--shadow-sm);
}

/* ===== Browse ===== */
.ai-browse { display: flex; flex-direction: column; }

.ai-filter-bar {
  display: flex; gap: var(--space-md); align-items: center;
  padding: var(--space-sm) 0; flex-wrap: wrap;
}
.ai-search-wrap { flex: 1; min-width: 200px; position: relative; }
.ai-search-icon {
  position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
  width: 16px; height: 16px; color: var(--muted-foreground); pointer-events: none;
}
.ai-search-input {
  width: 100%;
  padding: 9px 14px 9px 38px; border-radius: var(--radius-md); border: 1px solid var(--border);
  background: var(--card); font-size: var(--text-base);
  font-family: var(--font-sans); color: var(--foreground);
  outline: none; transition: border 0.15s;
}
.ai-search-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-subtle); }
.ai-search-input::placeholder { color: var(--muted-foreground); }
.ai-select {
  padding: 9px var(--space-md); border-radius: var(--radius-md); border: 1px solid var(--border);
  background: var(--card); font-size: var(--text-base);
  font-family: var(--font-sans); color: var(--foreground);
  cursor: pointer; outline: none;
}

.ai-divider {
  height: 1px; background: var(--border);
  margin: var(--space-lg) 0 var(--space-xl);
}

.ai-cards {
  display: flex; flex-direction: column; gap: var(--space-xl);
}
.ai-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-lg); padding: 22px 28px;
  cursor: pointer; transition: all 0.15s;
  box-shadow: var(--shadow-sm);
}
.ai-card:hover { border-color: var(--primary); box-shadow: var(--shadow-md); }
.ai-card.expanded { border-color: var(--primary); box-shadow: var(--shadow-md); }

.ai-card-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--space-xs);
}
.ai-card-word {
  font-size: 18px; font-weight: var(--font-semibold); color: var(--foreground);
}
.ai-card-phonetic { font-size: var(--text-sm); font-weight: var(--font-normal); color: var(--muted-foreground); }
.ai-card-speak {
  font-size: 15px; cursor: pointer; opacity: 0.5; transition: opacity 0.15s;
  padding: 2px 6px; border-radius: var(--radius-xs, 4px);
  border: none; background: transparent; font-family: inherit; line-height: 1;
}
.ai-card-speak:hover { opacity: 1; background: var(--card-hover); }

.ai-card-summary { font-size: var(--text-base); color: var(--muted-foreground); margin-bottom: var(--space-sm); line-height: 1.6; }

/* Tags */
.ai-card-tags { display: flex; gap: 6px; }
.ai-tag {
  font-size: var(--text-xs); font-weight: var(--font-semibold); padding: 2px var(--space-sm);
  border-radius: var(--radius-lg); letter-spacing: 0.02em;
}
.ai-tag-cat { background: var(--primary-subtle); color: var(--primary); }
.ai-tag-lvl { background: var(--card-hover); color: var(--muted-foreground); }
.lvl-basic { background: var(--success-subtle); color: var(--success); }
.lvl-intermediate { background: var(--warning-subtle); color: var(--warning); }
.lvl-advanced { background: var(--destructive-subtle); color: var(--destructive); }

/* Expanded detail */
.ai-card-detail { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border); }
.ai-card-def { font-size: 13px; color: var(--foreground); line-height: 1.6; margin-bottom: 10px; }
.ai-card-sentence { font-size: 13px; color: var(--foreground); margin-bottom: var(--space-sm); line-height: 1.5; }
.ai-card-usage { font-size: var(--text-sm); color: var(--muted-foreground); margin-bottom: var(--space-sm); line-height: 1.5; }
.ai-card-source { font-size: var(--text-xs); color: var(--muted-foreground); opacity: 0.7; }
.muted { color: var(--muted-foreground); font-size: var(--text-sm); }
.empty-hint {
  text-align: center; padding: 40px 20px;
  color: var(--muted-foreground); font-size: var(--text-base);
}

/* ===== Typing ===== */
.ai-typing { flex: 1; display: flex; flex-direction: column; }
.ai-typing-setup, .ai-typing-result {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center;
}
.ai-typing-setup p, .ai-typing-result p {
  color: var(--muted-foreground); font-size: var(--text-base); margin-bottom: var(--space-lg);
}
.ai-typing-result h3 { font-size: 22px; margin-bottom: var(--space-md); color: var(--foreground); }

.ai-lvl-btns { display: flex; gap: var(--space-sm); flex-wrap: wrap; justify-content: center; }

.ai-typing-game { flex: 1; display: flex; flex-direction: column; align-items: center; }
.ai-typing-stats {
  display: flex; gap: 20px; margin-bottom: 28px;
  font-size: var(--text-base); color: var(--muted-foreground); font-weight: var(--font-medium);
}
.ai-typing-card {
  background: var(--card); border: 1px solid var(--border);
  border-radius: var(--radius-xl); padding: 28px 36px; width: 100%; max-width: 520px;
  text-align: center; margin-bottom: 20px;
}
.ai-typing-hint {
  font-size: 15px; color: var(--foreground); margin-bottom: 6px; line-height: 1.6;
}
.ai-typing-hint-en { margin-bottom: var(--space-lg); }
.ai-typing-word {
  font-size: 28px; font-weight: var(--font-bold); font-family: var(--font-mono);
  letter-spacing: 0.05em; margin-bottom: var(--space-xl); color: var(--foreground);
}
.ai-typing-word .typing-correct { color: var(--success); }
.ai-typing-word .typing-wrong { color: var(--destructive); text-decoration: underline; }
.ai-typing-word .typing-pending { color: var(--muted-foreground); }

.ai-typing-input {
  width: 100%; padding: 10px var(--space-lg); border-radius: var(--radius-sm);
  border: 2px solid var(--border); background: var(--background);
  font-size: var(--text-lg); font-family: var(--font-sans); color: var(--foreground);
  text-align: center; outline: none; transition: border 0.15s;
}
.ai-typing-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-subtle); }
.ai-typing-input.typing-error { border-color: var(--destructive); }

.ai-typing-actions { display: flex; gap: 10px; }

.ai-mistake-tag {
  display: inline-block; padding: 3px 10px; margin: 2px;
  background: var(--destructive-subtle); color: var(--destructive);
  border-radius: var(--radius-lg); font-size: var(--text-sm); font-weight: var(--font-medium);
}

/* ===== Quiz ===== */
.ai-quiz { flex: 1; display: flex; flex-direction: column; }
.ai-quiz-setup, .ai-quiz-result {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center;
}
.ai-quiz-setup p { color: var(--muted-foreground); font-size: var(--text-base); margin-bottom: var(--space-lg); }
.ai-quiz-result h3 { font-size: 22px; margin-bottom: var(--space-md); color: var(--foreground); }

.ai-quiz-game { flex: 1; display: flex; flex-direction: column; align-items: center; }
.ai-quiz-stats {
  display: flex; gap: 20px; margin-bottom: var(--space-xl);
  font-size: var(--text-base); color: var(--muted-foreground); font-weight: var(--font-medium);
}
.ai-quiz-term {
  font-size: 22px; font-weight: var(--font-bold); color: var(--foreground);
  margin-bottom: var(--space-xl); text-align: center;
}

.ai-quiz-options {
  display: flex; flex-direction: column; gap: 10px; width: 100%; max-width: 500px;
}
.ai-quiz-opt {
  display: flex; align-items: center; gap: var(--space-md);
  padding: 14px 18px; border: 2px solid var(--border);
  border-radius: var(--radius-lg); background: var(--card);
  font-size: var(--text-base); font-family: var(--font-sans); color: var(--foreground);
  cursor: pointer; text-align: left; transition: all 0.12s;
}
.ai-quiz-opt:hover:not(:disabled) { border-color: var(--primary); }
.ai-quiz-opt:disabled { cursor: default; }
.ai-quiz-opt-letter {
  width: 30px; height: 30px; border-radius: 7px;
  background: var(--card-hover); display: flex; align-items: center;
  justify-content: center; font-size: 13px; font-weight: var(--font-bold);
  flex-shrink: 0; color: var(--muted-foreground);
}
.ai-quiz-opt.quiz-correct { border-color: var(--success); background: var(--success-subtle); }
.ai-quiz-opt.quiz-correct .ai-quiz-opt-letter { background: var(--success); color: var(--success-foreground); }
.ai-quiz-opt.quiz-wrong { border-color: var(--destructive); background: var(--destructive-subtle); }
.ai-quiz-opt.quiz-wrong .ai-quiz-opt-letter { background: var(--destructive); color: var(--destructive-foreground); }

/* ===== Utility ===== */
.ai-mt-3 { margin-top: var(--space-md); }

/* ===== Dark mode overrides ===== */
:global(.dark) .ai-quiz-opt-letter { background: var(--card-hover); color: var(--muted-foreground); }

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .ai-panel-root { padding: var(--space-lg); }
  .ai-filter-bar { flex-direction: column; align-items: stretch; }
  .ai-search-wrap { min-width: 0; }
  .ai-card { padding: var(--space-lg); }
  .ai-card-word { font-size: var(--text-base); }
  .ai-typing-card { padding: var(--space-lg) 20px; }
}
</style>
