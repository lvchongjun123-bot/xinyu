<template>
  <div
    class="word-card card"
    :class="{ mastered: mastered, playing: isPlaying }"
    role="button" :tabindex="0"
    @click="playByCard"
    @keydown.enter.prevent="playByCard"
    @keydown.space.prevent="playByCard"
  >
    <div class="word-header">
      <div class="word-info">
        <span class="word">{{ index + 1 }}. {{ wordData.word }}</span>
        <span v-show="showPhonetic" class="phonetic">{{ wordData.phonetic }}</span>
      </div>
      <div class="word-actions">
        <button
          class="master-btn"
          @click.stop="toggleMaster"
          :aria-label="mastered ? '取消已掌握' : '标记已掌握'"
        >
          {{ mastered ? '✅' : '⭕' }}
        </button>
        <div class="pronunciation-btns">
          <button
            class="pronunciation-btn"
            @click.stop="playWord('uk')"
            aria-label="英式发音"
          >
            🇬🇧
          </button>
          <button
            class="pronunciation-btn"
            @click.stop="playWord('us')"
            aria-label="美式发音"
          >
            🇺🇸
          </button>
        </div>
      </div>
    </div>
    <p v-show="showDefinition" class="definition">{{ wordData.definition }}</p>
    <div v-if="wordData.sentence && showDefinition" class="sentence">
      📌 例句: {{ wordData.sentence }}
    </div>
    <div v-if="wordData.sentence_cn && showDefinition" class="sentence-cn">
      💬 翻译: {{ wordData.sentence_cn }}
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  wordData: { type: Object, required: true },
  index: { type: Number, required: true },
  showPhonetic: { type: Boolean, default: true },
  showDefinition: { type: Boolean, default: true },
  isPlaying: { type: Boolean, default: false },
  mastered: { type: Boolean, default: false },
  imageUrl: { type: String, default: '' }
})

const emit = defineEmits(['toggle-master', 'play'])

const toggleMaster = () => emit('toggle-master', props.wordData.id)
const playWord = (type) => emit('play', props.index, type)
const playByCard = () => emit('play', props.index, 'us')
</script>

<style scoped>
.word-card {
  padding: 20px;
  margin-bottom: 16px;
  border-left: 4px solid var(--primary);
  cursor: pointer;
}

.word-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
}

.word-card.mastered {
  border-left-color: var(--success);
  background: var(--success-subtle);
}

.word-card.playing {
  border-left-color: var(--accent-violet);
  /* ponytail: subtle violet bg has no dedicated token; keep minimal */
  background: var(--accent-violet-subtle);
}

.word-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.word-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.word {
  font-size: 22px;
  font-weight: 700;
  color: var(--foreground);
}

.phonetic {
  font-size: 16px;
  color: var(--muted);
  font-family: var(--font-mono);
}

.word-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.master-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--success-subtle);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.master-btn:hover {
  transform: scale(1.1);
  filter: brightness(0.9);
}

.pronunciation-btns {
  display: flex;
  gap: 8px;
}

.pronunciation-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--primary-subtle);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pronunciation-btn:hover {
  filter: brightness(0.9);
  transform: scale(1.05);
}

.pronunciation-btn:active {
  background: var(--primary);
  color: var(--primary-foreground);
  transform: scale(0.95);
}

.definition {
  margin-top: 12px;
  padding-left: 12px;
  border-left: 3px solid var(--border);
  color: var(--muted);
  line-height: 1.6;
  font-size: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sentence {
  margin-top: 8px;
  padding-left: 12px;
  border-left: 3px solid var(--accent-violet);
  color: var(--accent-violet);
  line-height: 1.6;
  font-size: 14px;
  font-style: italic;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sentence-cn {
  margin-top: 4px;
  padding-left: 12px;
  border-left: 3px solid var(--success);
  color: var(--success);
  line-height: 1.6;
  font-size: 14px;
}
</style>
