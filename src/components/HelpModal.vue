<template>
  <Teleport to="body">
    <div class="help-overlay" @click.self="$emit('close')" v-if="visible" role="dialog" aria-modal="true" aria-label="快捷键速查">
      <div class="help-dialog" tabindex="-1">
        <div class="help-header">
          <h2>⌨️ 快捷键速查</h2>
          <button class="help-close" @click="$emit('close')">✕</button>
        </div>

        <div class="help-body">
          <!-- 全局 -->
          <div class="help-section">
            <div class="help-section-title">🌐 全局快捷键</div>
            <div class="help-row"><kbd>?</kbd><span>打开/关闭此面板</span></div>
            <div class="help-row"><kbd>Esc</kbd><span>返回首页 / 退出当前模块</span></div>
          </div>

          <!-- 闪卡复习 -->
          <div class="help-section">
            <div class="help-section-title">🃏 闪卡复习</div>
            <div class="help-row"><kbd>Space</kbd><span>翻转卡片</span></div>
            <div class="help-row"><kbd>1</kbd><span>忘记了（Again）</span></div>
            <div class="help-row"><kbd>2</kbd><span>困难（Hard）</span></div>
            <div class="help-row"><kbd>3</kbd><span>良好（Good）</span></div>
            <div class="help-row"><kbd>4</kbd><span>简单（Easy）</span></div>
            <div class="help-row"><span class="help-gesture">← 左滑</span><span>忘记</span></div>
            <div class="help-row"><span class="help-gesture">→ 右滑</span><span>认识</span></div>
          </div>

          <!-- 打字练习 -->
          <div class="help-section">
            <div class="help-section-title">⌨️ 打字练习</div>
            <div class="help-row"><kbd>A-Z</kbd><span>输入字母，输错自动清空</span></div>
            <div class="help-row"><kbd>Backspace</kbd><span>删除上一个字符</span></div>
          </div>

          <!-- 句子听打 -->
          <div class="help-section">
            <div class="help-section-title">🎹 句子听打</div>
            <div class="help-row"><kbd>Tab</kbd><span>跳到下一个词</span></div>
            <div class="help-row"><kbd>Shift+Tab</kbd><span>回到上一个词</span></div>
            <div class="help-row"><kbd>Enter</kbd><span>提交 / 跳到下一个词</span></div>
            <div class="help-row"><kbd>Esc</kbd><span>跳过当前句</span></div>
            <div class="help-row"><kbd>Backspace</kbd><span>空词时回到上一个词</span></div>
          </div>

          <!-- 听写 -->
          <div class="help-section">
            <div class="help-section-title">🎧 听写模式</div>
            <div class="help-row"><kbd>Enter</kbd><span>提交答案</span></div>
          </div>

          <!-- AI 术语 -->
          <div class="help-section">
            <div class="help-section-title">🧠 AI 术语</div>
            <div class="help-row"><kbd>A</kbd><span>测验模式 — 选择 A</span></div>
            <div class="help-row"><kbd>B</kbd><span>测验模式 — 选择 B</span></div>
            <div class="help-row"><kbd>C</kbd><span>测验模式 — 选择 C</span></div>
            <div class="help-row"><kbd>D</kbd><span>测验模式 — 选择 D</span></div>
          </div>

          <!-- 单词浏览 -->
          <div class="help-section">
            <div class="help-section-title">📖 单词浏览</div>
            <div class="help-row"><kbd>Ctrl+K</kbd><span>聚焦搜索框</span></div>
          </div>
        </div>

        <div class="help-footer">
          按 <kbd>?</kbd> 或 <kbd>Esc</kbd> 关闭
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

// 焦点管理：组件挂载时（visible=true）移入弹窗
let lastFocus = null
onMounted(() => {
  lastFocus = document.activeElement
  setTimeout(() => {
    const dialog = document.querySelector('.help-dialog')
    if (dialog) dialog.focus()
  }, 50)
})

// 卸载时恢复焦点
onBeforeUnmount(() => {
  if (lastFocus && typeof lastFocus.focus === 'function') {
    lastFocus.focus()
    lastFocus = null
  }
})

// 全局 Escape 关闭
function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    emit('close')
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>
