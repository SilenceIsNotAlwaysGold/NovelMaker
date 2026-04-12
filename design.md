# 技术设计文档: NovelMaker Web 应用

## 1. 架构概览

### 1.1 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 14)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 项目管理  │ │ 创作流程  │ │ 编辑器    │ │ 管理面板  │           │
│  │ Dashboard │ │ Workflow  │ │ Editor   │ │ Panels   │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       └─────────────┴────────────┴─────────────┘                │
│                          │                                       │
│                    tRPC Client                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/WebSocket
┌──────────────────────────┴──────────────────────────────────────┐
│                     Backend (Next.js API Routes + tRPC)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Novel    │ │ Memory   │ │ AI       │ │ Quality  │           │
│  │ Service  │ │ Service  │ │ Service  │ │ Service  │           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│       └─────────────┴────────────┴─────────────┘                │
│                          │                                       │
│              ┌───────────┼───────────┐                          │
│              │           │           │                          │
│         Prisma ORM   LLM APIs   File Storage                   │
└──────────┬───────────────┬───────────┬──────────────────────────┘
           │               │           │
    ┌──────┴──────┐  ┌────┴────┐ ┌───┴────┐
    │  SQLite     │  │ OpenAI  │ │ Local  │
    │  Database   │  │ Claude  │ │ Files  │
    └─────────────┘  │ Custom  │ └────────┘
                     └─────────┘
```

### 1.2 技术栈选型

| 层级 | 技术 | 理由 |
|------|------|------|
| **框架** | Next.js 14 (App Router) | 全栈一体，SSR/SSG 灵活，单人开发效率最高 |
| **语言** | TypeScript | 类型安全，前后端统一 |
| **API** | tRPC v11 | 端到端类型安全，无需手写 API schema |
| **数据库** | SQLite + Prisma | 零运维，单文件部署，Prisma 提供类型安全 ORM |
| **状态管理** | Zustand | 轻量，API 简洁，适合中等复杂度 |
| **UI 组件** | shadcn/ui + Tailwind CSS | 可定制组件库，无运行时开销 |
| **富文本编辑** | Tiptap | 基于 ProseMirror，可扩展性强，AI 集成友好 |
| **LLM 集成** | Vercel AI SDK | 统一流式 API，支持多模型切换 |
| **质量脚本** | 保留 Python + child_process 调用 | 复用现有 7 个质检脚本，后续可渐进迁移为 TS |
| **包管理** | pnpm | 快速，磁盘高效 |

### 1.3 数据流总览

```
用户操作
  │
  ├──[创建小说]──→ Novel Service ──→ DB (novels, gene)
  │
  ├──[六阶段流程]──→ Workflow Service ──→ DB (stages, outlines, volumes)
  │
  ├──[编辑章节]──→ Editor ──→ Memory Service (组装上下文)
  │                              │
  │                              ├── L1: 全书基因 (gene)
  │                              ├── L2: 卷记忆 (volume_memory)
  │                              ├── L3: 弧线记忆 (arc_memory)
  │                              ├── L4: 章节记忆 (chapter_memory)
  │                              └── L5: 按需检索 (on_demand)
  │                              │
  │                              └──→ AI Service ──→ LLM API
  │                                        │
  │                                        └──→ 流式响应 ──→ Editor
  │
  ├──[质量检查]──→ Quality Service ──→ Python Scripts
  │                                        │
  │                                        └──→ 检查结果 ──→ UI
  │
  └──[管理面板]──→ Character/World/Foreshadow Service ──→ DB
