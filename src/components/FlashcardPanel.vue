<template>
  <div class="flashcard-panel">
    <!-- 完成页 -->
    <div v-if="fc.isCompleted.value" class="flashcard-result">
      <div class="flashcard-result-icon">🎉</div>
      <h2>复习完成！</h2>
      <div class="flashcard-result-stats">
        <div class="flashcard-result-stat known">
          <span class="flashcard-result-val">{{ fc.stats.value.known }}</span>
          <span class="flashcard-result-label">✅ 已掌握</span>
        </div>
        <div class="flashcard-result-stat unknown">
          <span class="flashcard-result-val">{{ fc.stats.value.unknown }}</span>
          <span class="flashcard-result-label">❌ 需复习</span>
        </div>
      </div>
      <div class="flashcard-result-actions">
        <button class="btn btn-outline" @click="fc.restart()">🔄 再复习一轮</button>
        <button class="btn btn-primary" @click="$emit('back')">🏠 返回首页</button>
      </div>
    </div>

    <!-- 复习中 -->
    <template v-else>
      <!-- 顶部 -->
      <div class="flashcard-header">
        <button class="btn btn-ghost" @click="$emit('back')">← 返回</button>
        <span class="flashcard-mode-title">🃏 闪卡复习</span>
        <span class="flashcard-progress-text">
          {{ fc.stats.value.known + fc.stats.value.unknown }} / {{ fc.stats.value.total }}
        </span>
      </div>

      <!-- 进度条 -->
      <div class="progress-bar" style="margin-bottom:20px">
        <div class="progress-bar-fill" :style="{ width: `${fc.progress.value}%` }"></div>
      </div>

      <!-- 卡片区 -->
      <div class="flashcard-stack" v-if="fc.currentCard.value">
        <!-- 背面卡片（堆叠效果） -->
        <div class="flashcard-card flashcard-card-behind" v-if="fc.currentIdx.value + 1 < fc.queue.value.length"></div>

        <!-- 当前卡片 -->
        <div
          class="flashcard-card flashcard-card-front"
          :class="{
            flipped: fc.isFlipped.value,
            'swipe-left': fc.dragOffset.value < -10 && !fc.isFlipped.value,
            'swipe-right': fc.dragOffset.value > 10 && !fc.isFlipped.value
          }"
          :style="!fc.isFlipped.value ? { transform: `translateX(${fc.dragOffset.value}px)` } : {}"
          role="button" :tabindex="0" :aria-label="fc.currentCard.value?.word"
          @click="fc.flip()"
          @touchstart.prevent="fc.onTouchStart($event)"
          @touchmove.prevent="fc.onTouchMove($event)"
          @touchend="fc.onTouchEnd()"
        >
          <div class="flashcard-card-inner">
            <!-- 正面：单词 -->
            <div class="flashcard-front">
              <div class="flashcard-word-img" v-if="imageUrl">
                <img :src="imageUrl" :alt="fc.currentCard.value.word" />
              </div>
              <div class="flashcard-word-icon" v-else>📝</div>
              <div class="flashcard-word">{{ fc.currentCard.value.word }}</div>
              <div class="flashcard-phonetic" v-if="fc.currentCard.value.phonetic">
                {{ fc.currentCard.value.phonetic }}
              </div>
              <div class="flashcard-tap-hint">👆 点击翻转查看释义</div>
            </div>
            <!-- 背面：释义 -->
            <div class="flashcard-back">
              <div class="flashcard-back-word">{{ fc.currentCard.value.word }}</div>
              <div class="flashcard-def">{{ fc.currentCard.value.definition }}</div>
              <div class="flashcard-sentence" v-if="fc.currentCard.value.sentence">
                📌 {{ fc.currentCard.value.sentence }}
              </div>
              <div class="flashcard-sentence-cn" v-if="fc.currentCard.value.sentence_cn">
                💬 {{ fc.currentCard.value.sentence_cn }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮（翻转后显示）4 级评分 -->
      <div class="flashcard-actions" v-if="fc.isFlipped.value">
        <button class="flashcard-btn rating-again" @click="fc.markUnknown()">
          🔁 忘记了
        </button>
        <button class="flashcard-btn rating-hard" @click="fc.markHard()">
          🤔 困难
        </button>
        <button class="flashcard-btn rating-good" @click="fc.markKnown()">
          👍 良好
        </button>
        <button class="flashcard-btn rating-easy" @click="fc.markEasy()">
          🚀 简单
        </button>
      </div>

      <!-- 翻转前提示 -->
      <div class="flashcard-actions" v-else>
        <p class="flashcard-flip-hint">点击卡片查看释义 · 右滑简单 · 左滑忘记</p>
      </div>

      <!-- 滑动指示器 -->
      <div class="flashcard-swipe-indicators" v-if="!fc.isFlipped.value && !fc.isDragging.value">
        <span class="swipe-hint-left">← 忘了</span>
        <span class="swipe-hint-right">简单 →</span>
      </div>

      <!-- 底部：操作 -->
      <div class="flashcard-footer" style="display:flex;gap:8px;justify-content:center;">
        <button class="btn btn-ghost btn-sm" :class="{ active: fc.difficultySort.value }"
          @click="fc.difficultySort.value = !fc.difficultySort.value"
          title="难度排序：易→难">
          📶 {{ fc.difficultySort.value ? '难易' : '随机' }}
        </button>
        <button class="btn btn-ghost btn-sm" :disabled="!fc.isFlipped.value"
          @click="fc.skip()"
          :title="fc.isFlipped.value ? '跳过，不写学习记录' : '先翻转卡片查看释义'">
          跳过 →
        </button>
      </div>

      <!-- 键盘快捷键提示 -->
      <div class="typing-shortcut-hints" v-if="fc.isActive.value">
        <kbd>Space</kbd> 翻转
        <kbd>1</kbd> 忘了
        <kbd>2</kbd> 困难
        <kbd>3</kbd> 良好
        <kbd>4</kbd> 简单
      </div>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  fc: { type: Object, required: true },
  imageUrl: { type: String, default: '' }
})

defineEmits(['back'])
</script>
