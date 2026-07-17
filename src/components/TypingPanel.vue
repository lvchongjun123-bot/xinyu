<template>
  <div class="typing-panel">
    <!-- 完成页 -->
    <div v-if="typing.isCompleted.value" class="typing-result">
      <div class="typing-result-icon">🎉</div>
      <h2>练习完成！</h2>
      <div class="typing-result-stats">
        <div class="typing-result-stat">
          <span class="typing-result-val">{{ typing.wpm.value }}</span>
          <span class="typing-result-label">WPM (字/分钟)</span>
        </div>
        <div class="typing-result-stat">
          <span class="typing-result-val">{{ typing.accuracy.value }}%</span>
          <span class="typing-result-label">正确率</span>
        </div>
        <div class="typing-result-stat">
          <span class="typing-result-val">{{ typing.elapsedSeconds.value }}s</span>
          <span class="typing-result-label">用时</span>
        </div>
        <div class="typing-result-stat">
          <span class="typing-result-val">{{ typing.completedWords.value }}</span>
          <span class="typing-result-label">完成词数</span>
        </div>
      </div>
      <div class="typing-result-actions">
        <button class="btn btn-outline" @click="typing.restart()">🔄 再来一次</button>
        <button class="btn btn-primary" @click="$emit('back')">🏠 返回首页</button>
      </div>
    </div>

    <!-- 练习中 -->
    <template v-else>
      <!-- 顶部导航 -->
      <div class="typing-header">
        <button class="btn btn-ghost" @click="$emit('back')">← 返回</button>
        <span class="typing-mode-title">⌨️ 打字练习</span>
        <span class="typing-progress-text">
          {{ typing.currentIndex.value + 1 }} / {{ typing.totalWords.value }}
        </span>
      </div>

      <!-- 进度条 -->
      <div class="progress-bar" style="margin-bottom:32px">
        <div class="progress-bar-fill" :style="{ width: `${typing.progress.value}%` }"></div>
      </div>

      <!-- 主内容区 -->
      <div class="typing-main">
        <!-- 单词展示区 -->
        <div class="typing-word-area" :class="{ wrong: typing.isWrong.value }">
          <span
            v-for="(char, i) in typing.currentWordText.value"
            :key="i"
            class="typing-char"
            :class="typing.letterStates.value[i] || 'pending'"
          >{{ char }}</span>
        </div>

        <!-- 音标 -->
        <div class="typing-phonetic" v-if="typing.currentWord.value?.phonetic">
          {{ typing.currentWord.value.phonetic }}
        </div>

        <!-- 释义（完成当前词后显示） -->
        <div v-if="typing.showDefinition.value && typing.currentWord.value" class="typing-def-reveal">
          <div class="typing-def">{{ typing.currentWord.value.definition }}</div>
          <div class="typing-sentence" v-if="typing.currentWord.value.sentence">
            📌 {{ typing.currentWord.value.sentence }}
          </div>
          <div class="typing-sentence-cn" v-if="typing.currentWord.value.sentence_cn">
            💬 {{ typing.currentWord.value.sentence_cn }}
          </div>
          <button class="btn btn-primary" @click="typing.nextWord()" style="margin-top:16px">
            {{ typing.currentIndex.value < typing.totalWords.value - 1 ? '下一个词 →' : '查看结果 →' }}
          </button>
        </div>

        <!-- 输入提示（未完成时） -->
        <div v-else class="typing-hint">
          输入单词，输错会自动清空重新输入
        </div>

        <!-- 实时统计 -->
        <div class="typing-live-stats">
          <span>⚡ {{ typing.wpm.value }} WPM</span>
          <span>🎯 {{ typing.accuracy.value }}%</span>
          <span>⏱ {{ typing.elapsedSeconds.value }}s</span>
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="typing-footer">
        <button class="btn btn-outline" @click="typing.speakCurrent()">
          🔊 朗读
        </button>
        <button class="btn btn-ghost" :class="{ active: typing.difficultySort.value }"
          @click="typing.difficultySort.value = !typing.difficultySort.value"
          title="难度排序：易→难">
          📶 {{ typing.difficultySort.value ? '难易' : '随机' }}
        </button>
        <button class="btn btn-ghost" @click="typing.restart()">
          🔄 重新开始
        </button>
      </div>

      <!-- 键盘快捷键提示 -->
      <div class="typing-shortcut-hints">
        直接输入字母即可，输错自动清空
      </div>
    </template>
  </div>
</template>

<script setup>
const props = defineProps({
  typing: { type: Object, required: true }
})

defineEmits(['back'])
</script>
