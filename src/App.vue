<template>
  <div :class="{ dark }">
    <div v-if="isLoading" class="loading-screen"><div class="loading-spinner"></div><p>加载中...</p></div>
    <div v-else class="app-root" :class="{ 'layout-desktop': isDesktop }">
      <DesktopSidebar v-if="isDesktop" :active-view="currentView"
        :user-name="userName" :level="gamify.level.value"
        :wrong-words-count="wrongWordsCount" :due-reviews="studyStats.dueReviews"
        :today-done="todayDoneCount" :today-total="todayStats.newCount + todayStats.reviewCount" :streak="studyStats.streak"
        @navigate="enterModule" @go-home="goHome" @go-profile="currentView='profile'" @toggle-dark="dark=!dark" />
      <TopBar v-if="!isDesktop" :show-search="currentView==='browse'"
        :user-name="userName" @toggle-dark="dark=!dark" @go-home="goHome" @go-profile="currentView='profile'" @select-word="onSearchSelect" />
      <main class="main-area" :class="{ 'main-desktop': isDesktop }">
        <Transition name="view-fade" mode="out-in">
        <Dashboard v-if="currentView==='dashboard'"
          :stats="studyStats" :today-new="todayStats.newCount" :today-review="todayStats.reviewCount"
          :today-done="todayDoneCount" :today-percent="todayPercent" :user-name="userName"
          :gamify-level="gamify.level.value" :gamify-xp="gamify.xp.value" :gamify-xp-to-next="gamify.xpToNext.value"
          :gamify-today-xp="gamify.todayXp.value" :gamify-level-progress="gamify.levelProgress.value"
          :gamify-is-max-level="gamify.isMaxLevel.value" :earned-badges="gamify.allBadges.value.filter(b => b.earned)"
          :due-reviews="studyStats.dueReviews" :wrong-words-count="wrongWordsCount"
          :sentence-count="allBookWords.filter(w => w.sentence?.trim()).length"
          :weekly-stats="weeklyStats" :heatmap-data="heatmapData"
          @select-module="enterModule" @go-wrong-words="enterWrongWords" @switch-book="cycleBook" />
        <TypingPanel v-else-if="currentView==='typing'" :typing="typing" @back="goHome" />
        <FlashcardPanel v-else-if="currentView==='flashcard'" :fc="flashcard" @back="goHome" />
        <div v-else-if="currentView==='browse'" class="browse-view">
          <div class="browse-bar"><button class="btn btn-ghost" @click="goHome">← 返回</button><span>{{ activeBookName }}</span><button class="btn btn-ghost btn-sm" @click="showAllWords=!showAllWords">{{ showAllWords?'今日单词':'全部单词' }}</button></div>
          <WordList :words="currentWords" :mastered-map="masteredMap" :image-map="images.imageCache" :show-phonetic="showPhonetic" :show-definition="showSentence" @toggle-master="(id)=>progress.toggleMaster(id)" @play-word="(idx)=>speakWord(currentWords.value[idx]?.word)" @load-image="(w)=>images.getImage(w)" />
        </div>
        <DictationPanel v-else-if="currentView==='dictation'"
          :type="dcType" :index="dcIdx" :total="dcWords.length" :item="dcItem" :correct-ans="dcCorrect"
          :feedback="dcShowFeedback" :ok="dcIsCorrect"
          :completed="dcCompleted" :correct-count="dcCorrectList.length" :wrong-count="dcWrongList.length"
          :elapsed="dcElapsed" :pct="dcPct" :wrong-list="dcWrongList"
          @play="dcPlay" @submit="(a)=>dcSubmit(a)" @next="dcNext" @restart="dcRestart" @exit="goHome" />
        <SentenceTypingPanel v-else-if="currentView==='sentenceTyping'" :st="sentenceTyping" @back="goHome" />
        <ReadingPanel v-else-if="currentView==='reading'"
          :passage="readingPassage" :current-question-index="readingQIdx" :total-questions="readingTotal"
          :user-answers="readingAnswers" :show-result="readingShowResult" :correct-count="readingCorrectCount"
          :score="readingScore" :progress="readingProgress"
          @submit-answer="onReadingSubmit" @next-question="onReadingNext" @prev-question="onReadingPrev"
          @restart="onReadingRestart" @exit="goHome" />
        <AiGlossaryPanel v-else-if="currentView==='ai-glossary'" @back="goHome" />
        <ImportPanel v-else-if="currentView==='import'" @back="goHome" @imported="onImported" />
        <ProfileCenter v-else-if="currentView==='profile'" :stats="studyStats" @back="goHome" @logout="handleLogout" />
        </Transition>
      </main>
    </div>
    <HelpModal :visible="showHelp" @close="showHelp=false" />
    <OnboardingOverlay v-if="showOnboarding" :visible="showOnboarding" @skip="showOnboarding=false" @done="onOnboardingDone" />
    <MobileTabBar v-if="!isDesktop" :active-view="currentView" :wrong-count="wrongWordsCount" @navigate="onMobileNav" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useDarkMode } from './composables/useDarkMode.js'