```

## 2. 组件设计

### 2.1 项目目录结构

```
NovelMaker/
├── prisma/
│   └── schema.prisma              # 数据库 Schema
├── scripts/                        # Python 质检脚本（保留）
│   ├── check_wordcount.py
│   ├── detect_ai_flavor.py
│   ├── check_terminology.py
│   ├── audit_foreshadow.py
│   ├── check_pacing.py
│   ├── check_dialogue.py
│   └── check_consistency.py
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                # 首页/仪表盘
│   │   ├── novels/
│   │   │   ├── page.tsx            # 小说列表
│   │   │   └── [novelId]/
│   │   │       ├── page.tsx        # 小说详情/工作台
│   │   │       ├── workflow/
│   │   │       │   └── page.tsx    # 六阶段创作流程
│   │   │       ├── editor/
│   │   │       │   └── [chapterId]/
│   │   │       │       └── page.tsx # 章节编辑器
│   │   │       ├── characters/
│   │   │       │   └── page.tsx    # 人物管理
│   │   │       ├── worldview/
│   │   │       │   └── page.tsx    # 世界观管理
│   │   │       ├── foreshadow/
│   │   │       │   └── page.tsx    # 伏笔管理
│   │   │       └── quality/
│   │   │           └── page.tsx    # 质量报告
│   │   └── api/
│   │       └── trpc/
│   │           └── [trpc]/
│   │               └── route.ts    # tRPC API 入口
│   ├── server/
│   │   ├── routers/                # tRPC Routers
│   │   │   ├── _app.ts            # Root router
│   │   │   ├── novel.ts           # 小说 CRUD
│   │   │   ├── workflow.ts        # 创作流程
│   │   │   ├── chapter.ts         # 章节管理
│   │   │   ├── memory.ts          # 记忆系统
│   │   │   ├── ai.ts              # AI 调用
│   │   │   ├── quality.ts         # 质量检查
│   │   │   ├── character.ts       # 人物管理
│   │   │   ├── worldview.ts       # 世界观管理
│   │   │   └── foreshadow.ts      # 伏笔管理
│   │   ├── services/               # 业务逻辑层
│   │   │   ├── novel.service.ts
│   │   │   ├── workflow.service.ts
│   │   │   ├── chapter.service.ts
│   │   │   ├── memory.service.ts
│   │   │   ├── ai.service.ts
│   │   │   ├── quality.service.ts
│   │   │   ├── character.service.ts
│   │   │   ├── worldview.service.ts
│   │   │   └── foreshadow.service.ts
│   │   ├── db.ts                   # Prisma client
│   │   └── trpc.ts                 # tRPC 初始化
│   ├── components/                 # 共享 UI 组件
│   │   ├── ui/                     # shadcn/ui 基础组件
│   │   ├── layout/                 # 布局组件
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── novel-nav.tsx
│   │   ├── novel/                  # 小说相关组件
│   │   │   ├── novel-card.tsx
│   │   │   ├── novel-create-dialog.tsx
│   │   │   └── novel-settings.tsx
│   │   ├── workflow/               # 创作流程组件
│   │   │   ├── stage-progress.tsx
│   │   │   ├── stage-panel.tsx
│   │   │   └── brainstorm-form.tsx
│   │   ├── editor/                 # 编辑器组件
│   │   │   ├── novel-editor.tsx
│   │   │   ├── ai-toolbar.tsx
│   │   │   ├── memory-panel.tsx
│   │   │   └── outline-sidebar.tsx
│   │   ├── character/              # 人物管理组件
│   │   ├── worldview/              # 世界观组件
│   │   ├── foreshadow/             # 伏笔组件
│   │   └── quality/                # 质量报告组件
│   ├── stores/                     # Zustand stores
│   │   ├── novel.store.ts
│   │   ├── editor.store.ts
│   │   └── workflow.store.ts
│   ├── lib/                        # 工具库
│   │   ├── utils.ts
│   │   ├── memory-assembler.ts     # 记忆组装器
│   │   └── prompt-builder.ts       # Prompt 构建器
│   ├── types/                      # 类型定义
│   │   └── index.ts
│   └── templates/                  # 创作模板（从 Markdown 迁移）
│       ├── gene.template.ts
│       ├── outline.template.ts
│       ├── volume.template.ts
│       ├── chapter.template.ts
│       └── ...
├── templates/                       # 原始 Markdown 模板（保留）
├── references/                      # 写作参考指南（保留）
├── novels/                          # 小说存储目录（保留，兼容）
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── .env.example
```

### 2.2 核心模块设计

#### 2.2.1 小说项目管理 (Novel Service)

**职责**: 小说生命周期管理，包括创建、编辑、删除、导出。

```typescript
// 核心接口
interface NovelService {
  create(input: CreateNovelInput): Promise<Novel>;
  getById(id: string): Promise<Novel>;
  list(userId?: string): Promise<Novel[]>;
  update(id: string, input: UpdateNovelInput): Promise<Novel>;
  delete(id: string): Promise<void>;
  export(id: string, format: 'markdown' | 'txt' | 'docx'): Promise<Buffer>;
  getStats(id: string): Promise<NovelStats>;
}
```

#### 2.2.2 六阶段创作流程 (Workflow Service)

**职责**: 管理从创意到成书的六阶段工作流。

```
阶段1: 创意风暴 (Brainstorm)
  └── 输出: 全书基因文档 (gene)
