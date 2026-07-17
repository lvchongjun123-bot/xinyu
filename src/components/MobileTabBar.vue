<template>
  <nav class="mobile-tab-bar">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="mobile-tab"
      :class="{ active: activeView === tab.id || (tab.id === 'more' && showMore) }"
      @click="tab.id === 'more' ? (showMore = !showMore) : $emit('navigate', tab.id)"
      :title="tab.label"
    >
      <component :is="tab.icon" :size="20" class="mobile-tab-icon" />
      <span class="mobile-tab-label">{{ tab.label }}</span>
      <span v-if="tab.badge" class="mobile-tab-badge">{{ tab.badge }}</span>
    </button>

    <Transition name="view-fade">
      <div v-if="showMore" class="mobile-more-popup" @click.self="showMore = false">
        <button v-for="m in moreModules" :key="m.id" class="mobile-more-btn"
          @click="$emit('navigate', m.id); showMore = false">
          <component :is="m.icon" :size="20" />
          <span>{{ m.label }}</span>
        </button>
      </div>
    </Transition>
  </nav>
</template>

<script setup>
import { computed, ref, markRaw } from 'vue'
import { LayoutDashboard, Keyboard, Layers, Grid3X3, User, Headphones, Pencil, BookMarked, Brain } from 'lucide-vue-next'

const props = defineProps({
  activeView: { type: String, default: 'dashboard' },
  wrongCount: { type: Number, default: 0 }
})

defineEmits(['navigate'])

const showMore = ref(false)

const tabs = computed(() => [
  { id: 'dashboard', icon: markRaw(LayoutDashboard), label: '首页' },
  { id: 'typing', icon: markRaw(Keyboard), label: '打字' },
  { id: 'flashcard', icon: markRaw(Layers), label: '闪卡' },
  { id: 'more', icon: markRaw(Grid3X3), label: '更多' },
  { id: 'profile', icon: markRaw(User), label: '我的' }
])

const moreModules = [
  { id: 'dictation', icon: markRaw(Headphones), label: '听写' },
  { id: 'sentenceTyping', icon: markRaw(Pencil), label: '句子' },
  { id: 'reading', icon: markRaw(BookMarked), label: '阅读' },
  { id: 'ai-glossary', icon: markRaw(Brain), label: 'AI术语' }
]
</script>
