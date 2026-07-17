# english-vocab — 高中英语词汇学习 PWA

## 项目概述

基于 **FSRS 自适应间隔重复算法**（替换原艾宾浩斯固定间隔）的英语词汇学习工具，支持 6 种学习模式 + 游戏化激励系统（XP/等级/徽章）。前端 Vue 3 单页应用，可选 Flask + MySQL 后端。PWA 离线可用，部署到 GitHub Pages (`/xinyu/`)。

**词库**：高考 3500+、四级 4500+、六级 6000+、雅思 5000+（新东方词根+联想记忆法）

---

## 命令

```bash
npm run dev       # Vite dev server → http://localhost:5173/xinyu/
npm run build     # 生产构建 → dist/（0 错误，59 modules，~1.2s）
npm run preview   # 预览构建产物
npm run test      # 运行 21 个单元测试（Vitest）
npm run test:watch     # 测试监视模式
npm run test:coverage  # 测试 + 覆盖率报告

# Flask 后端（仅 MySQL 模式需要）
pip install flask mysql-connector-python bcrypt pyjwt
python server/run.py   # 启动 API → http://localhost:5001
```

## 技术栈

| 层 | 技术 | 说明 |
|---|------|------|
| 前端框架 | Vue 3.4 + Vite 5.2 | `<script setup>` + Composition API |
| 状态管理 | Pinia 3.0 | `auth.js` store |
| PWA | vite-plugin-pwa 0.19 | workbox generateSW, 14 precache entries |
| SRS 引擎 | fsrs.js 1.2 | 开源 FSRS 算法（State/Review/Learning），自适应间隔 |
| 游戏化 | 自研 composable | XP/50等级/11徽章/每日统计，localStorage 持久化 |
| 测试 | Vitest 4.1 + @vue/test-utils | 21 tests, jsdom 环境 |
| 后端（可选） | Flask + MySQL 8.0 | mysql-connector-python, bcrypt, PyJWT |
| 外部API | Web Speech, Web Audio, Pexels, Notification | 全部浏览器原生 API |
| 部署 | GitHub Pages | `base: '/xinyu/'`, `vite.config.js` |

**npm 依赖**：运行时 `vue`, `pinia`, `jwt-decode`（2KB）, `fsrs.js`（MIT）。无 UI 库、无图标库、无图表库、无动画库。

---

## 架构：视图路由

**无 vue-router**，App.vue 用 `currentView` ref 控制单页视图切换：

```
currentView 值        → 渲染组件
─────────────────────────────
'dashboard'           → Dashboard.vue（首页仪表盘）
'typing'             → TypingPanel.vue（打字练习）
'flashcard'          → FlashcardPanel.vue（闪卡复习）
'browse'             → WordList + WordCard（单词浏览）
'dictation'          → DictationPanel.vue（听写模式）
'reading'            → ReadingPanel.vue（阅读理解）
'sentenceTyping'     → SentenceTypingPanel.vue（句子听打）
'profile'            → ProfileCenter.vue（个人中心）
'import'             → ImportPanel.vue（导入词库）
```

未登录时整个主界面替换为 `LoginForm.vue`（独立于 currentView）。

## 架构：数据流

```
word.js / cet4.js / cet6.js / ielts.js  词库文件
  ↓ App.vue flatMap → allBookWords[]
  ↓ useStudyPlan.getTodayWords()  按 FSRS + dailyQuota 筛选今日待学单词
  ↓ todayPlan (computed, 单一数据源)
  ↓ 各学习模块 composable 消费
  ↓ onWordLearned(bookId, wordId, rating)  统一学习回调
      ├─ studyPlan.markWord()  → FSRS.repeat() → 下次复习日期
      └─ gamify.recordAction() → XP + 徽章检查 → Dashboard 展示
  ↓ useProgress  管理掌握状态 → localStorage
  ↓ useWrongWords 跨模块收集错词 → localStorage
```

**关键设计**：
- `todayPlan` 是单一数据源（computed），删除了冗余的 `todayWordsSnapshot` ref
- `onWordLearned(bookId, wordId, rating)` 统一驱动 SRS + 游戏化，rating 1-4 对应 FSRS 评级
- 闪卡模式 4 按钮（忘记了/困难/良好/简单）通过 rating 参数直接影响 FSRS 自适应调度
- 打字模式完成时自动调用 `markWord(wordId, 3)`（良好）
- 各 composable 内部做排序副本，不修改源数组