阶段2: 骨架搭建 (Skeleton)
  └── 输出: 全书大纲 (outline)
阶段3: 卷级规划 (Volume Planning)
  └── 输出: 各卷详细规划 (volume plans)
阶段4: 逐章创作 (Chapter Writing)
  └── 输出: 各章正文 (chapters)
阶段5: 卷末收尾 (Volume Closing)
  └── 输出: 卷末总结、伏笔审计
阶段6: 全书收尾 (Book Closing)
  └── 输出: 全书审计、质量报告
```

```typescript
interface WorkflowService {
  getStageStatus(novelId: string): Promise<StageStatus[]>;
  advanceStage(novelId: string): Promise<Stage>;
  getStageData(novelId: string, stage: StageType): Promise<StageData>;
  saveStageData(novelId: string, stage: StageType, data: StageData): Promise<void>;
  canAdvance(novelId: string): Promise<{ allowed: boolean; blockers: string[] }>;
}
```

#### 2.2.3 分层记忆系统 (Memory Service)

**职责**: 5层记忆的存储、检索和上下文组装。这是系统的核心创新点。

```
记忆层级:
  L1 全书基因 (Gene Memory)
     ├── 核心设定：题材、风格、主题
     ├── 全局规则：写作公约、术语表
     └── 总纲要素：主线、结局方向
     
  L2 卷记忆 (Volume Memory)
     ├── 本卷目标：情节弧线、张力曲线
     ├── 卷级角色状态：成长阶段
     └── 卷级世界状态：新区域、势力变化
     
  L3 弧线记忆 (Arc Memory)
     ├── 当前弧线：3-5章的小剧情
     ├── 弧线人物焦点
     └── 弧线伏笔计划
     
  L4 章节记忆 (Chapter Memory)
     ├── 前3章摘要
     ├── 上一章详细内容
     └── 本章大纲
     
  L5 按需检索 (On-Demand)
     ├── 相关人物档案
     ├── 相关世界观条目
     └── 相关伏笔状态
```

```typescript
interface MemoryService {
  // 记忆组装：为章节创作准备完整上下文
  assembleContext(novelId: string, chapterId: string): Promise<MemoryContext>;
  
  // 各层记忆 CRUD
  getGeneMemory(novelId: string): Promise<GeneMemory>;
  saveGeneMemory(novelId: string, data: GeneMemory): Promise<void>;
  
  getVolumeMemory(volumeId: string): Promise<VolumeMemory>;
  saveVolumeMemory(volumeId: string, data: VolumeMemory): Promise<void>;
  
  getArcMemory(arcId: string): Promise<ArcMemory>;
  getChapterMemory(chapterId: string): Promise<ChapterMemory>;
  
  // 按需检索
  searchRelevant(novelId: string, query: string, types: EntityType[]): Promise<RelevantEntity[]>;
  
  // Token 预算管理
  estimateTokens(context: MemoryContext): number;
  truncateToFit(context: MemoryContext, maxTokens: number): MemoryContext;
}
```

**上下文组装策略**:

```
组装优先级（Token 预算分配）:
  1. 全书基因 (L1): ~500 tokens，始终包含，压缩版
  2. 本章大纲 (L4): ~300 tokens，始终包含
  3. 上一章摘要 (L4): ~500 tokens
  4. 当前弧线 (L3): ~400 tokens
  5. 卷记忆 (L2): ~300 tokens，压缩版
  6. 按需检索 (L5): 剩余 tokens
  
  总预算: 根据模型上下文窗口动态调整
  默认: 4000-8000 tokens 用于记忆上下文
