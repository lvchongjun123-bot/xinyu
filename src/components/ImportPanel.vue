<template>
  <div class="import-panel">
    <!-- 头部 -->
    <div class="import-header">
      <button class="btn btn-ghost" @click="$emit('back')">← 返回</button>
      <h2>📥 导入词库</h2>
      <span></span>
    </div>

    <!-- 拖拽上传区 -->
    <div
      class="import-dropzone"
      :class="{ dragging, loaded: previewData, error: errorMsg }"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <template v-if="!previewData">
        <div class="import-drop-icon">📁</div>
        <div class="import-drop-text">拖拽 CSV 或 JSON 文件到这里</div>
        <div class="import-drop-hint">或点击选择文件</div>
        <label class="btn btn-outline import-file-btn">
          <input type="file" accept=".csv,.json" hidden @change="onFileSelect" />
          选择文件
        </label>
      </template>
      <template v-else>
        <div class="import-drop-icon">✅</div>
        <div class="import-drop-text">{{ fileName }}</div>
        <div class="import-drop-hint">{{ previewData.length }} 个单词已加载</div>
        <button class="btn btn-ghost btn-sm" @click="clearFile">重新选择</button>
      </template>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="import-error">{{ errorMsg }}</div>

    <!-- 预览表格 -->
    <div class="import-preview" v-if="previewData && previewData.length">
      <div class="import-preview-header">
        <h3>📋 数据预览（前 10 条）</h3>
        <span class="import-preview-count">共 {{ previewData.length }} 条</span>
      </div>
      <div class="import-table-wrap">
        <table class="import-table">
          <thead>
            <tr>
              <th>#</th>
              <th>单词</th>
              <th>音标</th>
              <th>释义</th>
              <th>例句</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(w, i) in previewData.slice(0, 10)" :key="i">
              <td class="import-row-num">{{ i + 1 }}</td>
              <td class="import-row-word">{{ w.word }}</td>
              <td class="import-row-phonetic">{{ w.phonetic || '-' }}</td>
              <td class="import-row-def">{{ w.definition || '-' }}</td>
              <td class="import-row-sentence">{{ truncate(w.sentence, 30) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 导入选项 -->
    <div class="import-options" v-if="previewData">
      <label class="import-option">
        <input type="radio" v-model="importMode" value="merge" />
        <span>合并到当前词库（追加不重复单词）</span>
      </label>
      <label class="import-option">
        <input type="radio" v-model="importMode" value="replace" />
        <span>替换当前词库（清空后导入）</span>
      </label>
    </div>

    <!-- 操作按钮 -->
    <div class="import-actions" v-if="previewData">
      <button class="btn btn-outline" @click="$emit('back')">取消</button>
      <button class="btn btn-primary" @click="doImport" :disabled="importing">
        {{ importing ? '导入中...' : `导入 ${previewData.length} 个单词` }}
      </button>
    </div>

    <!-- 导入成功 -->
    <div v-if="importDone" class="import-success">
      <div class="import-success-icon">🎉</div>
      <h3>导入成功！</h3>
      <p>已导入 <strong>{{ importedCount }}</strong> 个单词</p>
      <button class="btn btn-primary" @click="$emit('back')">返回首页</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineEmits(['back', 'imported'])

const dragging = ref(false)
const previewData = ref(null)
const fileName = ref('')
const errorMsg = ref('')
const importMode = ref('merge')
const importing = ref(false)
const importDone = ref(false)
const importedCount = ref(0)

/** 解析 CSV 文本为对象数组 */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) throw new Error('CSV 至少需要标题行 + 1 行数据')

  // 解析标题行
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const wordIdx = headers.findIndex(h => h === 'word' || h === '单词')
  const phoneticIdx = headers.findIndex(h => h === 'phonetic' || h === '音标')
  const defIdx = headers.findIndex(h => h === 'definition' || h === '释义' || h === '定义')
  const sentenceIdx = headers.findIndex(h => h === 'sentence' || h === '例句')
  const sentenceCnIdx = headers.findIndex(h => h === 'sentence_cn' || h === '中文翻译')

  if (wordIdx === -1) throw new Error('CSV 中未找到"word"列，请确保包含单词列')

  const words = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    // 简单 CSV 解析（支持引号包裹的逗号）
    const cols = parseCSVLine(line)
    const word = (cols[wordIdx] || '').trim()
    if (!word) continue
    words.push({
      id: i, // 临时 ID
      word,
      phonetic: phoneticIdx >= 0 ? (cols[phoneticIdx] || '').trim() : '',
      definition: defIdx >= 0 ? (cols[defIdx] || '').trim() : '',
      sentence: sentenceIdx >= 0 ? (cols[sentenceIdx] || '').trim() : '',
      sentence_cn: sentenceCnIdx >= 0 ? (cols[sentenceCnIdx] || '').trim() : ''
    })
  }
  return words
}