---

## 全部 17 个组件

| 组件 | 文件 | 行数 | 职责 |
|------|------|------|------|
| **App.vue** | `src/App.vue` | ~660 | 根组件：视图路由、全局状态、键盘监听、onboarding、游戏化/FSRS 统一回调 |
| **Dashboard** | `src/components/Dashboard.vue` | ~320 | 首页：Hero区、统计条、游戏化卡片（等级/XP/徽章）、进度环、热力图、学习报告Canvas图、错题入口、模块卡片 |
| **TopBar** | `src/components/TopBar.vue` | ~60 | 顶栏：Logo、搜索框、用户头像、暗色切换 |
| **LoginForm** | `src/components/LoginForm.vue` | ~160 | 登录/注册：双Tab表单、local/MySQL模式提示 |
| **ProfileCenter** | `src/components/ProfileCenter.vue` | ~340 | 个人中心：头像编辑（Emoji/上传）、用户名编辑、学习概览、通知开关、数据导出（CSV/JSON）、退出登录 |
| **TypingPanel** | `src/components/TypingPanel.vue` | ~120 | 打字练习：逐字母展示、释义揭示、实时统计(WPM/正确率/用时)、难度排序 |
| **FlashcardPanel** | `src/components/FlashcardPanel.vue` | ~140 | 闪卡复习：卡片翻转动画、触摸滑动、认识/不认识按钮、难度排序、完成统计 |
| **SentenceTypingPanel** | `src/components/SentenceTypingPanel.vue` | ~260 | 句子听打：逐词input填空、中文翻译提示、语速滑块、Tab导航、错题复习模式 |
| **DictationPanel** | `src/components/DictationPanel.vue` | ~70 | 听写：播放按钮、answer input、提示显示、正确/错误反馈 |
| **ReadingPanel** | `src/components/ReadingPanel.vue` | ~240 | 阅读理解：文章折叠、选择题/判断题、答案解析、分数结果 |
| **WordList** | `src/components/WordList.vue` | ~35 | 单词网格容器：空状态 → WordCard 列表 |
| **WordCard** | `src/components/WordCard.vue` | ~65 | 单词卡片：图片区、单词/音标/释义/例句、掌握标记、英美发音按钮 |
| **HelpModal** | `src/components/HelpModal.vue` | ~90 | 快捷键面板：`?` 键唤起，Teleport弹窗，分组显示所有模块快捷键 |
| **MobileTabBar** | `src/components/MobileTabBar.vue` | ~40 | 移动端底部导航：5个Tab（首页/打字/闪卡/浏览/我的），仅 ≤768px 显示 |
| **OnboardingOverlay** | `src/components/OnboardingOverlay.vue` | ~120 | 首次引导：3步（欢迎→选词库→开始），localStorage标记已完成 |
| **ImportPanel** | `src/components/ImportPanel.vue` | ~200 | 导入词库：拖拽上传CSV/JSON、智能列映射、10行预览表格、合并/替换模式 |

## 全部 15 个 Composables

