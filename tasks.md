# 任务清单: NovelMaker Web 应用

## 任务总览

| ID | 任务 | 优先级 | 复杂度 | 依赖 | 并行组 |
|----|------|--------|--------|------|--------|
| T-001 | 项目初始化与基础设施搭建 | P0 | medium | - | 1 |
| T-002 | 数据库 Schema 设计与 Prisma 配置 | P0 | medium | T-001 | 2 |
| T-003 | tRPC 基础设施搭建 | P0 | medium | T-001 | 2 |
| T-004 | 基础 UI 布局与主题配置 | P0 | medium | T-001 | 2 |
| T-005 | 小说项目管理 - 后端 Service + Router | P0 | medium | T-002, T-003 | 3 |
| T-006 | 小说项目管理 - 前端页面 | P1 | medium | T-004, T-005 | 4 |
| T-007 | 卷和章节管理 - 后端 Service + Router | P0 | medium | T-005 | 4 |
| T-008 | 全书基因与创作设置 - 后端 | P1 | medium | T-005 | 4 |
| T-009 | 章节编辑器 - Tiptap 集成与基础编辑 | P0 | complex | T-004, T-007 | 5 |
| T-010 | 分层记忆系统 - Memory Service | P0 | complex | T-002, T-008 | 5 |
| T-011 | AI Service - LLM 集成与流式生成 | P0 | complex | T-003, T-010 | 6 |
| T-012 | 编辑器 AI 工具栏 - 续写/改写/扩写 | P1 | complex | T-009, T-011 | 7 |
| T-013 | 六阶段创作流程 - Workflow Service | P1 | complex | T-008, T-011 | 7 |
| T-014 | 六阶段创作流程 - 前端引导界面 | P1 | medium | T-006, T-013 | 8 |
| T-015 | 人物管理系统 | P1 | medium | T-005 | 5 |
| T-016 | 世界观管理系统 | P1 | medium | T-005 | 5 |
| T-017 | 伏笔管理系统 | P1 | medium | T-005, T-007 | 5 |
| T-018 | Python 质检脚本改造 (JSON 输出) | P1 | medium | - | 2 |
| T-019 | Quality Service - Web 桥接层 | P1 | medium | T-003, T-018 | 6 |
| T-020 | 质量报告前端展示 | P1 | simple | T-006, T-019 | 7 |
| T-021 | 记忆上下文面板 (编辑器侧边栏) | P1 | medium | T-009, T-010 | 7 |
| T-022 | 人物/世界观/伏笔前端管理页面 | P1 | medium | T-006, T-015, T-016, T-017 | 7 |
| T-023 | 小说导出功能 | P2 | simple | T-005, T-007 | 8 |
| T-024 | 编辑器高级扩展 (伏笔标记/人物引用) | P2 | medium | T-012, T-015, T-017 | 8 |
| T-025 | 全局配置与 LLM 模型管理页面 | P2 | simple | T-006, T-011 | 8 |
| T-026 | E2E 测试与集成测试 | P2 | medium | T-012, T-014 | 9 |

---

## 任务详情

---

## T-001: 项目初始化与基础设施搭建 [P0] [medium]

- **priority**: P0
- **complexity**: medium (5)
- **review_strategy**: self
- **parallel_group**: 1
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 15
- **dependencies**: 无

### 描述

从零初始化 Next.js 14 项目，配置 TypeScript、Tailwind CSS、shadcn/ui、pnpm，建立项目目录骨架。

### 验收标准

- [ ] Next.js 14 (App Router) 项目可正常启动 (`pnpm dev`)
- [ ] TypeScript 严格模式配置正确
- [ ] Tailwind CSS + shadcn/ui 安装并可使用基础组件
- [ ] ESLint + Prettier 配置完成
- [ ] 项目目录结构按 design.md 创建（src/app, src/server, src/components, src/lib, src/stores, src/types）
- [ ] `.env.example` 包含所有必要环境变量模板
- [ ] `pnpm build` 无报错

### 涉及文件

- package.json
- tsconfig.json
- tailwind.config.ts
- next.config.mjs
- .env.example
- .eslintrc.json
- .prettierrc
- src/app/layout.tsx
- src/app/page.tsx
- src/types/index.ts
- components.json (shadcn/ui)

---

## T-002: 数据库 Schema 设计与 Prisma 配置 [P0] [medium]

- **priority**: P0
- **complexity**: medium (5)
- **review_strategy**: combined
- **parallel_group**: 2
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 5
- **dependencies**: T-001

### 描述

安装 Prisma，创建完整的 SQLite 数据库 Schema（包含所有 model），运行初始迁移，创建 Prisma Client 单例。

### 验收标准

- [ ] Prisma 安装并配置 SQLite provider
- [ ] schema.prisma 包含所有 11 个 model（Novel, NovelSettings, Gene, Volume, Arc, Chapter, Character, CharacterRelation, WorldviewEntry, Foreshadow, ForeshadowLink, WorkflowState）
- [ ] 所有关系和索引定义正确
- [ ] `npx prisma migrate dev` 成功执行
- [ ] `src/server/db.ts` 导出 Prisma Client 单例
- [ ] `npx prisma studio` 可正常打开

