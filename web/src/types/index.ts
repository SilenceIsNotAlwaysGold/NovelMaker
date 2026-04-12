// Novel types
export type Genre =
  | 'xuanhuan'
  | 'dushi'
  | 'xuanyi'
  | 'yanqing'
  | 'wuxia'
  | 'kehuan'
  | 'lishi'

export type WorkflowStage =
  | 'brainstorm'
  | 'skeleton'
  | 'volume_planning'
  | 'chapter_writing'
  | 'volume_closing'
  | 'book_closing'

export type ForeshadowStatus = 'planted' | 'partial' | 'resolved' | 'abandoned'

export type ChapterStatus = 'outline' | 'draft' | 'revised' | 'final'

// Memory layer types
export interface MemoryContext {
  gene: string // L1: 全书基因
  volume: string // L2: 卷记忆
  arc: string // L3: 弧线记忆
  chapters: string // L4: 章节记忆
  onDemand: string[] // L5: 按需检索
  totalTokens: number
}

// AI operation types
export type AIOperation = 'continue' | 'rewrite' | 'expand' | 'summarize' | 'brainstorm'