| Composable | 文件 | 函数签名 | 职责 |
|------------|------|----------|------|
| **useStudyPlan** | `src/composables/useStudyPlan.js` | `(userIdRef) → {...}` | **FSRS 自适应调度**：`getTodayWords()`按quota拆新词/复习，`markWord(id, rating)` 1-4级，旧格式自动迁移 |
| **useTyping** | `src/composables/useTyping.js` | `(words, speech, onWrongWord?, markWordFn?) → {...}` | 打字练习状态机：逐字母校验→输错清空→完成调用 `markWordFn(id,3)`，WPM/正确率/用时统计 |
| **useFlashcard** | `src/composables/useFlashcard.js` | `(words, markWordFn, onWrongWord?) → {...}` | 闪卡状态机：4按钮（忘了/困难/良好/简单）→ `markWordFn(id,1-4)`，键盘1-4，触摸滑动，不认识放回队尾 |
| **useSentenceTyping** | `src/composables/useSentenceTyping.js` | `(speech, markWordFn?) → {...}` | 句子听打状态机：逐词input+下划线、Tab/Shift+Tab导航、全对自动下一句→ `markWordFn(id)` |
| **useDictation** | `src/composables/useDictation.js` | `(speech, onWrongWord?) → {...}` | 听写状态机：随机排序→播放→用户输入→提交判定→正确/错误反馈 |
| **useReading** | `src/composables/useReading.js` | `() → {...}` | 阅读理解状态机：文章→逐题作答(choice/tf)→提交判定→解析→分数 |
| **useSpeech** | `src/composables/useSpeech.js` | `() → {speak, playWord, stopAll, playAll}` | Web Speech API封装：cancel+speak防竞态(setTimeout 80ms)、连续播放、语音列表预加载 |
| **useProgress** | `src/composables/useProgress.js` | `(bookId, words, userIdRef) → {masteredMap, toggleMaster}` | 单词掌握状态：v2格式(JSON blob)，旧格式自动迁移 |
| **useWrongWords** | `src/composables/useWrongWords.js` | `(userIdRef) → {...}` | 错题本：跨模块收集(recordWrong/removeWrong/getWrongList)，按错误次数降序 |
| **useImages** | `src/composables/useImages.js` | `() → {imageCache, getImage}` | Pexels图片搜索：localStorage缓存(≤500条)，加载中防重复请求 |
| **useDarkMode** | `src/composables/useDarkMode.js` | `() → {dark}` | 深色模式：localStorage持久化 |
| **useLearningReport** | `src/composables/useLearningReport.js` | `(studyPlan, activeBook, allBookWords) → {...}` | 学习报告：周报/月报统计(总词数/活跃天数/日均)，预计完成天数 |
| **useNotification** | `src/composables/useNotification.js` | `() → {...}` | PWA通知：权限请求、每日20:00提醒(setInterval轮询)、开关管理 |
| **confetti** | `src/composables/confetti.js` | `launchConfetti(opts?)` | Canvas纸屑动画：零依赖，80-200彩色粒子，重力+旋转物理，自动清理 |
| **useGamification** | `src/composables/useGamification.js` | `(userIdRef) → {...}` | 游戏化系统：XP/50等级/11徽章、`recordAction({type, accuracy})`、`syncStudyData()`、每日XP历史 |

**新增工具模块**：

| 模块 | 文件 | 职责 |
|------|------|------|
| **audio** | `src/utils/audio.js` | 共享 AudioContext 单例：`playBeep('correct'/'error')`，消除多 composable 重复创建 |

## Pinia Store

`src/stores/auth.js` — `useAuthStore`：

- **双模式认证**：启动时 `init()` 立即用local模式渲染UI（0等待），后台异步探测 `localhost:5001/api/health`（3s超时），有token才尝试切换MySQL模式
- **local模式**：Web Crypto SHA-256 + salt(username)，多用户存 `ev_users`
- **MySQL模式**：Flask + JWT (HS256, 7天过期)，token存 `localStorage.ev_local_token`
- **方法**：`register()`, `login()`, `logout()`, `updateProfile()`
- **状态**：`mode`, `user`, `token`, `error`, `authReady`, `isLoggedIn`, `userId`

## API 层（仅 MySQL 模式）

`src/api/client.js`：`request()`, `get()`, `post()`, `put()` — 自动注入 `Authorization: Bearer <token>`，统一错误处理

`src/api/auth.js` — `authAPI`：`register()`, `login()`, `getProfile()`, `updateProfile()`

`src/api/study.js` — `studyAPI`：`getPlan()`, `syncPlan()`, `getProgress()`, `syncProgress()`

## Flask 后端

```
server/
  run.py              → 入口，读 .env 密码
  __init__.py         → create_app() 工厂：CORS + 蓝图 + /api/health + 建表
  config.py           → DB_CONFIG, JWT_SECRET, CORS_ORIGINS
  db.py               → MySQLConnectionPool(pool_size=5) + query()/execute()/insert_one()
  respond.py          → ok()/fail()/created() 统一JSON响应
  middleware.py        → @require_auth 装饰器（JWT Bearer token验证）
  routes_auth.py      → /api/auth/register, login, profile (GET/PUT)
  routes_study.py     → /api/study/plan (GET/PUT), progress (GET/PUT)
```

**3 张表**：`vocab_users`, `vocab_study_plan` (ON DUPLICATE KEY UPDATE), `vocab_settings`