### 涉及文件

- prisma/schema.prisma
- src/server/db.ts
- .env (DATABASE_URL)
- package.json (prisma 依赖)

---

## T-003: tRPC 基础设施搭建 [P0] [medium]

- **priority**: P0
- **complexity**: medium (4)
- **review_strategy**: self
- **parallel_group**: 2
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 8
- **dependencies**: T-001

### 描述

搭建 tRPC v11 基础设施，包括服务端初始化、API Route Handler、客户端 Provider、Root Router。

### 验收标准

- [ ] tRPC v11 + @trpc/next 安装配置
- [ ] `src/server/trpc.ts` 导出 router, procedure, middleware
- [ ] `src/server/routers/_app.ts` 导出 appRouter
- [ ] `src/app/api/trpc/[trpc]/route.ts` API 路由处理
- [ ] 前端 tRPC Provider 配置（src/lib/trpc.ts + Provider 组件）
- [ ] 创建一个 health check procedure 验证端到端连通性
- [ ] Zod 作为 input 验证器可使用

### 涉及文件

- src/server/trpc.ts
- src/server/routers/_app.ts
- src/app/api/trpc/[trpc]/route.ts
- src/lib/trpc.ts
- src/components/providers.tsx
- src/app/layout.tsx (更新)
- package.json (tRPC 依赖)

---

## T-004: 基础 UI 布局与主题配置 [P0] [medium]

- **priority**: P0
- **complexity**: medium (4)
- **review_strategy**: self
- **parallel_group**: 2
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 10
- **dependencies**: T-001

### 描述

创建应用的基础布局框架，包括侧边栏导航、顶部栏、主内容区域。配置深色/浅色主题。安装并配置必要的 shadcn/ui 基础组件。

### 验收标准

- [ ] 全局布局包含响应式侧边栏 + 主内容区
- [ ] 侧边栏包含导航菜单（首页、小说列表、设置）
- [ ] 顶部栏包含面包屑、主题切换
- [ ] shadcn/ui 基础组件安装（Button, Card, Dialog, Input, Select, Table, Tabs, Toast, Form, Sheet）
- [ ] 深色/浅色主题切换功能正常
- [ ] 布局在移动端可响应式折叠侧边栏
- [ ] Zustand store 基础配置

### 涉及文件

- src/components/layout/sidebar.tsx
- src/components/layout/header.tsx
- src/components/layout/main-layout.tsx
- src/components/ui/ (shadcn 组件)
- src/stores/ui.store.ts
- src/app/layout.tsx (更新)
- src/app/globals.css

---

## T-005: 小说项目管理 - 后端 Service + Router [P0] [medium]

- **priority**: P0
- **complexity**: medium (5)
- **review_strategy**: combined
- **parallel_group**: 3
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 4
- **dependencies**: T-002, T-003

### 描述

实现小说的 CRUD 后端逻辑，包括 Novel Service 和 tRPC Router。包含创建、列表、详情、更新、删除、统计功能。

### 验收标准

- [ ] `src/server/services/novel.service.ts` 实现完整 CRUD
- [ ] `src/server/routers/novel.ts` 所有 procedure 定义（create, list, getById, update, delete, getStats）
- [ ] 所有 input 使用 Zod schema 验证
- [ ] getStats 返回字数统计、章节数、卷数、完成百分比
- [ ] delete 级联删除所有关联数据
- [ ] 单元测试覆盖核心逻辑

### 涉及文件

- src/server/services/novel.service.ts
- src/server/routers/novel.ts
- src/server/routers/_app.ts (更新)
- src/types/index.ts (Novel 相关类型)

---

## T-006: 小说项目管理 - 前端页面 [P1] [medium]

- **priority**: P1
- **complexity**: medium (5)
- **review_strategy**: self
- **parallel_group**: 4
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 8
- **dependencies**: T-004, T-005

### 描述

实现小说管理前端页面，包括小说列表（卡片视图）、创建对话框、小说详情/工作台页面。

### 验收标准

- [ ] `/novels` 小说列表页面，卡片网格展示
- [ ] 创建小说对话框（标题、题材、描述）
- [ ] `/novels/[novelId]` 小说工作台页面
- [ ] 工作台显示：基本信息、创作进度、统计数据、快捷入口
- [ ] 删除小说确认对话框
- [ ] 空状态引导（无小说时）
- [ ] tRPC 客户端调用正常，加载状态处理

### 涉及文件

- src/app/novels/page.tsx
- src/app/novels/[novelId]/page.tsx
- src/app/novels/[novelId]/layout.tsx
- src/components/novel/novel-card.tsx
- src/components/novel/novel-create-dialog.tsx
- src/components/novel/novel-settings.tsx
- src/components/layout/novel-nav.tsx
- src/stores/novel.store.ts

---

## T-007: 卷和章节管理 - 后端 Service + Router [P0] [medium]

- **priority**: P0
- **complexity**: medium (6)
- **review_strategy**: combined
- **parallel_group**: 4
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 6
- **dependencies**: T-005

### 描述

实现卷和章节的完整后端管理，包括 CRUD、排序、状态管理。章节需要支持大纲和正文的分别管理。

### 验收标准