```

#### 2.2.4 AI 辅助写作 (AI Service)

**职责**: LLM API 调用，Prompt 构建，流式响应处理。

```typescript
interface AIService {
  // 流式生成章节内容
  generateChapter(input: GenerateInput): AsyncGenerator<string>;
  
  // AI 辅助操作
  continueWriting(context: AIContext, currentText: string): AsyncGenerator<string>;
  rewrite(context: AIContext, text: string, instruction: string): AsyncGenerator<string>;
  expand(context: AIContext, text: string): AsyncGenerator<string>;
  summarize(text: string): Promise<string>;
  
  // 创作流程辅助
  brainstorm(input: BrainstormInput): AsyncGenerator<string>;
  generateOutline(gene: GeneMemory): AsyncGenerator<string>;
  planVolume(gene: GeneMemory, volumeIndex: number): AsyncGenerator<string>;
  
  // 模型管理
  listModels(): Promise<ModelInfo[]>;
  setModel(modelId: string): void;
}

interface GenerateInput {
  novelId: string;
  chapterId: string;
  memoryContext: MemoryContext;  // 来自 Memory Service
  chapterOutline: string;
  userInstruction?: string;
  temperature?: number;
  maxTokens?: number;
}
```

**Prompt 构建模板**:

```
[系统指令]
你是一个中文网络小说写作助手。以下是本书的核心设定和当前创作上下文。

[L1 全书基因]
{gene_memory}

[L2 卷记忆]
{volume_memory}

[L3 弧线记忆]
{arc_memory}

[L4 章节记忆]
{chapter_memory}

[L5 相关资料]
{on_demand_entities}

[本章大纲]
{chapter_outline}

[写作指令]
{user_instruction}

请按照以上设定和大纲，创作本章内容。要求：
- 字数: {target_wordcount} 字
- 风格: 保持与前文一致
- 遵守写作公约中的规则
```

#### 2.2.5 质量控制 (Quality Service)

**职责**: 调用 Python 质检脚本，解析结果，提供可视化报告。

```typescript
interface QualityService {
  // 运行全部检查
  runAllChecks(novelId: string, chapterId: string): Promise<QualityReport>;
  
  // 单项检查
  checkWordcount(chapterId: string): Promise<WordcountResult>;
  detectAIFlavor(chapterId: string): Promise<AIFlavorResult>;
  checkTerminology(novelId: string, chapterId: string): Promise<TerminologyResult>;
  auditForeshadow(novelId: string): Promise<ForeshadowAuditResult>;
  checkPacing(chapterId: string): Promise<PacingResult>;
  checkDialogue(chapterId: string): Promise<DialogueResult>;
  checkConsistency(novelId: string, chapterId: string): Promise<ConsistencyResult>;
}
```

**Python 调用方案**:

```typescript
// 通过 child_process 调用 Python 脚本
import { execFile } from 'child_process';