import { useStudyPlan } from './composables/useStudyPlan.js'
import { useGamification } from './composables/useGamification.js'
import { useTyping } from './composables/useTyping.js'
import { useFlashcard } from './composables/useFlashcard.js'
import { useDictation } from './composables/useDictation.js'
import { useSentenceTyping } from './composables/useSentenceTyping.js'
import { useReading } from './composables/useReading.js'
import { useSpeech } from './composables/useSpeech.js'
import { useProgress } from './composables/useProgress.js'
import { useWrongWords } from './composables/useWrongWords.js'
import { useLearningReport } from './composables/useLearningReport.js'
import { useImages } from './composables/useImages.js'
import { useOnline } from './composables/useOnline.js'
import Dashboard from './components/Dashboard.vue'
import TypingPanel from './components/TypingPanel.vue'
import FlashcardPanel from './components/FlashcardPanel.vue'
import DictationPanel from './components/DictationPanel.vue'
import SentenceTypingPanel from './components/SentenceTypingPanel.vue'
import ReadingPanel from './components/ReadingPanel.vue'
import WordList from './components/WordList.vue'
import AiGlossaryPanel from './components/AiGlossaryPanel.vue'
import ImportPanel from './components/ImportPanel.vue'
import ProfileCenter from './components/ProfileCenter.vue'
import TopBar from './components/TopBar.vue'
import MobileTabBar from './components/MobileTabBar.vue'
import DesktopSidebar from './components/DesktopSidebar.vue'
import HelpModal from './components/HelpModal.vue'
import OnboardingOverlay from './components/OnboardingOverlay.vue'

const { dark } = useDarkMode()
const isDesktop = computed(() => {
  if (typeof window==='undefined') return false
  return !!(window.pywebview) || location.search.includes('desktop=1') || window.innerWidth >= 769
})
const userName = ref('')
const userId = ref('local')
const isLoading = ref(true)
const wordData = ref({})
const activeBook = ref(localStorage.getItem('ev_active_book')||'gaokao')
const readingData = ref([])
const showHelp = ref(false)
const showOnboarding = ref(!localStorage.getItem('ev_onboarding_done'))
const currentView = ref('dashboard')
const showAllWords = ref(false), showPhonetic = ref(true), showSentence = ref(true)
const activeBookName = computed(()=>({gaokao:'高考',cet4:'四级',cet6:'六级',ielts:'雅思',imported:'导入',ai_terms:'AI术语'})[activeBook.value]||activeBook.value)

Promise.all([import('./data/word.js'),import('./data/readings.js')]).then(async([gaokao,readings])=>{
  wordData.value = { gaokao: gaokao.default }
  readingData.value = readings.default
  try {
    const raw = localStorage.getItem('ev_imported_words')
    if (raw) {
      const words = JSON.parse(raw)
      if (Array.isArray(words) && words.length) {
        words.forEach((w, i) => { w.id = 'imported_' + (i + 1) })
        wordData.value = { ...wordData.value, imported: [{ id: 1, name: '导入词库', words }] }
      }
    }
  } catch (e) { console.error('[Import] 导入词库数据解析失败', e) }
  const saved = localStorage.getItem('ev_active_book')
  if (saved && saved !== 'gaokao') {
    try {
      const mod = await import(`./data/${saved}.js`)
      wordData.value = { ...wordData.value, [saved]: mod.default }
      activeBook.value = saved
    } catch (e) {
      console.error('[Book] 词库加载失败', e)
      window._showToast(navigator.onLine ? '词库切换失败' : '离线状态下无法切换词库')
    }
  }
  isLoading.value = false
}).catch(e => {
  console.error('数据加载失败:', e)
  isLoading.value = false
  window._showToast('数据加载失败，请刷新重试')
})