- [ ] Volume Service: create, list, update, delete, reorder
- [ ] Chapter Service: create, list, getById, update, delete, reorder, getSummary
- [ ] tRPC Router: volume 和 chapter 全部 procedure
- [ ] 章节 wordcount 在内容更新时自动计算
- [ ] 章节支持状态流转：outline -> draft -> review -> final
- [ ] 卷内章节排序、全书章节全局编号自动维护
- [ ] 单元测试覆盖排序和状态流转逻辑

### 涉及文件

- src/server/services/volume.service.ts
- src/server/services/chapter.service.ts
- src/server/routers/volume.ts
- src/server/routers/chapter.ts
- src/server/routers/_app.ts (更新)
- src/types/index.ts (Volume, Chapter 相关类型)

---

## T-008: 全书基因与创作设置 - 后端 [P1] [medium]

- **priority**: P1
- **complexity**: medium (4)
- **review_strategy**: self
- **parallel_group**: 4
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 4
- **dependencies**: T-005

### 描述

实现全书基因（L1 记忆）和小说创作设置的后端管理。基因包括核心前提、主题、基调、主线等。设置包括目标字数、LLM 模型选择、记忆 Token 预算等。

### 验收标准

- [ ] Gene Service: create/update/get
- [ ] NovelSettings Service: create/update/get
- [ ] tRPC Router: gene 和 settings 相关 procedure
- [ ] Gene 数据结构支持 design.md 中定义的所有字段
- [ ] Settings 的 conventions 和 terminology 字段支持 JSON 存储
- [ ] 创建小说时自动创建默认 settings

### 涉及文件

- src/server/services/gene.service.ts
- src/server/services/settings.service.ts
- src/server/routers/gene.ts (或合并到 novel.ts)
- src/types/index.ts (Gene, Settings 类型)

---

## T-009: 章节编辑器 - Tiptap 集成与基础编辑 [P0] [complex]

- **priority**: P0
- **complexity**: complex (8)
- **review_strategy**: two-stage
- **parallel_group**: 5
- **execution**: agent
- **model**: opus
- **estimated_files**: 12
- **dependencies**: T-004, T-007

### 描述

集成 Tiptap 富文本编辑器，实现章节编辑页面的核心布局（三栏：大纲侧边栏 + 编辑区 + 信息面板）。支持基础文本编辑、自动保存、字数统计。

### 验收标准

- [ ] Tiptap 编辑器初始化，支持基础文本格式（标题、段落、加粗、斜体、引用）
- [ ] 三栏布局：左侧大纲导航、中间编辑区、右侧信息面板
- [ ] 大纲侧边栏显示当前小说的卷/章节树
- [ ] 编辑器自动保存（debounce 2秒）
- [ ] 实时字数统计
- [ ] 章节状态标识和切换
- [ ] 编辑器页面路由 `/novels/[novelId]/editor/[chapterId]`
- [ ] 编辑器加载时自动获取章节内容
- [ ] Zustand editor store 管理编辑器状态

### 涉及文件

- src/app/novels/[novelId]/editor/[chapterId]/page.tsx
- src/components/editor/novel-editor.tsx
- src/components/editor/outline-sidebar.tsx
- src/components/editor/info-panel.tsx
- src/components/editor/toolbar.tsx
- src/components/editor/extensions/index.ts
- src/stores/editor.store.ts
- src/lib/editor-utils.ts
- package.json (tiptap 依赖)

---

## T-010: 分层记忆系统 - Memory Service [P0] [complex]

- **priority**: P0
- **complexity**: complex (9)
- **review_strategy**: two-stage
- **parallel_group**: 5
- **execution**: agent
- **model**: opus
- **estimated_files**: 8
- **dependencies**: T-002, T-008

### 描述

实现核心的 5 层分层记忆系统，包括各层记忆的 CRUD、上下文组装器、Token 预算管理。这是系统最核心的创新模块。

### 验收标准

- [ ] Memory Service 实现 5 层记忆的读写
- [ ] `assembleContext()` 方法按优先级组装记忆上下文
- [ ] Token 预算管理：根据配置的 memoryBudget 裁剪上下文
- [ ] Token 估算函数实现（基于字符数近似估算，中文约 1 字 = 1.5-2 tokens）
- [ ] L1 全书基因: 读取 Gene 数据，生成压缩摘要
- [ ] L2 卷记忆: 读取当前卷的 volumeMemory 字段
- [ ] L3 弧线记忆: 根据当前章节定位所属弧线，读取 arcMemory
- [ ] L4 章节记忆: 获取前 N 章摘要（N 可配置，默认 3）
- [ ] L5 按需检索: 根据章节大纲中的人物名/地点名，检索相关实体
- [ ] tRPC Router: assembleContext, estimateTokens
- [ ] 单元测试覆盖组装逻辑和 Token 裁剪逻辑

### 涉及文件

- src/server/services/memory.service.ts
- src/server/routers/memory.ts
- src/lib/memory-assembler.ts
- src/lib/token-estimator.ts
- src/types/memory.ts
- src/server/routers/_app.ts (更新)
- tests/services/memory.service.test.ts
- tests/lib/memory-assembler.test.ts

---

