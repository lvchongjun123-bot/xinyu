<template>
  <div class="typing-panel">
    <!-- 完成页（非复习） -->
    <div v-if="st.isCompleted.value && !st.reviewMode.value" class="typing-result">
      <div class="typing-result-icon">🎉</div>
      <h2>练习完成！</h2>
      <div class="typing-result-stats">
        <div class="typing-result-stat">
          <span class="typing-result-val">{{ st.wpm.value }}</span>
          <span class="typing-result-label">WPM (字/分钟)</span>
        </div>
        <div class="typing-result-stat">
          <span class="typing-result-val">{{ st.accuracy.value }}%</span>
          <span class="typing-result-label">正确率</span>
        </div>
        <div class="typing-result-stat">
          <span class="typing-result-val">{{ st.elapsedSeconds.value }}s</span>
          <span class="typing-result-label">用时</span>
        </div>
        <div class="typing-result-stat">
          <span class="typing-result-val">{{ st.completedCount.value }}</span>
          <span class="typing-result-label">全对句数</span>
        </div>
      </div>
      <!-- 额外统计 -->
      <div class="typing-result-stats extra" v-if="st.skippedCount.value > 0 || st.avgSentenceTime.value > 0">
        <div class="typing-result-stat" v-if="st.avgSentenceTime.value > 0">
          <span class="typing-result-val">{{ st.avgSentenceTime.value }}s</span>
          <span class="typing-result-label">平均单句耗时</span>
        </div>
        <div class="typing-result-stat" v-if="st.skippedCount.value > 0">
          <span class="typing-result-val">{{ st.skippedCount.value }}</span>
          <span class="typing-result-label">跳过句数</span>
        </div>
      </div>
      <!-- 错题复习入口 -->
      <div v-if="st.wrongSentences.value.length > 0" class="typing-result-review">
        <p>你有 <strong>{{ st.wrongSentences.value.length }}</strong> 句需要复习</p>
        <button class="btn btn-outline" @click="st.startReview()">📝 复习错句</button>
      </div>
      <div class="typing-result-actions">
        <button class="btn btn-outline" @click="st.restart()">🔄 再来一次</button>
        <button class="btn btn-primary" @click="$emit('back')">🏠 返回首页</button>
      </div>
    </div>

    <!-- 练习中（含复习模式） -->
    <template v-else>
      <!-- 复习模式横幅 -->
      <div v-if="st.reviewMode.value" class="typing-review-banner">
        📝 复习模式 — {{ st.totalSentences.value }} 句错题
      </div>

      <!-- 顶部导航 -->
      <div class="typing-header">
        <button class="btn btn-ghost" @click="$emit('back')">← 返回</button>
        <span class="typing-mode-title">🎹 句子听打</span>
        <span class="typing-progress-text">
          {{ st.currentIndex.value + 1 }} / {{ st.totalSentences.value }}
        </span>
      </div>

      <!-- 进度条 -->
      <div class="progress-bar" style="margin-bottom:24px">
        <div class="progress-bar-fill" :style="{ width: `${st.progress.value}%` }"></div>
      </div>

      <!-- 中文翻译 -->
      <div class="sentence-translation" v-if="st.currentSentence.value.sentence_cn">
        {{ st.currentSentence.value.sentence_cn }}
      </div>

      <!-- 原词信息 -->
      <div class="sentence-source-word" v-if="st.currentSentence.value.word">
        单词: <strong>{{ st.currentSentence.value.word }}</strong>
        <span v-if="st.currentSentence.value.definition" class="sentence-source-def">
          — {{ st.currentSentence.value.definition }}
        </span>
      </div>

      <!-- 单词填空区 -->
      <div class="sentence-words-area">
        <template v-for="(word, i) in st.words.value" :key="i">
          <span class="sentence-word-group">
            <input
              :ref="(el) => { if (el) inputRefs[i] = el }"
              :value="st.wordInputs.value[i]"
              class="sentence-word-input"
              :class="{
                correct: word.correct === true,
                wrong: word.correct === false,
                revealed: word.revealed === true
              }"
              :style="{ width: (word.text.length + 2) + 'ch' }"
              :maxlength="word.text.length + 2"
              :readonly="st.submitted.value"
              autocomplete="off"
              autocorrect="off"
              autocapitalize="off"
              spellcheck="false"
              @input="e => { st.wordInputs.value[i] = e.target.value; st.onWordInput(i) }"
              @keydown="st.onWordKeydown(i, $event)"
            />
            <span v-if="st.submitted.value && word.correct === false" class="sentence-word-answer">
              {{ word.text }}
            </span>
          </span>
        </template>
      </div>

      <!-- 提交区 -->
      <div v-if="!st.submitted.value" class="sentence-submit-area">
        <button class="btn btn-ghost btn-sm" @click="st.skipSentence()">⏭ 跳过</button>
        <button
          class="btn btn-primary"
          @click="st.submit()"
          :disabled="!allWordsFilled"
        >
          提交
        </button>
        <button class="btn btn-ghost btn-sm" @click="st.revealNextWord()" :disabled="allRevealed">💡 提示</button>
        <span class="sentence-submit-hint">或按 Enter</span>
      </div>

      <!-- 提交后结果 -->
      <div
        v-else
        class="sentence-result"
        :class="st.isAllCorrect.value ? 'correct' : 'wrong'"
      >
        <div class="sentence-result-icon">{{ st.isAllCorrect.value ? '✅' : '❌' }}</div>
        <div class="sentence-result-status">
          {{ st.isAllCorrect.value ? '全部正确！' : `${currentCorrectCount}/${st.words.value.length} 词正确` }}
        </div>
        <div class="sentence-time" v-if="st.latestSentenceTime.value > 0">
          ⏱ 本句耗时 {{ st.latestSentenceTime.value }}s
        </div>
        <div v-if="isAutoAdvancing" class="sentence-auto-advance">⏳ 即将进入下一句...</div>
        <button
          v-if="!isAutoAdvancing"
          class="btn btn-primary btn-sm"
          @click="st.nextSentence()"
        >
          {{ st.currentIndex.value < st.totalSentences.value - 1 ? '下一句 →' : '查看结果 →' }}
        </button>
      </div>

      <!-- 实时统计 -->
      <div class="typing-live-stats">
        <span>⚡ {{ st.wpm.value }} WPM</span>
        <span>🎯 {{ st.accuracy.value }}%</span>
        <span>⏱ {{ st.elapsedSeconds.value }}s</span>
        <span v-if="st.consecutiveStreak.value >= 2" class="typing-streak">
          🔥 {{ st.consecutiveStreak.value }} 连对
        </span>
      </div>

      <!-- 底部操作 -->
      <div class="typing-footer">
        <button class="btn btn-outline" @click="st.speakCurrent()">
          🔊 重播
        </button>
        <button class="btn btn-ghost" @click="st.restart()">
          🔄 重新开始
        </button>
      </div>

      <!-- 语速调节 -->
      <div class="typing-rate-control">
        <label>🐢</label>
        <input
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          :value="st.speechRate.value"
          @input="st.speechRate.value = parseFloat(($event.target).value)"
        />
        <label>🐇</label>
        <span>{{ st.speechRate.value.toFixed(1) }}x</span>
      </div>

      <!-- 键盘快捷键提示 -->
      <div class="typing-shortcut-hints">
        <kbd>Tab</kbd> 下一词
        <kbd>Shift+Tab</kbd> 上一词
        <kbd>Enter</kbd> 提交/跳词
        <kbd>Esc</kbd> 跳过
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  st: { type: Object, required: true }
})