const speech=useSpeech();const studyPlan=useStudyPlan(userId);const gamify=useGamification(userId);const images=useImages();const { isOnline }=useOnline()
const allBookWords=computed(()=>{const u=wordData.value[activeBook.value]||[];return u.flatMap(x=>x.words||[])})
const progress=useProgress(activeBook,computed(()=>allBookWords.value),userId);const wrongWords=useWrongWords(userId)
const learningReport=useLearningReport(studyPlan,activeBook,computed(()=>allBookWords.value))
const todayPlan=computed(()=>{if(!allBookWords.value.length)return{reviews:[],newWords:[],all:[]};return studyPlan.getTodayWords(activeBook.value,allBookWords.value)})
const todayWords=computed(()=>todayPlan.value.all)
const studyStats=computed(()=>studyPlan.getStats(activeBook.value,allBookWords.value,todayPlan.value.reviews.length))
watch(studyStats, (stats) => {
  gamify.syncStudyData({ learned: stats.learned, streak: stats.streak })
}, { immediate: true })
const todayStats=computed(()=>({newCount:todayPlan.value.newWords?.length||0,reviewCount:todayPlan.value.reviews?.length||0}))
const todayDoneCount=computed(()=>{const t=new Date().toISOString().slice(0,10);return allBookWords.value.filter(w=>{const r=studyPlan.data.value[activeBook.value]?.words?.[w.id];return r?.lastReviewed?.slice(0,10)===t}).length})
const todayPercent=computed(()=>{const t=todayStats.value.newCount+todayStats.value.reviewCount;return t?Math.round(todayDoneCount.value/t*100):0})
const wrongWordsCount=computed(()=>wrongWords.getWrongCount(activeBook.value))
const weeklyStats=computed(()=>learningReport.weeklyStats.value)
const heatmapData=computed(()=>learningReport.monthlyStats?.value?.daily||[])
const masteredMap=computed(()=>progress.masteredMap.value||{})
const currentWords=computed(()=>showAllWords.value?allBookWords.value:todayWords.value)
const typing=useTyping(todayWords,speech,onWrongWord,(wid,r)=>{onWordLearned(activeBook.value,wid,r)})
const flashcard=useFlashcard(todayWords,(wid,r)=>{onWordLearned(activeBook.value,wid,r)},onWrongWord)
const dictation=useDictation(speech,onWrongWord,(wid)=>{onWordLearned(activeBook.value,wid,3)})
const{isDictationMode:dcMode,dictationType:dcType,currentDictationIndex:dcIdx,userAnswer:dcAnswer,showHint:dcHint,showFeedback:dcShowFeedback,isCorrect:dcIsCorrect,dictationWords:dcWords,currentDictationItem:dcItem,correctAnswer:dcCorrect,isCompleted:dcCompleted,correctList:dcCorrectList,wrongList:dcWrongList,dictationElapsed:dcElapsed,startDictation:_startDc,playCurrent:dcPlay,submitAnswer:dcSubmit,nextItem:dcNext,restartDictation:dcRestart,exitDictation:dcExit}=dictation
const dcPct=computed(()=>{const t=dcCorrectList.value.length+dcWrongList.value.length;return t?Math.round(dcCorrectList.value.length/t*100):0})
const sentenceTyping=useSentenceTyping(speech,(wid,r)=>{onWordLearned(activeBook.value,wid,r)},onWrongWord)
const reading=useReading()
const{passage:readingPassage,currentQuestionIndex:readingQIdx,totalQuestions:readingTotal,userAnswers:readingAnswers,showResult:readingShowResult,correctCount:readingCorrectCount,score:readingScore,progress:readingProgress,startReading,submitAnswer:readingSubmit,nextQuestion:readingNext,prevQuestion:readingPrev,restart:readingRestart}=reading