**密码从 `.env` 文件 `MYSQL_PWD=xxx` 读取**，不回退到环境变量。

## 词库数据结构

```js
// word.js / cet4.js / cet6.js / ielts.js 统一格式
export default [
  {
    id: 1,              // unit ID
    name: "Word List 1",
    words: [
      { id: 1, word: "firm", phonetic: "[fɜːm]", definition: "...",
        sentence: "He works for a law firm.", sentence_cn: "他在一家律师事务所工作。" }
    ]
  }
]
```

`readings.js`：阅读理解文章数组，每篇关联 unitId，含 passage 文本 + questions（choice/tf 类型）+ explanation。

## localStorage Key 约定（用户隔离）

| Key | 格式 | 说明 |
|-----|------|------|
| `ev_users` | `{ users: [...], activeUserId }` | local模式多用户 |
| `ev_local_token` | `"xxx"` | MySQL模式JWT |
| `ev_study_plan_{userId}` | `{ bookId: { words: { id: { firstLearned, lastReviewed, reviewCount, nextReview, **fsrs_due, fsrs_stability, fsrs_difficulty, fsrs_reps, fsrs_lapses, fsrs_state, fsrs_last_review** } }, dailyQuota, streak, studyDays[] } }` | FSRS 学习计划（每个词含完整 Card 状态） |
| `ev_gamification_{userId}` | `{ xp, totalLearned, totalReviews, highestStreak, bestAccuracy, bestDailyWords, earnedBadges[], dailyXPHistory{} }` | 游戏化数据 |
| `ev_mastered_v2_{userId}_{bookId}` | `{ wordId: true/false }` | JSON blob 掌握状态 |
| `ev_wrong_words_{userId}` | `{ bookId: { wordId: { word, wrongCount, ... } } }` | 错题本 |
| `ev_image_cache` | `{ word: url }` | Pexels图片缓存(≤500条) |
| `ev_active_book` | `'gaokao'` | 当前选中词库 |
| `darkMode` | `'true'` | 深色模式 |
| `ev_confetti_date` | `'2026-06-25'` | 每日庆祝去重 |
| `ev_onboarding_done` | `'1'` | 新手引导已完成 |
| `ev_notify` | `{ scheduled: true/false }` | 通知提醒开关 |
| `ev_imported_words` | `[{word, phonetic, ...}]` | 导入的自定义词库 |
| `ev_report_cache` | 预留前缀 | 学习报告缓存 |

## 键盘快捷键汇总

| 场景 | 按键 | 功能 |
|------|------|------|
| **全局** | `?` | 打开/关闭快捷键面板 |
| **全局** | `Esc` | 关闭面板 / 返回首页 |
| **全局** | `Ctrl+K` | 跳转浏览模式 |
| **闪卡** | `Space` | 翻转卡片 |
| **闪卡** | `1` | 标记"忘记了"（Again） |
| **闪卡** | `2` | 标记"困难"（Hard） |
| **闪卡** | `3` | 标记"良好"（Good） |
| **闪卡** | `4` | 标记"简单"（Easy） |
| **闪卡** | 触摸左滑 | 忘记 |
| **闪卡** | 触摸右滑 | 良好 |
| **打字** | `A-Z` | 输入字母 |
| **打字** | `Backspace` | 删除上一字符 |
| **句子听打** | `Tab` / `Shift+Tab` | 下一词 / 上一词 |
| **句子听打** | `Enter` | 提交 / 跳词 |
| **句子听打** | `Esc` | 跳过当前句 |
| **句子听打** | `Backspace`（空词时） | 回上一词 |
| **听写** | `Enter` | 提交答案 |

## FSRS 自适应调度算法

**依赖**：`fsrs.js` v1.2.2（MIT，0 额外依赖，纯 JS）

**核心类**：
- `Card` — 卡片状态：`{ due, stability, difficulty, reps, lapses, state, last_review }`
- `FSRS` — 调度器：`repeat(card, now)` 返回 `{ 1: {card,...}, 2: {card,...}, 3: {card,...}, 4: {card,...} }`
- `state` 状态机：0=New → 1=Learning → 2=Review（或 3=Relearning 当 lapse）

**Rating → FSRS 评级映射**：

