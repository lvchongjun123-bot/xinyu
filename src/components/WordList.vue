<template>
  <div v-if="words.length === 0" class="empty-state">
    <p>📭 没有找到匹配的单词</p>
  </div>
  <div v-else class="word-grid">
    <WordCard
      v-for="(word, index) in words"
      :key="word.id"
      :word-data="word"
      :index="index"
      :show-phonetic="showPhonetic"
      :show-definition="showDefinition"
      :is-playing="playingIndex === index"
      :mastered="masteredMap[word.id] || false"
      :image-url="imageMap[word.word] || ''"
      @toggle-master="$emit('toggle-master', word.id)"
      @play="(idx, type) => $emit('play-word', idx, type)"
      @load-image="(word, idx) => $emit('load-image', word, idx)"
    />
  </div>
</template>

<script setup>
import WordCard from './WordCard.vue'

defineProps({
  words: { type: Array, required: true },
  showPhonetic: { type: Boolean, default: true },
  showDefinition: { type: Boolean, default: true },
  playingIndex: { type: Number, default: -1 },
  masteredMap: { type: Object, required: true },
  imageMap: { type: Object, default: () => ({}) }
})

defineEmits(['toggle-master', 'play-word', 'load-image'])
</script>