## T-011: AI Service - LLM 集成与流式生成 [P0] [complex]

- **priority**: P0
- **complexity**: complex (8)
- **review_strategy**: two-stage
- **parallel_group**: 6
- **execution**: agent
- **model**: opus
- **estimated_files**: 8
- **dependencies**: T-003, T-010

### 描述

使用 Vercel AI SDK 集成 LLM API，实现流式文本生成。包括 Prompt 构建器、多模型支持、章节生成/续写/改写/扩写等功能。

### 验收标准

- [ ] Vercel AI SDK 安装配置，支持 OpenAI / Anthropic provider
- [ ] Prompt 构建器：根据 MemoryContext 组装完整 prompt
- [ ] 流式生成：tRPC 支持 SSE 或使用 Next.js Route Handler 流式返回
- [ ] 章节生成：基于记忆上下文 + 大纲生成完整章节
- [ ] 续写：基于当前文本 + 上下文继续创作
- [ ] 改写：选中文本 + 指令改写
- [ ] 扩写：选中文本详细展开
- [ ] 摘要生成：为已完成章节生成摘要（用于 L4 记忆）
- [ ] 模型配置：支持切换模型、调整 temperature
- [ ] 错误处理：API 超时、限流、余额不足等异常处理
- [ ] `.env` 配置 OPENAI_API_KEY / ANTHROPIC_API_KEY

### 涉及文件

- src/server/services/ai.service.ts
- src/server/routers/ai.ts
- src/app/api/ai/generate/route.ts (流式 API)
- src/app/api/ai/continue/route.ts
- src/app/api/ai/rewrite/route.ts
- src/lib/prompt-builder.ts
- src/types/ai.ts
- .env.example (更新)

---

## T-012: 编辑器 AI 工具栏 - 续写/改写/扩写 [P1] [complex]

- **priority**: P1
- **complexity**: complex (7)
- **review_strategy**: two-stage
- **parallel_group**: 7
- **execution**: agent
- **model**: opus
- **estimated_files**: 8
- **dependencies**: T-009, T-011

### 描述

在 Tiptap 编辑器中集成 AI 工具栏，支持流式插入 AI 生成的内容。包括续写、改写、扩写、全章生成功能。

### 验收标准

- [ ] AI 工具栏 UI：固定在编辑器底部或浮动工具栏
- [ ] 续写按钮：点击后在光标位置流式插入生成内容
- [ ] 改写功能：选中文本后出现改写选项，输入指令后替换
- [ ] 扩写功能：选中文本后出现扩写选项，展开后替换
- [ ] 全章生成：基于章节大纲一次性生成全章内容
- [ ] 流式显示：AI 生成过程中实时显示文字流入效果
- [ ] 生成可中断：用户可随时停止 AI 生成
- [ ] AI 生成的内容标记（AIMark Tiptap 扩展）
- [ ] 生成过程中编辑器显示 loading 状态

### 涉及文件

- src/components/editor/ai-toolbar.tsx
- src/components/editor/ai-rewrite-dialog.tsx
- src/components/editor/extensions/ai-mark.ts
- src/components/editor/novel-editor.tsx (更新)
- src/hooks/use-ai-stream.ts
- src/lib/ai-client.ts
- src/stores/editor.store.ts (更新)

---

## T-013: 六阶段创作流程 - Workflow Service [P1] [complex]

- **priority**: P1
- **complexity**: complex (7)
- **review_strategy**: two-stage
- **parallel_group**: 7
- **execution**: agent
- **model**: opus
- **estimated_files**: 6
- **dependencies**: T-008, T-011

### 描述

实现六阶段创作工作流的后端逻辑。每个阶段有明确的输入/输出、完成条件、AI 辅助生成能力。

### 验收标准

- [ ] Workflow Service 管理六个阶段的状态流转
- [ ] 阶段1(创意风暴): AI 辅助生成全书基因，保存到 Gene
- [ ] 阶段2(骨架搭建): AI 辅助生成全书大纲，保存到 Volume 结构
- [ ] 阶段3(卷级规划): 逐卷 AI 辅助规划，生成章节大纲
- [ ] 阶段4(逐章创作): 关联编辑器，追踪写作进度
- [ ] 阶段5(卷末收尾): 生成卷总结，伏笔审计
- [ ] 阶段6(全书收尾): 全书审计，质量报告
- [ ] `canAdvance()`: 检查当前阶段完成条件
- [ ] 各阶段数据持久化到 WorkflowState
- [ ] tRPC Router: getStatus, getStageData, saveStageData, advance

### 涉及文件

- src/server/services/workflow.service.ts
- src/server/routers/workflow.ts
- src/types/workflow.ts
- src/server/routers/_app.ts (更新)
- src/templates/ (阶段模板，6 个文件)

---

## T-014: 六阶段创作流程 - 前端引导界面 [P1] [medium]

- **priority**: P1
- **complexity**: medium (6)
- **review_strategy**: combined
- **parallel_group**: 8
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 10
- **dependencies**: T-006, T-013

### 描述

实现六阶段创作流程的前端引导界面，包括阶段进度展示、各阶段的表单/交互界面、AI 辅助生成的触发和展示。

### 验收标准