| Rating | 按钮 | 含义 | FSRS 效果 |
|--------|------|------|-----------|
| 1 | 忘记了 | Again | 卡片进入 Relearning，stability ↓，difficulty ↑ |
| 2 | 困难 | Hard | 正常复习但稳定性增长较少 |
| 3 | 良好 | Good（默认） | 标准稳定性增长 |
| 4 | 简单 | Easy | 快速推进，stability 大增 |

**与旧艾宾浩斯对比**：

| 特性 | 旧（艾宾浩斯） | 新（FSRS） |
|------|--------------|-----------|
| 间隔 | 固定 `[1,2,4,7,15,30]` | 自适应 4 参数模型 |
| 评分 | 认识/不认识 2 级 | 4 级（Again/Hard/Good/Easy） |
| 个性化 | 无（所有词同等对待） | 每个词独立状态（stability + difficulty） |
| 数据需求 | 无 | 从旧格式自动迁移（`fsrs_due` 字段检测） |

**数据迁移**：
- 旧记录检测：`record.fsrs_due != null` → 从 FSRS 状态重建 Card
- 旧记录无 FSRS 字段 → 创建全新 Card，FSRS 渐进适配
- `nextReview` 保持 YYYY-MM-DD 字符串（从 `fsrs_due` 提取），`getTodayWords()` 比较逻辑不变

**方法签名变化**：
- `markWord(bookId, wordId, rating = 3)` — rating 默认 Good
- `markWordFailed(bookId, wordId)` → 等价 `markWord(bookId, wordId, 1)` (Again)

**局限性**：
- FSRS 参数使用默认值（未针对词汇学习场景微调 `w` 参数）
- `cardFromRecord()` 对旧格式仅创建全新 Card，首次 FSRS 调度可能略偏保守
- 未来可接入 FSRS 参数优化 API 根据用户历史数据计算最优 `w` 值

## 技术决策

| 决策 | 原因 |
|------|------|
| 不用 vue-router | 7 个视图单页切换够用，省依赖 |
| 不用 Cropper.js | 头像裁剪用 Canvas 手写（居中裁剪），省 40KB |
| 不用 Chart.js/ECharts | 热力图用纯 CSS grid，趋势图用 Canvas 手写 ~80 行 |
| 不用 Tailwind | CSS 变量体系覆盖所有需求，设计 tokens 完整 |
| 不用图标库 | Emoji 替代，零额外请求 |
| 不用完整 JWT 库 | 前端仅 `jwt-decode`（2KB），JWT 只在后端验证 |
| 密码安全 | local模式 Web Crypto SHA-256 + salt；MySQL 模式 bcrypt |
| Speech cancel+speak 竞态 | `setTimeout(fn, 80)` 替代 `requestAnimationFrame`，确保 cancel 完成后再 speak |
| 词表不修改父数组 | composable 内部 `_sortedWords = [...input]` 浅拷贝后排序 |

## 响应式断点

| 断点 | 变化 |
|------|------|
| ≤768px | 模块卡片 single column、Hero 竖排、闪卡高度缩小、底部 TabBar 显示、统计2列、顶栏用户名隐藏 |
| ≤480px | 字体缩小、间距收紧、导出按钮竖排、Canvas 图表 min-width 400px、Emoji 网格4列 |

## 构建产物

```
dist/
  index.html                  0.81 KB (gzip: 0.47 KB)
  manifest.webmanifest         0.29 KB
  registerSW.js                0.15 KB
  sw.js                        (PWA service worker)
  workbox-ebea30cf.js          (PWA runtime)
  assets/index.css            53.34 KB (gzip: 9.33 KB)  ← 含游戏化样式
  assets/index.js            187.72 KB (gzip: 68.57 KB) ← 主bundle（含 fsrs.js ~10KB）
  assets/word.js              25.09 KB (dynamic import: 高考词库)
  assets/readings.js          21.27 KB (dynamic import: 阅读文章)
  assets/cet4.js             431.23 KB (lazy load)
  assets/cet6.js             399.17 KB (lazy load)
  assets/ielts.js            596.94 KB (lazy load)
```

14 PWA precache entries，总计 2144 KB。

## 已知限制