defineEmits(['back'])

const inputRefs = ref([])

// 所有词是否都已填写（有内容即可提交）
const allWordsFilled = computed(() => {
  const inputs = props.st.wordInputs?.value
  if (!inputs || !inputs.length) return false
  return inputs.every(v => (v || '').trim().length > 0)
})

// 所有词是否都已被提示/填写
const allRevealed = computed(() => {
  const inputs = props.st.wordInputs?.value
  if (!inputs?.length) return true
  return inputs.every(v => (v || '').trim().length > 0)
})

// 当前句正确词数（非累积，排除揭示词）
const currentCorrectCount = computed(() => {
  const ws = props.st.words?.value
  if (!ws) return 0
  return ws.reduce((n, w) => n + (w && w.correct === true ? 1 : 0), 0)
})

// 全对后是否正在自动前进
const isAutoAdvancing = computed(() =>
  props.st.submitted.value && props.st.isAllCorrect?.value
)

// 全局 Escape 键：跳过当前句
function onGlobalKeydown(e) {
  if (e.key === 'Escape' && !props.st.submitted?.value && props.st.isActive?.value) {
    props.st.skipSentence()
  }
}

onMounted(() => window.addEventListener('keydown', onGlobalKeydown))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKeydown))

// 监听 focusIndex 变化 → 聚焦对应 input
watch(() => props.st.focusIndex.value, (idx) => {
  if (idx >= 0) {
    nextTick(() => {
      inputRefs.value[idx]?.focus()
    })
  }
})

// 新句子开始时聚焦第一个 input
watch(() => props.st.currentIndex.value, () => {
  nextTick(() => {
    inputRefs.value[0]?.focus()
  })
})

// 启动时聚焦
watch(() => props.st.isActive.value, (val) => {
  if (val) {
    nextTick(() => {
      inputRefs.value[0]?.focus()
    })
  }
})
</script>
