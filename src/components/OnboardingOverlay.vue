<template>
  <Teleport to="body">
    <Transition name="onboard-fade">
      <div class="onboard-overlay" v-if="visible">
        <div class="onboard-card">
          <!-- 步骤指示器 -->
          <div class="onboard-steps">
            <span
              v-for="i in 3"
              :key="i"
              class="onboard-dot"
              :class="{ active: step === i, done: step > i }"
            ></span>
          </div>

          <!-- Step 1: 欢迎 -->
          <div class="onboard-content" v-if="step === 1">
            <div class="onboard-icon">📚</div>
            <h2>欢迎使用英语词汇学习</h2>
            <p>基于<strong>FSRS 自适应间隔重复算法</strong>智能安排复习计划，帮助你高效记忆单词。</p>
            <div class="onboard-features">
              <span>🃏 闪卡记忆</span>
              <span>⌨️ 打字练习</span>
              <span>🎧 听写训练</span>
              <span>📰 阅读理解</span>
              <span>🎹 句子听打</span>
            </div>
          </div>

          <!-- Step 2: 选词库 -->
          <div class="onboard-content" v-if="step === 2">
            <div class="onboard-icon">📖</div>
            <h2>选择你的词库</h2>
            <p>从适合你的考试词库开始，也可以随时切换</p>
            <div class="onboard-books">
              <button
                v-for="b in books"
                :key="b.id"
                class="onboard-book-btn"
                :class="{ active: selectedBook === b.id }"
                @click="selectedBook = b.id"
              >
                <span class="onboard-book-name">{{ b.name }}</span>
                <span class="onboard-book-count">{{ b.count }} 词</span>
              </button>
            </div>
          </div>

          <!-- Step 3: 开始学习 -->
          <div class="onboard-content" v-if="step === 3">
            <div class="onboard-icon">🚀</div>
            <h2>准备就绪！</h2>
            <p>每天学习 <strong>20 个新词</strong>，加上智能复习，坚持就是胜利！</p>
            <div class="onboard-tips">
              <div class="onboard-tip">💡 按 <kbd>?</kbd> 随时查看快捷键</div>
              <div class="onboard-tip">📱 支持手机浏览器，随时随地学习</div>
              <div class="onboard-tip">🌙 右上角可切换深色模式</div>
            </div>
          </div>

          <!-- 底部按钮 -->
          <div class="onboard-actions">
            <button v-if="step > 1" class="btn btn-ghost" @click="step--">← 上一步</button>
            <span v-else></span>
            <div class="onboard-actions-right">
              <button class="btn btn-ghost" @click="$emit('skip')">跳过引导</button>
              <button
                v-if="step < 3"
                class="btn btn-primary"
                @click="step++"
              >下一步 →</button>
              <button
                v-else
                class="btn btn-primary"
                @click="$emit('done', selectedBook)"
              >开始学习 🚀</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['skip', 'done'])

const props = defineProps({
  visible: { type: Boolean, default: false }
})

const step = ref(1)
const selectedBook = ref('gaokao')

// 可见时重置步骤（修复关闭后再打开从上次位置开始的问题）
watch(() => props.visible, (v) => {
  if (v) {
    step.value = 1
    selectedBook.value = 'gaokao'
  }
})

// Escape 关闭引导
function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('skip')
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

const books = [
  { id: 'gaokao', name: '高考词汇', count: '3500+' },
  { id: 'cet4', name: '四级词汇', count: '4500+' },
  { id: 'cet6', name: '六级词汇', count: '6000+' },
  { id: 'ielts', name: '雅思词汇', count: '5000+' },
  { id: 'ai_terms', name: 'AI 术语', count: '80+' }
]
</script>