- [ ] `/novels/[novelId]/workflow` 页面
- [ ] 阶段进度条/步骤指示器
- [ ] 阶段1 界面: 创意风暴表单 + AI 对话式生成
- [ ] 阶段2 界面: 大纲编辑 + AI 辅助
- [ ] 阶段3 界面: 卷级规划面板 + 章节大纲编辑
- [ ] 阶段4 界面: 写作进度仪表盘 + 跳转编辑器
- [ ] 阶段5 界面: 卷总结 + 伏笔审计展示
- [ ] 阶段6 界面: 全书统计 + 质量总览
- [ ] 各阶段之间的导航和状态展示
- [ ] 流式 AI 响应在界面中实时展示

### 涉及文件

- src/app/novels/[novelId]/workflow/page.tsx
- src/components/workflow/stage-progress.tsx
- src/components/workflow/stage-panel.tsx
- src/components/workflow/brainstorm-stage.tsx
- src/components/workflow/skeleton-stage.tsx
- src/components/workflow/volume-plan-stage.tsx
- src/components/workflow/chapter-write-stage.tsx
- src/components/workflow/volume-close-stage.tsx
- src/components/workflow/book-close-stage.tsx
- src/stores/workflow.store.ts

---

## T-015: 人物管理系统 [P1] [medium]

- **priority**: P1
- **complexity**: medium (5)
- **review_strategy**: combined
- **parallel_group**: 5
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 6
- **dependencies**: T-005

### 描述

实现人物的完整管理功能，包括人物 CRUD、关系设置、状态追踪。后端 Service + Router。

### 验收标准

- [ ] Character Service: create, update, list, getDetail, delete
- [ ] CharacterRelation 管理: setRelation, getRelations, deleteRelation
- [ ] 人物状态历史: 按卷追踪人物状态变化
- [ ] tRPC Router: 所有 character 相关 procedure
- [ ] 人物搜索: 按名字/别名搜索
- [ ] 支持人物角色分类（主角/反派/配角/路人）

### 涉及文件

- src/server/services/character.service.ts
- src/server/routers/character.ts
- src/types/character.ts
- src/server/routers/_app.ts (更新)
- tests/services/character.service.test.ts

---

## T-016: 世界观管理系统 [P1] [medium]

- **priority**: P1
- **complexity**: medium (4)
- **review_strategy**: self
- **parallel_group**: 5
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 5
- **dependencies**: T-005

### 描述

实现世界观条目的管理，支持分类、层级结构、标签、搜索。

### 验收标准

- [ ] Worldview Service: createEntry, updateEntry, list, getCategories, search, delete
- [ ] 支持 7 个分类: geography, faction, magic, technology, culture, history, other
- [ ] 支持层级结构 (parentId)
- [ ] 标签搜索
- [ ] tRPC Router: 所有 worldview procedure

### 涉及文件

- src/server/services/worldview.service.ts
- src/server/routers/worldview.ts
- src/types/worldview.ts
- src/server/routers/_app.ts (更新)

---

## T-017: 伏笔管理系统 [P1] [medium]

- **priority**: P1
- **complexity**: medium (5)
- **review_strategy**: combined
- **parallel_group**: 5
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 6
- **dependencies**: T-005, T-007

### 描述

实现伏笔的完整生命周期管理，包括创建、状态流转（planned -> planted -> recalled）、章节关联、审计报告。

### 验收标准

- [ ] Foreshadow Service: create, update, list, delete, linkToChapter, getAuditReport
- [ ] 状态管理: planned -> planted -> partially_recalled -> recalled / abandoned
- [ ] ForeshadowLink: 关联伏笔到具体章节（planted/recalled/hinted）
- [ ] 审计报告: 统计已植入/已回收/超期/孤立伏笔
- [ ] tRPC Router: 所有 foreshadow procedure
- [ ] 按卷/按类型筛选伏笔

### 涉及文件

- src/server/services/foreshadow.service.ts
- src/server/routers/foreshadow.ts
- src/types/foreshadow.ts
- src/server/routers/_app.ts (更新)
- tests/services/foreshadow.service.test.ts

---

## T-018: Python 质检脚本改造 (JSON 输出) [P1] [medium]

- **priority**: P1
- **complexity**: medium (4)
- **review_strategy**: self
- **parallel_group**: 2
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 7
- **dependencies**: 无

### 描述

改造现有 7 个 Python 质检脚本，增加 `--format json` 输出模式。保持原有 CLI 功能不变，新增 JSON 格式输出以便 Web 应用调用。

注意：此任务需要先创建 scripts/ 目录和基础脚本框架。由于当前仓库为空，需参照需求描述创建以下脚本：
- check_wordcount.py (字数检查)
- detect_ai_flavor.py (AI味检测)
- check_terminology.py (术语一致性)
- audit_foreshadow.py (伏笔审计)
- check_pacing.py (节奏检查)
- check_dialogue.py (对话检查)
- check_consistency.py (一致性检查)

### 验收标准