function goHome() { exitAllModules(); currentView.value = 'dashboard' }
function exitAllModules() {
  if (typing.isActive?.value) typing.exit()
  if (flashcard.isActive?.value) flashcard.exit()
  if (sentenceTyping.isActive?.value) sentenceTyping.exit()
  if (dcMode.value) dcExit()
  if (reading.isReadingMode?.value) reading.exitReading()
}
function enterModule(id) {
  exitAllModules()
  currentView.value = id
  nextTick(() => {
    switch (id) {
      case 'typing': typing.start(); break
      case 'flashcard': flashcard.start(); break
      case 'dictation': {
        const words = allBookWords.value.filter(w => w.word?.trim())
        if (!words.length) { window._showToast('无单词'); return }
        _startDc(words, 'word')
        break
      }
      case 'reading': {
        const articles = Array.isArray(readingData.value) ? readingData.value : []
        const passage = articles[0]
        if (passage) {
          startReading(passage, (result) => {
            const xp = Math.round((result.score / result.total) * 50)
            if (xp > 0) gamify.recordAction({ type: 'reading', xp })
          })
        } else {
          window._showToast('暂无文章')
        }
        break
      }
      case 'sentenceTyping': {
        const words = todayPlan.value.all.filter(w => w.sentence?.trim())
        if (!words.length) { window._showToast('无句子'); return }
        sentenceTyping.start(words)
        break
      }
    }
  })
}
function onMobileNav(view) {
  if (view === currentView.value) return
  goHome()
  nextTick(() => enterModule(view))
}
function onWordLearned(bookId, wordId, rating) {
  const isNew = !studyPlan.isLearned(bookId, wordId)
  studyPlan.markWord(bookId, wordId, rating)
  gamify.recordAction({ type: isNew ? 'new' : 'learn' })
}
function onWrongWord(wordObj) {
  wrongWords.recordWrong(activeBook.value, wordObj, currentView.value)
}
function speakWord(word) {
  if (!window.speechSynthesis) return
  speech.speak(word, { lang: 'en-US', rate: 0.85 })
}
function enterWrongWords() {
  const list = wrongWords.getWrongList(activeBook.value)
  if (!list.length) { window._showToast('暂无错题'); return }
  flashcard.startWithWords(list, (wid, r) => {
    onWordLearned(activeBook.value, wid, r)
    if (r >= 3) wrongWords.removeWrong(activeBook.value, wid)
  })
  currentView.value = 'flashcard'
}
function cycleBook() {
  const books = Object.keys(wordData.value).filter(k => k !== activeBook.value && k !== 'ai_terms')
  if (!books.length) return
  activeBook.value = books[0]
  localStorage.setItem('ev_active_book', books[0])
}
function onImported() {
  try {
    const raw = localStorage.getItem('ev_imported_words')
    if (raw) {
      const words = JSON.parse(raw)
      if (Array.isArray(words) && words.length) {
        words.forEach((w, i) => { w.id = 'imported_' + (i + 1) })
        wordData.value = { ...wordData.value, imported: [{ id: 1, name: '导入词库', words }] }
      }
    }
  } catch (e) { console.error('[Import] 导入处理失败', e) }
  goHome()
}
function onSearchSelect(result) {
  showAllWords.value = true
  currentView.value = 'browse'
}
function handleLogout() { goHome() }
function onReadingSubmit(a) { readingSubmit(a) }
function onReadingNext() { readingNext() }
function onReadingPrev() { readingPrev() }
function onReadingRestart() { readingRestart() }
function onOnboardingDone(book) { activeBook.value = book; showOnboarding.value = false }
function onGlobalKeydown(e){if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;if(e.key==='?'){e.preventDefault();showHelp.value=!showHelp.value}if(e.key==='Escape'){if(showHelp.value){showHelp.value=false;return}if(currentView.value!=='dashboard')goHome()}}
onMounted(()=>window.addEventListener('keydown',onGlobalKeydown))
onUnmounted(()=>window.removeEventListener('keydown',onGlobalKeydown))
</script>

<style>
.loading-screen{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;gap:16px;color:var(--muted)}
.loading-spinner{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .8s linear infinite}
.browse-view{max-width:960px;margin:0 auto;width:100%}
.browse-bar{display:flex;align-items:center;gap:12px;margin-bottom:20px}
</style>