async function runPythonCheck(script: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('python3', [
      path.join(process.cwd(), 'scripts', script),
      ...args,
      '--format', 'json'  // 要求 Python 脚本输出 JSON
    ], (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
}
```

**改造计划**: 现有 Python 脚本需要增加 `--format json` 输出模式，保持原有 CLI 功能不变。

#### 2.2.6 人物/世界观/伏笔管理

**职责**: 实体的 CRUD、关系管理、创作时自动关联。

```typescript
// 人物管理
interface CharacterService {
  create(novelId: string, input: CreateCharacterInput): Promise<Character>;
  update(id: string, input: UpdateCharacterInput): Promise<Character>;
  list(novelId: string): Promise<Character[]>;
  getRelationships(characterId: string): Promise<CharacterRelation[]>;
  setRelationship(from: string, to: string, relation: string): Promise<void>;
  getTimeline(characterId: string): Promise<CharacterEvent[]>;
}

// 世界观管理
interface WorldviewService {
  createEntry(novelId: string, input: CreateWorldviewInput): Promise<WorldviewEntry>;
  getCategories(novelId: string): Promise<WorldviewCategory[]>;
  search(novelId: string, query: string): Promise<WorldviewEntry[]>;
}

// 伏笔管理
interface ForeshadowService {
  create(novelId: string, input: CreateForeshadowInput): Promise<Foreshadow>;
  updateStatus(id: string, status: ForeshadowStatus): Promise<void>;
  getAuditReport(novelId: string): Promise<ForeshadowAudit>;
  getByChapter(chapterId: string): Promise<Foreshadow[]>;
  linkToChapter(foreshadowId: string, chapterId: string, type: 'planted' | 'recalled'): Promise<void>;
}
```

### 2.3 编辑器设计 (Tiptap)

```
┌─────────────────────────────────────────────────────┐
│ [章节导航]     章节标题     [记忆面板] [质量检查]      │
├──────────┬──────────────────────────┬────────────────┤
│          │                          │                │
│ 大纲     │    Tiptap 编辑区域       │  记忆上下文    │
│ 侧边栏   │                          │  面板          │
│          │                          │  ├─ L1 基因    │
│ - 卷1    │  正文内容...              │  ├─ L2 卷     │
│   - 章1  │                          │  ├─ L3 弧线   │
│   - 章2  │                          │  ├─ L4 章节   │
│ - 卷2    │                          │  └─ L5 检索   │
│          │                          │                │
│          ├──────────────────────────┤  人物卡片      │
│          │ [AI 工具栏]               │  伏笔状态      │
│          │ [续写] [改写] [扩写]      │                │
│          │ [检查] [生成全章]         │                │
└──────────┴──────────────────────────┴────────────────┘
```

**AI 工具栏功能**:
- **续写**: 基于当前内容和记忆上下文继续创作
- **改写**: 选中文本，输入改写指令
- **扩写**: 选中文本进行详细展开
- **检查**: 对当前章节运行质量检查
- **生成全章**: 基于章节大纲一次性生成

**Tiptap 扩展**:
- `AIMark`: 标记 AI 生成的内容段落
- `ForeshadowMark`: 伏笔植入/回收标记
- `CharacterMention`: @人物名 引用
- `CommentExtension`: 批注功能

## 3. 接口设计

### 3.1 tRPC Router 结构

```typescript
// src/server/routers/_app.ts
export const appRouter = router({
  novel: novelRouter,
  workflow: workflowRouter,
  chapter: chapterRouter,
  memory: memoryRouter,
  ai: aiRouter,
  quality: qualityRouter,
  character: characterRouter,
  worldview: worldviewRouter,
  foreshadow: foreshadowRouter,
});
```

### 3.2 关键接口清单

```typescript
// novel router
novel.create       // 创建小说
novel.list         // 列出所有小说
novel.getById      // 获取小说详情
novel.update       // 更新小说信息
novel.delete       // 删除小说
novel.getStats     // 获取统计数据
novel.export       // 导出

// workflow router
workflow.getStatus       // 获取当前阶段状态
workflow.getStageData    // 获取阶段数据
workflow.saveStageData   // 保存阶段数据
workflow.advance         // 推进到下一阶段

// chapter router
chapter.create     // 创建章节
chapter.getById    // 获取章节
chapter.update     // 更新章节内容
chapter.list       // 列出卷下所有章节
chapter.reorder    // 调整章节顺序
chapter.getSummary // 获取章节摘要

// memory router
memory.assembleContext   // 组装创作上下文
memory.getGene           // 获取全书基因
memory.saveGene          // 保存全书基因
memory.getVolumeMemory   // 获取卷记忆
memory.getArcMemory      // 获取弧线记忆
memory.estimateTokens    // 估算 Token 数

// ai router (流式)
ai.generate        // 生成章节内容 (subscription)
ai.continue        // 续写 (subscription)
ai.rewrite         // 改写 (subscription)
ai.expand          // 扩写 (subscription)
ai.brainstorm      // 创意风暴 (subscription)
ai.outline         // 生成大纲 (subscription)
ai.summarize       // 摘要生成

// quality router
quality.runAll       // 全部检查
quality.wordcount    // 字数检查
quality.aiFlavor     // AI味检测
quality.terminology  // 术语一致性
quality.foreshadow   // 伏笔审计
quality.pacing       // 节奏检查
quality.dialogue     // 对话检查

// character router
character.create       // 创建人物
character.update       // 更新人物
character.list         // 列出人物
character.getDetail    // 人物详情
character.setRelation  // 设置关系
character.getRelations // 获取关系图

// worldview router
worldview.createEntry    // 创建条目
worldview.updateEntry    // 更新条目
worldview.getCategories  // 获取分类
worldview.search         // 搜索

// foreshadow router
foreshadow.create      // 创建伏笔
foreshadow.update      // 更新伏笔
foreshadow.list        // 列出伏笔
foreshadow.link        // 关联章节
foreshadow.audit       // 伏笔审计
```

## 4. 数据设计

### 4.1 数据库 Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ========== 小说核心 ==========

model Novel {
  id          String   @id @default(cuid())
  title       String
  genre       String   // 题材类型
  description String?
  coverImage  String?
  status      String   @default("draft") // draft | writing | completed
  currentStage Int     @default(1) // 1-6 创作阶段
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  gene        Gene?
  volumes     Volume[]
  characters  Character[]
  worldviews  WorldviewEntry[]
  foreshadows Foreshadow[]
  settings    NovelSettings?
}

model NovelSettings {
  id              String @id @default(cuid())
  novelId         String @unique
  novel           Novel  @relation(fields: [novelId], references: [id], onDelete: Cascade)
  
  targetWordcount Int    @default(3000)   // 每章目标字数
  llmModel        String @default("gpt-4") // 默认模型
  llmTemperature  Float  @default(0.7)
  memoryBudget    Int    @default(6000)   // 记忆 Token 预算
  writingStyle    String? // 写作风格描述
  conventions     String? // 写作公约 (JSON)
  terminology     String? // 术语表 (JSON)
}

// ========== 全书基因 (L1) ==========

model Gene {
  id          String @id @default(cuid())
  novelId     String @unique
  novel       Novel  @relation(fields: [novelId], references: [id], onDelete: Cascade)
  
  premise     String  // 核心前提
  theme       String  // 主题
  tone        String  // 基调
  mainPlot    String  // 主线
  endingDir   String? // 结局方向
  rules       String? // 全局规则 (JSON)
  keywords    String? // 关键词 (JSON array)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ========== 卷和章节 ==========

model Volume {
  id          String   @id @default(cuid())
  novelId     String
  novel       Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)
  
  number      Int      // 卷序号
  title       String
  synopsis    String?  // 卷概要
  plotArc     String?  // 情节弧线
  tensionCurve String? // 张力曲线描述
  status      String   @default("planning") // planning | writing | completed
  
  // L2 卷记忆
  volumeMemory String? // 卷级记忆 (JSON)
  
  chapters    Chapter[]
  arcs        Arc[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([novelId, number])
}

model Arc {
  id          String   @id @default(cuid())
  volumeId    String
  volume      Volume   @relation(fields: [volumeId], references: [id], onDelete: Cascade)
  
  name        String
  description String?
  startChapter Int     // 弧线起始章
  endChapter  Int      // 弧线结束章
  focusChars  String?  // 焦点人物 (JSON array of IDs)
  
  // L3 弧线记忆
  arcMemory   String?  // 弧线记忆 (JSON)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Chapter {
  id          String   @id @default(cuid())
  volumeId    String
  volume      Volume   @relation(fields: [volumeId], references: [id], onDelete: Cascade)
  
  number      Int      // 章序号（卷内）
  globalNumber Int     // 全书章序号
  title       String
  outline     String?  // 章节大纲
  content     String?  // 正文内容
  wordcount   Int      @default(0)
  status      String   @default("outline") // outline | draft | review | final
  
  // L4 章节记忆
  summary     String?  // 章节摘要（AI 生成）
  keyEvents   String?  // 关键事件 (JSON)
  
  // 质量检查结果
  qualityScore Float?
  lastCheckedAt DateTime?
  
  foreshadowLinks ForeshadowLink[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([volumeId, number])
}

// ========== 人物系统 ==========

model Character {
  id          String   @id @default(cuid())
  novelId     String
  novel       Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)
  
  name        String
  aliases     String?  // 别名 (JSON array)
  role        String   // protagonist | antagonist | supporting | minor
  description String?  // 外貌描写
  personality String?  // 性格特点
  background  String?  // 背景故事
  abilities   String?  // 能力/技能 (JSON)
  goals       String?  // 目标/动机
  arc         String?  // 成长弧线描述
  
  // 动态状态（按卷追踪）
  stateHistory String? // 状态历史 (JSON array: [{volume, state}])
  
  relationsFrom CharacterRelation[] @relation("fromChar")
  relationsTo   CharacterRelation[] @relation("toChar")
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CharacterRelation {
  id          String    @id @default(cuid())
  fromId      String
  toId        String
  fromChar    Character @relation("fromChar", fields: [fromId], references: [id], onDelete: Cascade)
  toChar      Character @relation("toChar", fields: [toId], references: [id], onDelete: Cascade)
  
  relation    String    // 关系描述
  type        String    // ally | enemy | family | lover | rival | mentor | other
  
  @@unique([fromId, toId])
}

// ========== 世界观系统 ==========

model WorldviewEntry {
  id          String   @id @default(cuid())
  novelId     String
  novel       Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)
  
  category    String   // geography | faction | magic | technology | culture | history | other
  name        String
  content     String   // 详细描述
  parentId    String?  // 父条目（支持层级）
  tags        String?  // 标签 (JSON array)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

// ========== 伏笔系统 ==========

model Foreshadow {
  id          String   @id @default(cuid())
  novelId     String
  novel       Novel    @relation(fields: [novelId], references: [id], onDelete: Cascade)
  
  name        String   // 伏笔名称
  description String   // 伏笔描述
  type        String   // major | minor | recurring
  status      String   @default("planned") // planned | planted | partially_recalled | recalled | abandoned
  plantPlan   String?  // 计划在哪里植入
  recallPlan  String?  // 计划在哪里回收
  
  links       ForeshadowLink[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ForeshadowLink {
  id             String     @id @default(cuid())
  foreshadowId   String
  foreshadow     Foreshadow @relation(fields: [foreshadowId], references: [id], onDelete: Cascade)
  chapterId      String
  chapter        Chapter    @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  
  type           String     // planted | recalled | hinted
  excerpt        String?    // 相关文本摘录
  
  @@unique([foreshadowId, chapterId, type])
}

// ========== 工作流状态 ==========

model WorkflowState {
  id          String   @id @default(cuid())
  novelId     String   @unique
  
  stageData   String   // 各阶段数据 (JSON: { stage1: {...}, stage2: {...}, ... })
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### 4.2 关键类型定义

```typescript
// src/types/index.ts

// 六阶段枚举
export enum Stage {
  BRAINSTORM = 1,      // 创意风暴
  SKELETON = 2,        // 骨架搭建
  VOLUME_PLAN = 3,     // 卷级规划
  CHAPTER_WRITE = 4,   // 逐章创作
  VOLUME_CLOSE = 5,    // 卷末收尾
  BOOK_CLOSE = 6,      // 全书收尾
}

// 记忆上下文（组装后）
export interface MemoryContext {
  gene: GeneMemorySummary;        // L1: 压缩版全书基因
  volume: VolumeMemorySummary;    // L2: 当前卷记忆
  arc: ArcMemorySummary;          // L3: 当前弧线
  chapters: ChapterMemory[];      // L4: 前N章摘要
  onDemand: OnDemandEntity[];     // L5: 按需检索结果
  totalTokens: number;            // 总 Token 估算
}

// 质量报告
export interface QualityReport {
  chapterId: string;
  overallScore: number;  // 0-100
  checks: {
    wordcount: WordcountResult;
    aiFlavor: AIFlavorResult;
    terminology: TerminologyResult;
    pacing: PacingResult;
    dialogue: DialogueResult;
    consistency: ConsistencyResult;
  };
  suggestions: string[];
  timestamp: Date;
}

// 伏笔审计结果
export interface ForeshadowAudit {
  total: number;
  planted: number;
  recalled: number;
  abandoned: number;
  overdue: Foreshadow[];     // 超期未回收
  orphaned: Foreshadow[];    // 计划但未植入
}
```

## 5. 技术选型详细理由

### 5.1 为什么选 Next.js 14 而非 Vite + Express

| 维度 | Next.js 14 | Vite + Express |
|------|-----------|----------------|
| 开发效率 | 全栈一体，热更新快 | 需要分别配置前后端 |
| 部署 | 单服务部署 | 双服务部署 |
| 类型安全 | tRPC 端到端类型 | 需额外 API 类型 |
| SSR | 内置 | 需手动配置 |
| 单人维护 | 低心智负担 | 中等心智负担 |

### 5.2 为什么选 SQLite 而非 PostgreSQL

| 维度 | SQLite | PostgreSQL |
|------|--------|------------|
| 运维 | 零运维，单文件 | 需维护数据库服务 |
| 部署 | 复制文件即可 | 需数据库实例 |
| 性能 | 单用户场景完全够用 | 过度设计 |
| 备份 | 复制 .db 文件 | 需 pg_dump |
| 迁移 | Prisma 未来可无缝切换 | - |

### 5.3 为什么选 Tiptap 而非 Slate/Lexical

| 维度 | Tiptap | Slate | Lexical |
|------|--------|-------|---------|
| 扩展性 | 优秀，插件体系 | 好，但 API 不稳定 | 好，但生态尚小 |
| 文档 | 完善 | 一般 | 在改善中 |
| AI 集成 | 友好，可流式插入 | 可以但复杂 | 可以但生态少 |
| 中文支持 | 好 | 一般 | 好 |
| 社区 | 活跃 | 活跃 | Meta 维护 |

### 5.4 为什么保留 Python 脚本

- 7 个现有质检脚本是成熟经过验证的工具
- 重写为 TypeScript 的 ROI 不高
- 通过 JSON 输出模式可以无缝对接 Web 应用
- 未来可渐进迁移，不阻塞 MVP

## 6. 安全考量

### 6.1 LLM API Key 管理
- API Key 存储在服务端 `.env`，前端不暴露
- tRPC 中间件统一处理 API 调用
- 支持多 Provider 配置

### 6.2 数据安全
- SQLite 文件权限控制
- 小说内容定期自动备份（文件系统级）
- 导出功能支持加密

### 6.3 输入验证
- tRPC input 使用 Zod schema 验证
- 防止 Prompt 注入（用户指令 sanitize）
- 文件路径安全（防止路径穿越）

## 7. 测试策略

### 7.1 单元测试
- **框架**: Vitest
- **覆盖**: Service 层业务逻辑、记忆组装器、Prompt 构建器
- **Mock**: Prisma Client (prisma-mock)、LLM API

### 7.2 集成测试
- **框架**: Vitest + supertest
- **覆盖**: tRPC Router 端到端调用、Python 脚本调用
- **数据库**: 使用内存 SQLite

### 7.3 E2E 测试
- **框架**: Playwright
- **覆盖**: 关键用户流程（创建小说、编辑章节、AI 生成）
- **优先级**: MVP 后再加

### 7.4 测试优先级
1. Memory Service（核心创新，必须可靠）
2. AI Service（Prompt 构建正确性）
3. Quality Service（Python 桥接可靠性）
4. 其他 CRUD Service（标准逻辑）

## 8. 迁移计划

### 8.1 从 Markdown 模板到结构化数据

```
现有:
  templates/*.md  →  引导用户填写 Markdown 模板

迁移后:
  数据库存储结构化数据
  templates/*.template.ts  →  TypeScript 模板，用于 AI Prompt 构建
  原始 Markdown 模板保留在 templates/ 作为参考
```

### 8.2 从 CLI 脚本到 Web API

```
现有:
  scripts/*.py  →  命令行运行

迁移后:
  scripts/*.py  →  增加 --format json 输出模式
  Quality Service  →  通过 child_process 调用，解析 JSON 结果
  Web UI  →  可视化展示质量报告
```

### 8.3 分阶段交付

```
MVP (Phase 1): 小说管理 + 章节编辑 + 基础 AI 生成
Phase 2: 六阶段工作流 + 分层记忆
Phase 3: 质量控制 + 人物/世界观/伏笔管理
Phase 4: 高级编辑器功能 + 导出
```