- [ ] 7 个 Python 脚本均创建并实现核心逻辑
- [ ] 每个脚本支持 `--format json` 参数
- [ ] JSON 输出包含结构化的检查结果
- [ ] 每个脚本支持 `--input` 参数接收文本内容（或从 stdin 读取）
- [ ] 脚本可独立运行（`python3 scripts/xxx.py --help`）
- [ ] 统一的 JSON 输出结构：`{ "status": "pass|warn|fail", "score": number, "details": [...], "suggestions": [...] }`

### 涉及文件

- scripts/check_wordcount.py
- scripts/detect_ai_flavor.py
- scripts/check_terminology.py
- scripts/audit_foreshadow.py
- scripts/check_pacing.py
- scripts/check_dialogue.py
- scripts/check_consistency.py

---

## T-019: Quality Service - Web 桥接层 [P1] [medium]

- **priority**: P1
- **complexity**: medium (5)
- **review_strategy**: combined
- **parallel_group**: 6
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 5
- **dependencies**: T-003, T-018

### 描述

实现 Quality Service，通过 Node.js child_process 调用 Python 质检脚本，解析 JSON 结果，提供 tRPC API。

### 验收标准

- [ ] Quality Service: runAllChecks, 各单项检查方法
- [ ] Python 脚本调用封装: execFile + JSON 解析
- [ ] 超时处理: 单个脚本调用超时 30 秒
- [ ] 错误处理: Python 脚本不存在/执行失败的优雅降级
- [ ] tRPC Router: runAll, wordcount, aiFlavor, terminology, foreshadow, pacing, dialogue
- [ ] 支持并行运行多个检查脚本
- [ ] 检查结果缓存: 同一章节内容未变更时返回缓存

### 涉及文件

- src/server/services/quality.service.ts
- src/server/routers/quality.ts
- src/lib/python-bridge.ts
- src/types/quality.ts
- src/server/routers/_app.ts (更新)

---

## T-020: 质量报告前端展示 [P1] [simple]

- **priority**: P1
- **complexity**: simple (3)
- **review_strategy**: self
- **parallel_group**: 7
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 5
- **dependencies**: T-006, T-019

### 描述

实现质量检查结果的前端展示页面，包括综合评分、各项指标的可视化展示、改进建议列表。

### 验收标准

- [ ] `/novels/[novelId]/quality` 质量报告页面
- [ ] 综合评分展示（雷达图或评分卡）
- [ ] 各项指标列表：状态(pass/warn/fail)、分数、详情
- [ ] 改进建议列表
- [ ] 支持对单个章节运行检查
- [ ] 加载状态和错误状态处理

### 涉及文件

- src/app/novels/[novelId]/quality/page.tsx
- src/components/quality/quality-dashboard.tsx
- src/components/quality/check-result-card.tsx
- src/components/quality/suggestion-list.tsx

---

## T-021: 记忆上下文面板 (编辑器侧边栏) [P1] [medium]

- **priority**: P1
- **complexity**: medium (5)
- **review_strategy**: self
- **parallel_group**: 7
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 6
- **dependencies**: T-009, T-010

### 描述

在编辑器右侧实现记忆上下文面板，展示当前章节的 5 层记忆信息，支持展开/折叠、Token 预算展示、手动刷新。

### 验收标准

- [ ] 记忆面板集成到编辑器右侧栏
- [ ] 5 层记忆分类展示（可折叠手风琴）
- [ ] L1 全书基因: 核心设定摘要
- [ ] L2 卷记忆: 当前卷目标和状态
- [ ] L3 弧线记忆: 当前弧线信息
- [ ] L4 章节记忆: 前几章摘要
- [ ] L5 按需检索: 相关人物/世界观/伏笔卡片
- [ ] Token 预算使用量展示（进度条）
- [ ] 手动刷新上下文按钮
- [ ] 编辑器打开时自动组装上下文

### 涉及文件

- src/components/editor/memory-panel.tsx
- src/components/editor/memory-layer.tsx
- src/components/editor/token-budget-bar.tsx
- src/components/editor/entity-card.tsx
- src/components/editor/novel-editor.tsx (更新)
- src/hooks/use-memory-context.ts

---

## T-022: 人物/世界观/伏笔前端管理页面 [P1] [medium]

- **priority**: P1
- **complexity**: medium (6)
- **review_strategy**: self
- **parallel_group**: 7
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 15
- **dependencies**: T-006, T-015, T-016, T-017

### 描述

实现人物、世界观、伏笔三个管理模块的前端页面。包括列表、详情、创建/编辑表单、关系图等。

### 验收标准

- [ ] `/novels/[novelId]/characters` 人物列表 + 人物卡片
- [ ] 人物详情: 基本信息、关系列表、状态历史
- [ ] 人物关系图: 简单的关系网络可视化
- [ ] `/novels/[novelId]/worldview` 世界观分类浏览
- [ ] 世界观条目编辑: 支持富文本描述
- [ ] `/novels/[novelId]/foreshadow` 伏笔管理列表
- [ ] 伏笔状态流转可视化
- [ ] 伏笔审计仪表盘: 统计各状态的伏笔数量
- [ ] 所有页面支持搜索/筛选

### 涉及文件

