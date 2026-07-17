<template>
  <div class="login-page">
    <div class="login-card">
      <!-- 标题 -->
      <div class="login-logo" @click="$emit('go-home')">
        <span class="login-logo-icon">📚</span>
        <h1>英语词汇</h1>
      </div>

      <!-- Tab 切换 -->
      <div class="login-tabs">
        <button
          :class="{ active: tab === 'login' }"
          @click="switchTab('login')"
        >登录</button>
        <button
          :class="{ active: tab === 'register' }"
          @click="switchTab('register')"
        >注册</button>
        <div class="login-tab-indicator" :class="tab"></div>
      </div>

      <!-- 错误提示 -->
      <div v-if="auth.error" class="login-error">{{ auth.error }}</div>

      <!-- 登录表单 -->
      <form v-if="tab === 'login'" @submit.prevent="handleLogin" class="login-form">
        <div class="login-field">
          <label>用户名</label>
          <input
            v-model="loginForm.username"
            type="text"
            placeholder="请输入用户名"
            autocomplete="username"
            maxlength="20"
          />
        </div>
        <div class="login-field">
          <label>密码</label>
          <input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            autocomplete="current-password"
          />
        </div>
        <button
          class="btn btn-primary login-submit"
          type="submit"
          :disabled="submitting || !loginForm.username || !loginForm.password"
        >
          <span v-if="submitting">登录中...</span>
          <span v-else>登录</span>
        </button>
        <p class="login-switch">
          还没有账号？
          <a href="#" @click.prevent="switchTab('register')">去注册 →</a>
        </p>
      </form>

      <!-- 注册表单 -->
      <form v-else @submit.prevent="handleRegister" class="login-form">
        <div class="login-field">
          <label>用户名</label>
          <input
            v-model="registerForm.username"
            type="text"
            placeholder="2-20位，支持中英文、数字、下划线"
            autocomplete="username"
            maxlength="20"
          />
        </div>
        <div class="login-field">
          <label>密码</label>
          <input
            v-model="registerForm.password"
            type="password"
            placeholder="至少4位"
            autocomplete="new-password"
          />
        </div>
        <div class="login-field">
          <label>确认密码</label>
          <input
            v-model="registerForm.confirm"
            type="password"
            placeholder="再次输入密码"
            autocomplete="new-password"
          />
        </div>
        <button
          class="btn btn-primary login-submit"
          type="submit"
          :disabled="submitting || !registerForm.username || !registerForm.password || !registerForm.confirm"
        >
          <span v-if="submitting">注册中...</span>
          <span v-else>注册</span>
        </button>
        <p class="login-switch">
          已有账号？
          <a href="#" @click.prevent="switchTab('login')">去登录 →</a>
        </p>
      </form>

      <!-- 模式提示 -->
      <p class="login-mode-hint">
        <template v-if="auth.isMySQLMode">🔗 MySQL 后端模式</template>
        <template v-else>💻 本地模式（数据存于浏览器）</template>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()

const tab = ref('login')
const submitting = ref(false)

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({ username: '', password: '', confirm: '' })

defineEmits(['go-home'])

// 切换 Tab 时清除错误
watch(tab, () => { auth.error = null })

function switchTab(t) {
  auth.error = null
  tab.value = t
}

async function handleLogin() {
  submitting.value = true
  try {
    await auth.login(loginForm.username.trim(), loginForm.password)
  } catch (e) {
    auth.error = '网络连接失败，请检查网络后重试'
    console.error('[Login] 登录失败:', e)
  } finally {
    submitting.value = false
  }
}

async function handleRegister() {
  if (registerForm.password !== registerForm.confirm) {
    auth.error = '两次密码不一致'
    return
  }
  if (registerForm.password.length < 4) {
    auth.error = '密码至少 4 位'
    return
  }
  submitting.value = true
  try {
    await auth.register(registerForm.username.trim(), registerForm.password)
  } catch (e) {
    auth.error = '网络连接失败，请检查网络后重试'
    console.error('[Login] 注册失败:', e)
  } finally {
    submitting.value = false
  }
}
</script>