/** 简易 CSV 行解析（处理引号内逗号） */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

/** 解析 JSON 文本 */
function parseJSON(text) {
  const data = JSON.parse(text)
  // 支持多种 JSON 格式
  if (Array.isArray(data)) {
    // 纯词数组：[{word, phonetic, definition, ...}]
    if (data.length && data[0].word) return data
    // 可能是 unit 数组：[{id, name, words: [...]}]
    if (data.length && data[0].words) {
      return data.flatMap(u => u.words.map((w, i) => ({ ...w, id: w.id || i + 1 })))
    }
  }
  // 对象：{words: [...]}
  if (data.words && Array.isArray(data.words)) return data.words
  throw new Error('无法识别的 JSON 格式，支持：[{word,...}] 或 [{words:[...]}]')
}

/** 处理文件 */
function processFile(file) {
  errorMsg.value = ''
  fileName.value = file.name
  const ext = file.name.split('.').pop().toLowerCase()
  if (!['csv', 'json'].includes(ext)) {
    errorMsg.value = '不支持的文件格式，请上传 .csv 或 .json 文件'
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const text = e.target.result
      const words = ext === 'csv' ? parseCSV(text) : parseJSON(text)
      if (!words.length) {
        errorMsg.value = '文件中没有找到有效的单词数据'
        return
      }
      // 确保每条都有 word 字段
      const valid = words.filter(w => w.word && typeof w.word === 'string' && w.word.trim())
      if (!valid.length) {
        errorMsg.value = '文件中没有找到有效的单词数据'
        return
      }
      if (valid.length > 5000) {
        errorMsg.value = `单词数量超过上限（${valid.length} > 5000），请拆分文件后分批导入`
        return
      }
      previewData.value = valid.slice(0, 5000).map((w, i) => ({
        id: i + 1,
        word: w.word.trim(),
        phonetic: w.phonetic || '',
        definition: w.definition || '',
        sentence: w.sentence || '',
        sentence_cn: w.sentence_cn || ''
      }))
    } catch (err) {
      errorMsg.value = `解析失败: ${err.message}`
      previewData.value = null
    }
  }
  reader.onerror = () => { errorMsg.value = '文件读取失败' }
  reader.readAsText(file)
}

function onDrop(e) {
  dragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) processFile(file)
}

function onFileSelect(e) {
  const file = e.target.files[0]
  if (file) processFile(file)
}

function clearFile() {
  previewData.value = null
  fileName.value = ''
  errorMsg.value = ''
  importDone.value = false
}

function truncate(str, len) {
  if (!str) return '-'
  return str.length > len ? str.slice(0, len) + '...' : str
}

/** 执行导入：写入 localStorage */
function doImport() {
  if (!previewData.value) return
  importing.value = true

  try {
    const storageKey = 'ev_imported_words'
    let existing = []
    try {
      existing = JSON.parse(localStorage.getItem(storageKey) || '[]')
    } catch (e) { console.error('[Import] 词库数据读取失败', e) }

    if (importMode.value === 'replace') {
      existing = previewData.value
    } else {
      // Merge: 去重
      const existWords = new Set(existing.map(w => w.word.toLowerCase()))
      for (const w of previewData.value) {
        if (!existWords.has(w.word.toLowerCase())) {
          existing.push(w)
          existWords.add(w.word.toLowerCase())
        }
      }
    }

    localStorage.setItem(storageKey, JSON.stringify(existing))
    importedCount.value = previewData.value.length
    importDone.value = true
  } catch (err) {
    errorMsg.value = `保存失败: ${err.message}`
  } finally {
    importing.value = false
  }
}
</script>