- src/app/novels/[novelId]/characters/page.tsx
- src/app/novels/[novelId]/worldview/page.tsx
- src/app/novels/[novelId]/foreshadow/page.tsx
- src/components/character/character-list.tsx
- src/components/character/character-card.tsx
- src/components/character/character-form.tsx
- src/components/character/relation-graph.tsx
- src/components/worldview/worldview-browser.tsx
- src/components/worldview/worldview-form.tsx
- src/components/foreshadow/foreshadow-list.tsx
- src/components/foreshadow/foreshadow-form.tsx
- src/components/foreshadow/foreshadow-status.tsx
- src/components/foreshadow/audit-dashboard.tsx

---

## T-023: 小说导出功能 [P2] [simple]

- **priority**: P2
- **complexity**: simple (3)
- **review_strategy**: self
- **parallel_group**: 8
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 4
- **dependencies**: T-005, T-007

### 描述

实现小说内容的导出功能，支持 Markdown 和纯文本格式导出。

### 验收标准

- [ ] Markdown 导出: 按卷/章结构导出完整小说
- [ ] TXT 导出: 纯文本格式
- [ ] 支持导出全书或单卷
- [ ] 下载文件命名规范（小说名_卷名.md）
- [ ] 导出 API 和前端下载按钮

### 涉及文件

- src/server/services/export.service.ts
- src/server/routers/export.ts
- src/components/novel/export-dialog.tsx
- src/app/api/export/[novelId]/route.ts

---

## T-024: 编辑器高级扩展 (伏笔标记/人物引用) [P2] [medium]

- **priority**: P2
- **complexity**: medium (5)
- **review_strategy**: combined
- **parallel_group**: 8
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 6
- **dependencies**: T-012, T-015, T-017

### 描述

为 Tiptap 编辑器添加高级扩展：伏笔植入/回收标记、@人物名引用、批注功能。

### 验收标准

- [ ] ForeshadowMark 扩展: 选中文本标记为伏笔植入/回收点
- [ ] CharacterMention 扩展: 输入 @ 触发人物搜索和引用
- [ ] 伏笔标记保存到 ForeshadowLink
- [ ] 人物引用高亮显示
- [ ] 批注扩展: 可对文本段落添加批注

### 涉及文件

- src/components/editor/extensions/foreshadow-mark.ts
- src/components/editor/extensions/character-mention.ts
- src/components/editor/extensions/comment.ts
- src/components/editor/foreshadow-toolbar.tsx
- src/components/editor/mention-list.tsx
- src/components/editor/novel-editor.tsx (更新)

---

## T-025: 全局配置与 LLM 模型管理页面 [P2] [simple]

- **priority**: P2
- **complexity**: simple (3)
- **review_strategy**: self
- **parallel_group**: 8
- **execution**: agent
- **model**: haiku
- **estimated_files**: 4
- **dependencies**: T-006, T-011

### 描述

实现全局设置页面和 LLM 模型管理，包括 API Key 配置、模型选择、默认参数设置。

### 验收标准

- [ ] 设置页面: API Key 配置（遮罩显示）
- [ ] 模型列表展示和切换
- [ ] 默认参数设置（temperature, max tokens）
- [ ] 模型连通性测试按钮

### 涉及文件

- src/app/settings/page.tsx
- src/components/settings/api-key-form.tsx
- src/components/settings/model-selector.tsx
- src/server/routers/settings.ts

---

## T-026: E2E 测试与集成测试 [P2] [medium]

- **priority**: P2
- **complexity**: medium (5)
- **review_strategy**: self
- **parallel_group**: 9
- **execution**: agent
- **model**: sonnet
- **estimated_files**: 10
- **dependencies**: T-012, T-014

### 描述

编写关键用户流程的 E2E 测试和核心模块的集成测试。

### 验收标准

- [ ] Vitest 集成测试: Memory Service 端到端测试
- [ ] Vitest 集成测试: Quality Service Python 桥接测试
- [ ] Vitest 集成测试: tRPC Router 测试
- [ ] Playwright E2E: 创建小说流程
- [ ] Playwright E2E: 章节编辑与 AI 生成
- [ ] Playwright E2E: 六阶段工作流
- [ ] 测试配置和 CI 脚本

### 涉及文件

- vitest.config.ts
- playwright.config.ts
- tests/integration/memory.test.ts
- tests/integration/quality.test.ts
- tests/integration/routers.test.ts
- tests/e2e/novel-create.spec.ts
- tests/e2e/chapter-editor.spec.ts
- tests/e2e/workflow.spec.ts
- package.json (测试依赖)

---

## 依赖关系图

```
并行组 1:  T-001 (项目初始化)
              │
              ├────────────────┬────────────────┐
              ▼                ▼                ▼
并行组 2:  T-002 (DB)      T-003 (tRPC)    T-004 (UI)     T-018 (Python脚本)
              │                │                │                │
              ├────────────────┤                │                │
              ▼                                 │                │
并行组 3:  T-005 (小说后端)                     │                │
              │                                 │                │
              ├──────────┬──────────┐           │                │
              ▼          ▼          ▼           ▼                ▼
并行组 4:  T-007      T-008      T-006      (T-004完成)     (T-018完成)
           (卷章后端)  (基因后端)  (小说前端)
              │          │          │
              ▼          ▼          │
并行组 5:  T-009      T-010      T-015  T-016  T-017
           (编辑器)    (记忆系统)  (人物)  (世界) (伏笔)
              │          │          │       │      │
              ├──────────┤          │       │      │
              ▼          ▼          │       │      │
并行组 6:  T-011 (AI Service)    T-019 (Quality Service)
              │                     │
              ├──────────┐          │
              ▼          ▼          ▼
并行组 7:  T-012      T-013      T-020  T-021  T-022
           (AI工具栏)  (工作流)   (质量)  (记忆面板) (管理页面)
              │          │
              ▼          ▼
并行组 8:  T-014  T-023  T-024  T-025
           (工作流UI)(导出)(编辑器扩展)(设置)
              │
              ▼
并行组 9:  T-026 (E2E 测试)
```

