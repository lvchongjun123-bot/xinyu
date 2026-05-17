<template>
  <div 
    class="word-card card" 
    :class="{ mastered: wordData.mastered, playing: isPlaying }"
    @click="playByCard"
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
          :title="wordData.mastered ? '取消已掌握' : '标记已掌握'"
        >
          {{ wordData.mastered ? '✅' : '⭕' }}
        </button>
        <div class="pronunciation-btns">
          <button 
            class="pronunciation-btn" 
            @click.stop="playWord('uk')"
            title="英式发音"
          >
            🇬🇧
          </button>
          <button 
            class="pronunciation-btn" 
            @click.stop="playWord('us')"
            title="美式发音"
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
  isPlaying: { type: Boolean, default: false }
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
  border-left: 4px solid #60a5fa;
  cursor: pointer;
}

.word-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.word-card.mastered {
  border-left-color: #22c55e;
  background: rgba(240, 253, 244, 0.85);
}

.dark .word-card.mastered {
  background: rgba(22, 101, 52, 0.2);
}

.word-card.playing {
  border-left-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.05);
  transform: translateX(4px);
}

.dark .word-card.playing {
  background: rgba(139, 92, 246, 0.15);
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
  color: #1e293b;
}

.dark .word {
  color: #f8fafc;
}

.phonetic {
  font-size: 16px;
  color: #64748b;
  font-family: 'Courier New', monospace;
}

.dark .phonetic {
  color: #94a3b8;
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
  background: rgba(34, 197, 94, 0.1);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.master-btn:hover {
  transform: scale(1.1);
  background: rgba(34, 197, 94, 0.2);
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
  background: rgba(96, 165, 250, 0.1);
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pronunciation-btn:hover {
  background: rgba(96, 165, 250, 0.2);
  transform: scale(1.05);
}

.pronunciation-btn:active {
  background: #60a5fa;
  color: white;
  transform: scale(0.95);
}

.definition {
  margin-top: 12px;
  padding-left: 12px;
  border-left: 3px solid #e2e8f0;
  color: #475569;
  line-height: 1.6;
  font-size: 16px;
}

.dark .definition {
  color: #cbd5e1;
  border-left-color: #334155;
}

.sentence {
  margin-top: 8px;
  padding-left: 12px;
  border-left: 3px solid #a78bfa;
  color: #7c3aed;
  line-height: 1.6;
  font-size: 14px;
  font-style: italic;
}

.dark .sentence {
  color: #a78bfa;
  border-left-color: #7c3aed;
}

.sentence-cn {
  margin-top: 4px;
  padding-left: 12px;
  border-left: 3px solid #22c55e;
  color: #16a34a;
  line-height: 1.6;
  font-size: 14px;
}

.dark .sentence-cn {
  color: #4ade80;
  border-left-color: #22c55e;
}
</style>