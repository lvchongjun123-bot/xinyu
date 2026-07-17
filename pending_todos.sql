-- 语海求索 english-vocab 待办事项
-- 2026-07-16 生成，已导入 #23-30
-- MySQL 表结构：todos(id, title, notes, status, priority, completed, due_date, ...)

-- 导入词库与 studyPlan 打通
INSERT INTO todos (title, notes, status, priority, created_at, updated_at)
VALUES ('语海求索 — 导入词库与 studyPlan 打通',
        'ev_imported_words 已写入但 getTodayWords() 不消费此 key。修复：getTodayWords 中新增对 ev_imported_words 的读取，将导入词库作为独立 bookId=imported 参与学习调度。同时 enterModule 中自动切换 activeBook 为 imported。',
        'draft', 7, NOW(), NOW());

-- 桌面应用过渡动画卡死
INSERT INTO todos (title, notes, status, priority, created_at, updated_at)
VALUES ('语海求索 — 桌面应用视图过渡卡死诊断',
        'view-slide-leave-active 偶发不消失，导航卡在 leaving 状态。大概率与 Transition mode="out-in" + exitAllModules 的交互时序有关。已临时移除 mode="out-in"，exitAllModules 改为 watcher 驱动。需在桌面端实测确认修复生效。',
        'draft', 7, NOW(), NOW());

-- UI 视觉翻新
INSERT INTO todos (title, notes, status, priority, created_at, updated_at)
VALUES ('语海求索 — UI 视觉翻新（现代极简风格）',
        '执行已规划方案：参考 DuoCards（卡片交互）+ english-read（仪表盘布局）混合风格。6 Phase：设计 Token 重构 → 全局组件样式 → 布局升级 → Dashboard 重设计 → AI 模块重设计 → 学习模块统一。方案文件：C:\\Users\\Dell\\.claude\\plans\\radiant-doodling-cascade.md',
        'draft', 5, NOW(), NOW());

-- 全词库搜索
INSERT INTO todos (title, notes, status, priority, created_at, updated_at)
VALUES ('语海求索 — 全词库搜索功能',
        '当前 TopBar 搜索框仅搜当前词库（gaokao/CET4/CET6/IELTS 之一）。需求：跨所有词库搜索，在搜索结果中标注来源词库，点击可跳转到该单词的浏览视图。',
        'draft', 4, NOW(), NOW());

-- Reading 键盘快捷键
INSERT INTO todos (title, notes, status, priority, created_at, updated_at)
VALUES ('语海求索 — Reading 面板键盘快捷键',
        'ReadingPanel.vue 无键盘操作。需求：选择题 A/B/C/D 选选项，判断题 T/F，Enter 提交，ArrowLeft/ArrowRight 翻题。参考 AiGlossaryPanel 的 onQuizKeydown 实现。',
        'draft', 3, NOW(), NOW());

-- 退出确认
INSERT INTO todos (title, notes, status, priority, created_at, updated_at)
VALUES ('语海求索 — 退出学习模块确认提示',
        '当前 goHome() 无条件退出，丢进度。需求：闪卡/打字/听写活跃时，返回按钮点击后弹确认对话框"当前进度将丢失，确定返回？"，确认后才退出。',
        'draft', 3, NOW(), NOW());

-- localStorage 写满检测
INSERT INTO todos (title, notes, status, priority, created_at, updated_at)
VALUES ('语海求索 — localStorage 写满检测与用户提示',
        '所有 composable 的 save() 失败时只 console.error，不通知用户。修复：save() 失败时设全局 flag，Dashboard 加载时检查并 Toast 提醒。',
        'draft', 2, NOW(), NOW());

-- 100% 完成庆祝
INSERT INTO todos (title, notes, status, priority, created_at, updated_at)
VALUES ('语海求索 — 词库 100% 完成庆祝',
        '当 stats.percent >= 100 时 Dashboard 已有完成横幅（dash-done-banner），但缺少引导切换词库的 CTA 按钮。补齐：加"切换词库 →"按钮。',
        'draft', 2, NOW(), NOW());