## 执行计划

### Phase 1: 基础设施 (并行组 1-2)

**目标**: 项目可运行，基础架构就绪

| 顺序 | 任务 | 预计时间 | 模型 |
|------|------|---------|------|
| 1 | T-001 项目初始化 | 0.5天 | sonnet |
| 2a | T-002 数据库 Schema | 0.5天 | sonnet |
| 2b | T-003 tRPC 基础 | 0.5天 | sonnet |
| 2c | T-004 UI 布局 | 0.5天 | sonnet |
| 2d | T-018 Python 脚本 | 0.5天 | sonnet |

**里程碑**: `pnpm dev` 可启动，数据库可迁移，tRPC 端到端连通

### Phase 2: 核心 CRUD (并行组 3-4)

**目标**: 小说/卷/章节的完整管理

| 顺序 | 任务 | 预计时间 | 模型 |
|------|------|---------|------|
| 3 | T-005 小说后端 | 0.5天 | sonnet |
| 4a | T-006 小说前端 | 0.5天 | sonnet |
| 4b | T-007 卷章后端 | 0.5天 | sonnet |
| 4c | T-008 基因后端 | 0.5天 | sonnet |

**里程碑**: 可创建小说，管理卷和章节

### Phase 3: 核心引擎 (并行组 5-6)

**目标**: 编辑器、记忆系统、AI 集成

| 顺序 | 任务 | 预计时间 | 模型 |
|------|------|---------|------|
| 5a | T-009 编辑器 | 1天 | opus |
| 5b | T-010 记忆系统 | 1天 | opus |
| 5c | T-015 人物管理 | 0.5天 | sonnet |
| 5d | T-016 世界观管理 | 0.5天 | sonnet |
| 5e | T-017 伏笔管理 | 0.5天 | sonnet |
| 6a | T-011 AI Service | 1天 | opus |
| 6b | T-019 Quality Service | 0.5天 | sonnet |

**里程碑**: 可在编辑器中创作，AI 辅助生成，质量检查

### Phase 4: 高级功能 (并行组 7-8)

**目标**: AI 编辑器集成、工作流、管理页面

| 顺序 | 任务 | 预计时间 | 模型 |
|------|------|---------|------|
| 7a | T-012 AI 工具栏 | 1天 | opus |
| 7b | T-013 工作流后端 | 1天 | opus |
| 7c | T-020 质量报告页面 | 0.5天 | sonnet |
| 7d | T-021 记忆面板 | 0.5天 | sonnet |
| 7e | T-022 管理页面 | 1天 | sonnet |
| 8a | T-014 工作流前端 | 1天 | sonnet |
| 8b | T-023 导出功能 | 0.5天 | sonnet |
| 8c | T-024 编辑器扩展 | 0.5天 | sonnet |
| 8d | T-025 设置页面 | 0.5天 | haiku |

**里程碑**: 全功能可用

### Phase 5: 测试与收尾 (并行组 9)

| 顺序 | 任务 | 预计时间 | 模型 |
|------|------|---------|------|
| 9 | T-026 E2E 测试 | 1天 | sonnet |

**里程碑**: 测试覆盖，可发布

### 总预估

- **总任务数**: 26
- **预估总时间**: 约 15-18 个工作日（单人全职）
- **关键路径**: T-001 -> T-002/T-003 -> T-005 -> T-007 -> T-009 -> T-011 -> T-012 -> T-014 -> T-026

## 风险评估

### 高风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 分层记忆系统复杂度超预期 | 核心功能延期 | 先实现 L1+L4 最简版本，逐步添加 L2/L3/L5 |
| Tiptap AI 流式插入兼容性 | 编辑器体验差 | 准备 fallback 方案（文本框 + 手动粘贴）|
| LLM API 延迟/成本 | 用户体验差 | 支持多模型切换，本地缓存上下文减少重复调用 |

### 中风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Python 脚本与 Node.js 桥接稳定性 | 质量检查不可靠 | 充分测试 child_process 调用，设置超时和重试 |
| SQLite 并发写入限制 | 自动保存可能冲突 | 使用 WAL 模式，写操作队列化 |
| 六阶段工作流状态管理复杂 | 状态混乱 | 严格的状态机设计，每次状态变更持久化 |

### 低风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| shadcn/ui 组件不满足需求 | 需自定义组件 | 基于 Radix UI 原语扩展 |
| 项目规模对单人开发有挑战 | 交付延期 | MVP 先行，按 Phase 交付 |