1. **词库 chunk 超过 500KB**（IELTS 597KB）— Vite 警告，可考虑进一步代码拆分但不影响功能
2. **Flask 后端无迁移脚本** — 数据库表由 `ensure_tables()` 幂等创建，字段变更需手动 ALTER
3. **Pexels API 200次/小时** — 已加 8s AbortSignal 超时（useImages.js:66），未配置 key 时静默跳过
4. **每日提醒用 setInterval 轮询** — 非原生 scheduled notification，浏览器关闭后不触发
5. **FSRS 参数未优化** — 使用默认 `w` 参数，未针对词汇学习场景微调
6. **全词库搜索** — TopBar 搜索框仅搜当前词库，无法跨高考/四级/六级/雅思搜索
7. **UI 视觉翻新未执行** — 方案已完成（参考 DuoCards + english-read），Phase 2-P3 尚未实施
8. **导入词库与 studyPlan 打通** — `ev_imported_words` 存在但 getTodayWords 不消费，待实现

## 变更历史

### 2026-07-16 — 全维度审查 + 50+ 项修复

**审查执行**：3 组 reviewer agent 按 6 维度审查，输出 57 项发现（22 必须修复 + 20 建议修改 + 15 仅供参考）

**P0 致命修复（9项）**：

| 修复 | 文件 | 说明 |
|------|------|------|
| syncStudyData 不保存 | `useGamification.js:88` | 改后加 `save()` |
| 全项目无 beforeunload | `App.vue:695` | 加 beforeunload → 刷新 gamify.syncStudyData |
| Dashboard 进度读数源错误 | `App.vue:427` | todayDoneCount 从 masteredMap 改为读 studyPlan 当日 lastReviewed |
| 错词复习回调残缺 | `App.vue:589` | startWithWords 回调补上 onWordLearned + gamify |
| _customMarkFn 泄漏 | `useFlashcard.js:78` | startWithWords 开头清 `_customMarkFn = null` |
| 闪卡双击错标卡片 | `useFlashcard.js:109-153` | markKnown/Hard/Easy/Unknown 加 `!isFlipped.value` 守卫 |
| wrongWords 缺 userId watcher | `useWrongWords.js:36` | 加 `watch(userIdRef, load)` |
| 模块切换不走 exitAllModules | `App.vue:569` | 加 watcher on currentView → exitAllModules |
| sentenceTyping 错题 double-count | `useViewRouter.js:22` | 移除 exitAllModules 中的重复收集 |

**P1 高危修复（4项）**：

| 修复 | 文件 | 说明 |
|------|------|------|
| Reading 未接入学习管线 | `useReading.js` + `App.vue` | 加 onComplete 回调 → XP 奖励（按正确率，满分 50 XP） |
| ImportPanel 无词数上限 | `ImportPanel.vue:199` | 加 5000 词上限 + 超限提示 |
| HelpModal 快捷键过时 | `HelpModal.vue:22-27` | 闪卡更新为 4 级评分，新加 🧠 AI 术语 A/B/C/D 快捷键 |
| FSRS last_review fallback 错 | `useStudyPlan.js:41` | `fsrs_due` → `new Date().toISOString()` |

**P2 视觉修复（5类）**：

| 修复 | 文件 | 说明 |
|------|------|------|
| AI 模块硬编码色值 | `AiGlossaryPanel.vue` | `#16a34a`/`#dc2626`/`#d97706` → `var(--success/destructive/warning)` |
| AI 模块硬编码圆角 | `AiGlossaryPanel.vue` | `10px/14px` → `var(--radius-lg/xl)` |
| 输入框 focus ring 统一 | `AiGlossaryPanel.vue` | 加 `box-shadow: 0 0 0 3px var(--primary-subtle)` |
| 暗色变量补齐 | `style.css:46-67` | 补 `warning/destructive/success-foreground`，shadow opacity 调低 |
| Canvas fallback 浅色 | `Dashboard.vue:235` | `#f1f5f9` → `var(--card)` |

**P3-P4 优化（11项）**：Dictation 双击防护、Pexels 8s 超时、bookProgress 过滤遗忘词、studyDays 365 上限、语义色 token（`--accent-violet/orange`）、过渡 token（`--transition-fast/normal`）、Dashboard 完成/空引导横幅、AI 卡片阴影、typingOptions 动态词数、AI typing 输入卡间距 6→10px、typingOptions 硬编码 → computed

**桌面应用修复**：

