import { ref } from 'vue'

/** 预加载浏览器语音列表（惰性加载，避免 import 时副作用） */
let _voicesCache = null
let _loaded = false
function loadVoices() {
  if (_loaded) return
  _loaded = true
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  _voicesCache = window.speechSynthesis.getVoices()
  if (_voicesCache?.length) return
  // Chrome 异步加载 voices，绑定事件等待
  window.speechSynthesis.onvoiceschanged = () => {
    _voicesCache = window.speechSynthesis.getVoices()
  }
}

export function useSpeech() {
  // 惰性触发首次语音列表加载（避免 import 时副作用）
  loadVoices()

  const isPlayingAll = ref(false)
  const currentPlayingIndex = ref(-1)

  function speak(text, { lang = 'en-US', rate = 0.9, onEnd = null, onError = null } = {}) {
    if (!text || typeof window === 'undefined' || !window.speechSynthesis) return

    const synth = window.speechSynthesis

    // Chrome bug 绕过: 如果 synthesis 卡住，先 resume
    if (synth.paused) synth.resume()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    utterance.rate = rate
    utterance.onend = onEnd
    utterance.onerror = (e) => {
      // "canceled" / "interrupted" 是正常流程中断，静默处理
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.warn('[Speech]', e.error)
        onError?.(e)
      }
    }

    // 只有当前有语音在播/排队时才取消
    // cancel() 是异步的——用 setTimeout 替代 rAF 确保 cancel 完成后再 speak
    if (synth.speaking || synth.pending) {
      synth.cancel()
      setTimeout(() => {
        // cancel 后需要重新设置 utterance，因为 cancel 可能已经将其标记为已使用
        const retry = new SpeechSynthesisUtterance(text)
        retry.lang = lang
        retry.rate = rate
        retry.onend = onEnd
        retry.onerror = utterance.onerror
        synth.speak(retry)
      }, 80)
    } else {
      synth.speak(utterance)
    }
  }

  function playWord(index, words, type = 'us') {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const synth = window.speechSynthesis
    const word = words[index]?.word
    if (!word) return

    if (synth.paused) synth.resume()
    synth.cancel()

    const onUtteranceEnd = () => {
      if (isPlayingAll.value) {
        const next = currentPlayingIndex.value + 1
        if (next < words.length) {
          setTimeout(() => playWord(next, words), 1000)
        } else {
          stopAll()
        }
      } else {
        currentPlayingIndex.value = -1
      }
    }

    // ponytail: abort guard — stopAll() was called during the 80ms timeout window
    const doSpeak = () => {
      if (!isPlayingAll.value && currentPlayingIndex.value === -1) return
      const u = new SpeechSynthesisUtterance(word)
      u.lang = type === 'uk' ? 'en-GB' : 'en-US'
      u.rate = 0.9
      u.onend = onUtteranceEnd
      u.onerror = (e) => {
        if (e.error !== 'canceled') console.warn('[Speech]', e.error)
      }
      synth.speak(u)
    }

    currentPlayingIndex.value = index
    setTimeout(doSpeak, 80)
  }

  function stopAll() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    isPlayingAll.value = false
    currentPlayingIndex.value = -1
  }

  function playAll(words) {
    if (isPlayingAll.value) {
      stopAll()
      return
    }
    if (!words || !words.length) return
    isPlayingAll.value = true
    currentPlayingIndex.value = 0
    playWord(0, words)
  }

  return { isPlayingAll, currentPlayingIndex, speak, playWord, stopAll, playAll }
}
