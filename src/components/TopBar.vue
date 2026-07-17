<template>
  <header class="topbar">
    <button class="topbar-logo" @click="$emit('go-home')" title="返回首页">
      📚 英语词汇
    </button>

    <div class="search-box" v-if="showSearch" ref="searchBox">
      <Search :size="16" class="search-icon" />
      <input
        v-model="query"
        type="text"
        placeholder="搜索单词或释义..."
        @input="onInput"
        @focus="focused = true"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <div class="search-dropdown" v-if="focused && query.length >= 2 && results.length > 0">
        <div
          v-for="(r, i) in results.slice(0, 50)"
          :key="i"
          class="search-result-item"
          :class="{ highlighted: i === highlightIndex }"
          @mousedown.prevent="$emit('select-word', r)"
        >
          <span class="result-word">{{ r.word }}</span>
          <span class="result-def">{{ r.definition?.slice(0, 30) }}</span>
          <span class="result-book">{{ r._bookName }}</span>
        </div>
      </div>
      <div class="search-dropdown" v-else-if="focused && query.length >= 2 && allBookWords">
        <div class="search-result-empty">未找到匹配的单词</div>
      </div>
    </div>

    <div class="topbar-spacer"></div>

    <button
      v-if="showUser"
      class="topbar-user"
      @click="$emit('go-profile')"
      title="个人中心"
    >
      <span v-if="userAvatar && userAvatar.startsWith('data:')" class="topbar-user-avatar-img">
        <img :src="userAvatar" alt="头像" />
      </span>
      <span v-else class="topbar-user-avatar">
        <User :size="18" />
      </span>
      <span class="topbar-user-name">{{ userName || '用户' }}</span>
    </button>

    <button
      class="icon-btn"
      @click="$emit('toggle-dark')"
      title="切换主题"
    >
      <Sun :size="18" />
    </button>
  </header>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search, User, Sun } from 'lucide-vue-next'

const props = defineProps({
  showSearch: { type: Boolean, default: false },
  showUser: { type: Boolean, default: true },
  userName: { type: String, default: '' },
  userAvatar: { type: String, default: '' },
  allBookWords: { type: Array, default: null }
})

const emit = defineEmits(['toggle-dark', 'update:query', 'go-home', 'go-profile', 'select-word'])

const query = ref('')
const focused = ref(false)
const highlightIndex = ref(-1)

const results = computed(() => {
  if (!props.allBookWords || query.value.length < 2) return []
  const q = query.value.toLowerCase()
  return props.allBookWords.filter(w =>
    w.word?.toLowerCase().includes(q) || w.definition?.includes(q)
  )
})

let _timer = null
function onInput() {
  highlightIndex.value = -1
  if (!props.allBookWords) {
    clearTimeout(_timer)
    _timer = setTimeout(() => emit('update:query', query.value), 300)
  }
}

function onKeydown(e) {
  if (!props.allBookWords || results.value.length === 0) return
  const max = Math.min(results.value.length, 8) - 1

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    highlightIndex.value = highlightIndex.value < max ? highlightIndex.value + 1 : 0
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    highlightIndex.value = highlightIndex.value > 0 ? highlightIndex.value - 1 : max
  } else if (e.key === 'Enter' && highlightIndex.value >= 0) {
    e.preventDefault()
    const r = results.value[highlightIndex.value]
    if (r) emit('select-word', r)
    focused.value = false
  } else if (e.key === 'Escape') {
    focused.value = false
  }
}

function onBlur() {
  setTimeout(() => { focused.value = false }, 150)
}
</script>

<style scoped>
.search-box { position: relative; }
.search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  color: var(--muted-foreground); pointer-events: none;
}
.search-box input { padding-left: 32px; }

.icon-btn {
  display: flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: var(--radius-md);
  border: none; background: none; cursor: pointer;
  color: var(--muted-foreground); transition: all var(--transition-fast);
}
.icon-btn:hover { background: var(--card-hover); color: var(--foreground); }

.topbar-user {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 8px; border: none; background: none;
  border-radius: var(--radius-md); cursor: pointer; font-family: inherit;
  color: var(--foreground); font-size: 13px;
}
.topbar-user:hover { background: var(--card-hover); }
.topbar-user-avatar {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 50%;
  background: var(--primary-subtle); color: var(--primary);
}
.topbar-user-avatar-img img {
  width: 28px; height: 28px; border-radius: 50%; object-fit: cover;
}
.topbar-user-name { color: var(--foreground); }

/* ponytail: search-box uses inline input, global input styles in style.css cover the rest */
</style>