| 修复 | 文件 | 说明 |
|------|------|------|
| 端口残留 | `desktop_app.py:119` | `_kill_port` 加 `/T` 杀进程树 |
| 退出不干净 | `desktop_app.py:156` | `shutdown()` 改用 `taskkill /F /T` + 事后扫端口 |
| 启动前预清理 | `desktop_app.py:309` | `main()` 入口 `_kill_port(FLASK_PORT)` |

**已知新问题**：
- `exitAllModules` 放在 `enterModule` 中会卡住 Vue Transition，改为 watcher on currentView
- 桌面应用导航在 puppeteer 测试中过渡动画偶发卡死（`view-slide-leave-active` 不消失）
- `AiGlossaryPanel.vue` 的 typingOptions 从 const 改为 computed 后需注意模板中 `.value` 自动解包

**构建**：66 modules，210 KB main bundle，PWA 16 entries 2240 KB，21 tests 全通

### 2026-06-26 — FSRS + 游戏化系统集成

**FSRS 集成**：
- `useStudyPlan.js` — 硬编码艾宾浩斯 `[1,2,4,7,15,30]` 替换为 `fsrs.js` 自适应调度
- `markWord(bookId, wordId, rating = 3)` — rating 1-4 映射到 FSRS Again/Hard/Good/Easy
- `markWordFailed()` → `markWord(id, 1)` 委托
- 每个词记录存储完整 FSRS Card 状态（`fsrs_due`, `fsrs_stability`, `fsrs_difficulty`, `fsrs_reps`, `fsrs_lapses`, `fsrs_state`, `fsrs_last_review`）
- 旧格式自动迁移（无 `fsrs_due` 字段 → 创建新 Card）

**游戏化系统集成**：
- `useGamification.js` — 180 行全新 composable：XP/50级/11徽章/每日历史
- `App.vue` — `onWordLearned(bookId, wordId, rating)` 统一回调驱动 SRS + 游戏化
- `Dashboard.vue` — 游戏化卡片：等级徽章 + XP 进度条 + 今日 XP + 解锁徽章图标
- `useGamification` 添加 userId 变化时重载数据 watcher
- 修复 `xpToNext` / `levelProgress` 计算错误（threshold 索引差 1）

**4 级评分全面化**：
- `useFlashcard.js` — `markUnknown()` 调用 `markWordFn(id, 1)`
- `useFlashcard.js` — 键盘快捷键更新：1=忘了/2=困难/3=良好/4=简单
- `useTyping.js` — 新增 `markWordFn` 参数，完成单词时调用 `markWordFn(id, 3)`
- `FlashcardPanel.vue` — 快捷键提示和滑动标签更新

**Bug 修复**：
- `App.vue` — 修复 `studyStats` TDZ 引用错误（`watch(studyStats)` 在 `const studyStats` 之前调用）
- `useGamification.js` — userId 切换时不重载数据的 bug（添加 watcher）
- `App.vue` — 修复编辑过程中引入的重复 `studyStats`、`todayStats` 定义和丢失的 `filteredWords`

**构建**：59 modules（+2），187.72 KB main bundle（+11 KB，含 fsrs.js），PWA 14 entries 2144 KB

### 2026-06-25 — Phase 1-3 全面实施

**Phase 1（6项）**：错题本、难度排序、模块进度条、页面过渡动画、闪卡手势滑动、每日目标+纸屑庆祝

**Phase 2（6项）**：
- CSV/JSON 导入（ImportPanel.vue）
- 学习报告+Canvas趋势图（useLearningReport.js + Dashboard.vue）
- 快捷键面板`?`（HelpModal.vue）
- 首次引导（OnboardingOverlay.vue）
- 移动端底部TabBar（MobileTabBar.vue）
- 浏览器通知（useNotification.js + ProfileCenter.vue）

**Phase 3（1项）**：数据导出CSV/JSON（ProfileCenter.vue）

**Bug 修复**：
- 语音 cancel/speak 竞态 → `setTimeout(fn, 80)`
- 打字模式修改父数组 → 内部 `_sortedWords` 副本
- `index.html` 双路径前缀 → 改用相对路径
- MobileTabBar v-model 冲突 → `:model-value` + `@update:model-value`
- 重复 manifest 链接 → 移除 index.html 中的手动声明
