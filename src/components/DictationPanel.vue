<template>
  <div class="dictation-card card">
    <!-- 完成页 -->
    <div v-if="completed" class="dictation-result">
      <div class="dictation-result-icon">🎧</div>
      <h2>听写完成！</h2>
      <div class="dictation-result-stats">
        <div class="dictation-result-stat correct">
          <span class="dictation-result-val">{{ correctCount }}</span>
          <span class="dictation-result-label">✅ 正确</span>
        </div>
        <div class="dictation-result-stat wrong">
          <span class="dictation-result-val">{{ wrongCount }}</span>
          <span class="dictation-result-label">❌ 错误</span>
        </div>
        <div class="dictation-result-stat time">
          <span class="dictation-result-val">{{ elapsed }}s</span>
          <span class="dictation-result-label">⏱ 用时</span>
        </div>
      </div>
      <p class="dictation-result-pct">正确率：{{ pct }}%</p>
      <div v-if="wrongList.length" class="dictation-wrong-list">
        <p>需要复习的单词：</p>
        <span v-for="w in wrongList" :key="w.id" class="ai-mistake-tag">{{ w.word }}</span>
      </div>
      <div class="dictation-result-actions">
        <button class="btn btn-outline" @click="$emit('restart')">🔄 再来一轮</button>
        <button class="btn btn-primary" @click="$emit('exit')">🏠 返回首页</button>
      </div>
    </div>

    <!-- 听写中 -->
    <template v-else>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <h3>{{ type === 'word' ? '🎧 单词听写' : '📝 句子听写' }}</h3>
      <button class="btn btn-outline" @click="$emit('exit')">退出</button>
    </div>

    <div class="dictation-progress">
      <span>第 {{ index + 1 }} / {{ total }} 个</span>
      <div class="progress-bar" style="margin-top:8px">
        <div class="progress-bar-fill" :style="{ width: `${((index + 1) / total) * 100}%` }"></div>
      </div>
    </div>

    <div style="display:flex;gap:12px;justify-content:center;margin-bottom:24px">
      <button class="btn btn-primary" @click="$emit('play')">🔊 播放</button>
      <button class="btn btn-outline" @click="hint = !hint">
        {{ hint ? '隐藏提示' : '💡 显示提示' }}
      </button>
    </div>

    <div v-if="hint" class="hint-box">
      <span v-if="type === 'word'">音标: {{ item.phonetic }}</span>
      <span v-else>单词: {{ item.word }}</span>
    </div>

    <div class="answer-row">
      <input
        v-model="answer"
        :placeholder="type === 'word' ? '请输入你听到的单词...' : '请输入你听到的句子...'"
        @keyup.enter="$emit('submit', answer)"
        ref="inputEl"
      />
      <button class="btn btn-success" @click="$emit('submit', answer)">提交</button>
    </div>

    <div v-if="feedback" class="feedback-box" :class="{ correct: ok, wrong: !ok }">
      <span v-if="ok">✅ 回答正确！太棒了！</span>
      <span v-else>❌ 回答错误！正确答案是: {{ correctAns }}</span>
    </div>

    <div v-if="feedback" style="text-align:center">
      <button class="btn btn-primary" @click="$emit('next')">下一个 →</button>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'

const props = defineProps({
  type: { type: String, required: true },
  index: { type: Number, required: true },
  total: { type: Number, required: true },
  item: { type: Object, required: true },
  correctAns: { type: String, default: '' },
  feedback: { type: Boolean, default: false },
  ok: { type: Boolean, default: false },
  completed: { type: Boolean, default: false },
  correctCount: { type: Number, default: 0 },
  wrongCount: { type: Number, default: 0 },
  elapsed: { type: Number, default: 0 },
  pct: { type: Number, default: 0 },
  wrongList: { type: Array, default: () => [] }
})

defineEmits(['play', 'submit', 'next', 'restart', 'exit'])

const answer = ref('')
const hint = ref(false)
const inputEl = ref(null)

function focus() { nextTick(() => inputEl.value?.focus()) }

watch(() => props.index, () => { answer.value = ''; hint.value = false })
onMounted(focus)
defineExpose({ focus })
</script>
