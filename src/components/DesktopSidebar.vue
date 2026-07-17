<template>
  <aside class="app-sidebar">
    <div class="sb-header" @click="$emit('go-home')">
      <svg class="sb-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="8" y1="7" x2="16" y2="7"/><line x1="8" y1="11" x2="14" y2="11"/>
      </svg>
      <span class="sb-title">语海求索</span>
    </div>

    <nav class="sb-nav">
      <button class="sb-item" :class="{ active: activeView === 'dashboard' }" @click="$emit('navigate', 'dashboard')">
        <LayoutDashboard :size="18" :stroke-width="activeView === 'dashboard' ? 2.75 : 1.5" />
        <span>首页</span>
      </button>

      <div class="sb-divider"></div>
      <div class="sb-section">学习模式</div>

      <button v-for="item in learnNav" :key="item.view"
        class="sb-item" :class="{ active: activeView === item.view }"
        @click="$emit('navigate', item.view)">
        <component :is="item.icon" :size="18" :stroke-width="activeView === item.view ? 2.75 : 1.5" />
        <span>{{ item.label }}</span>
      </button>

      <div class="sb-divider"></div>
      <div class="sb-section">浏览</div>

      <button v-for="item in browseNav" :key="item.view"
        class="sb-item" :class="{ active: activeView === item.view }"
        @click="$emit('navigate', item.view)">
        <component :is="item.icon" :size="18" :stroke-width="activeView === item.view ? 2.75 : 1.5" />
        <span>{{ item.label }}</span>
        <span v-if="item.badge" class="sb-badge">{{ item.badge }}</span>
      </button>
    </nav>

    <div class="sb-today" v-if="todayTotal > 0">
      <div class="sb-today-row">
        <span class="sb-today-label">今日</span>
        <span class="sb-today-val">{{ todayDone }}<span class="sb-today-muted">/{{ todayTotal }}</span></span>
      </div>
      <div class="progress-bar" style="height:3px"><div class="progress-bar-fill" :style="{ width: (todayTotal ? Math.round(todayDone/todayTotal*100) : 0) + '%' }"></div></div>
      <div class="sb-today-row" style="margin-top:6px">
        <span v-if="streak > 0" class="sb-today-label">🔥 {{ streak }} 天</span>
        <span v-if="dueReviews > 0" class="sb-today-label" style="margin-left:auto">⚠️ {{ dueReviews }} 待复习</span>
      </div>
    </div>

    <div class="sb-bottom">
      <button class="sb-theme-btn" @click="$emit('toggle-dark')">
        <Sun v-if="isDark" :size="18" /><Moon v-else :size="18" />
        <span>{{ isDark ? '浅色模式' : '深色模式' }}</span>
      </button>
      <div class="sb-user" v-if="userName" @click="$emit('go-profile')">
        <span class="sb-avatar">{{ userAvatar || '😊' }}</span>
        <div class="sb-user-info">
          <span class="sb-username">{{ userName }}</span>
          <span class="sb-level" v-if="level">Lv.{{ level }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { LayoutDashboard, Keyboard, Layers, BookOpen, Headphones, Pencil, BookMarked, Brain, Moon, Sun } from 'lucide-vue-next'

const props = defineProps({
  activeView: { type: String, default: 'dashboard' },
  userName: { type: String, default: '' },
  userAvatar: { type: String, default: '' },
  level: { type: Number, default: 0 },
  wrongWordsCount: { type: Number, default: 0 },
  dueReviews: { type: Number, default: 0 },
  todayDone: { type: Number, default: 0 },
  todayTotal: { type: Number, default: 0 },
  streak: { type: Number, default: 0 },
})
defineEmits(['navigate', 'go-home', 'go-profile', 'toggle-dark'])

const isDark = ref(false)
if (typeof window !== 'undefined') {
  const mo = new MutationObserver(() => { isDark.value = document.documentElement.classList.contains('dark') })
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  isDark.value = document.documentElement.classList.contains('dark')
}

const learnNav = [
  { view: 'typing', label: '打字练习', icon: Keyboard },
  { view: 'flashcard', label: '闪卡复习', icon: Layers },
  { view: 'dictation', label: '听写模式', icon: Headphones },
  { view: 'sentenceTyping', label: '句子听打', icon: Pencil },
]
const browseNav = [
  { view: 'browse', label: '单词浏览', icon: BookOpen, badge: props.wrongWordsCount || undefined },
  { view: 'reading', label: '阅读理解', icon: BookMarked },
  { view: 'ai-glossary', label: 'AI 术语', icon: Brain },
]
</script>

<style scoped>
.app-sidebar {
  width: 220px;
  display: flex;
  flex-direction: column;
  padding: 0;
  background: var(--sidebar-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border-right: 1px solid var(--sidebar-border);
  box-shadow: var(--glass-shadow);
  user-select: none;
  -webkit-app-region: drag;
}

.sb-header {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  padding: 12px var(--space-md);
  cursor: pointer;
  -webkit-app-region: no-drag;
}
.sb-logo { width: 20px; height: 20px; color: var(--primary); flex-shrink: 0; }
.sb-title { font-size: var(--text-base); font-weight: var(--font-bold); letter-spacing: -0.01em; color: var(--foreground); }

.sb-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-xs) var(--space-sm);
  overflow-y: auto;
}
.sb-section {
  padding: var(--space-md) var(--space-md) var(--space-xs);
  font-size: 10px; font-weight: var(--font-semibold);
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--muted); -webkit-app-region: no-drag;
}
.sb-divider {
  height: 1px; background: var(--sidebar-border);
  margin: var(--space-xs) var(--space-md);
}

.sb-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: 10px var(--space-md);
  margin: 0 var(--space-sm);
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  font-size: var(--text-sm-alt);
  font-family: inherit;
  color: var(--muted);
  transition: background var(--transition-fast), color var(--transition-fast);
  text-align: left;
  -webkit-app-region: no-drag;
}
.sb-item:hover { background: var(--sidebar-hover); color: var(--foreground); }
.sb-item.active {
  background: var(--primary-subtle);
  color: var(--primary);
  font-weight: var(--font-semibold);
}

.sb-badge {
  margin-left: auto;
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--badge-bg);
  color: var(--badge-fg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sb-today {
  padding: var(--space-sm) var(--space-md); margin: var(--space-xs) var(--space-sm);
  border-radius: 6px; background: var(--card-hover);
  font-size: var(--text-xs);
}
.sb-today-row { display: flex; align-items: center; }
.sb-today-label { color: var(--muted); }
.sb-today-val { margin-left: auto; font-weight: var(--font-bold); color: var(--foreground); }
.sb-today-muted { font-weight: var(--font-normal); color: var(--muted); }

.sb-bottom {
  padding: var(--space-sm);
  border-top: 1px solid var(--sidebar-border);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sb-theme-btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-md);
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  color: var(--muted);
  transition: all var(--transition-fast);
  text-align: left;
  -webkit-app-region: no-drag;
}
.sb-theme-btn:hover { background: var(--sidebar-hover); color: var(--foreground); }

.sb-user {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-sm);
  margin-top: 2px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  -webkit-app-region: no-drag;
}
.sb-user:hover { background: var(--sidebar-hover); }
.sb-avatar { font-size: 18px; flex-shrink: 0; }
.sb-user-info { display: flex; flex-direction: column; gap: 0; min-width: 0; }
.sb-username { font-size: var(--text-sm); font-weight: var(--font-medium); color: var(--foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sb-level { font-size: 10px; color: var(--muted); }
</style>