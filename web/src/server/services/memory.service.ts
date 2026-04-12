import { db } from '../db'

export interface MemoryContext {
  layers: {
    l1Gene: string
    l2Volume: string
    l3Arc: string
    l4Chapters: string
    l5OnDemand: string[]
  }
  assembled: string
  tokenEstimate: number
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 1.5)
}

function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = Math.floor(maxTokens * 1.5)
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '…'
}

/**
 * Deep memory assembly for chapter writing.
 *
 * Unlike simple summary-based context, this system provides:
 * 1. Character voice prints (how each character speaks)
 * 2. Chapter continuity (mood, unresolved hooks, active characters)
 * 3. Active foreshadow reminders (what to hint at / resolve)
 * 4. Character state tracking (emotional state, location, goals)
 * 5. Pacing guidance (what rhythm this chapter should have)
 */
export async function assembleMemoryContext(
  novelId: string,
  chapterId: string,
  tokenBudget = 6000,
): Promise<MemoryContext> {
  const chapter = await db.chapter.findUniqueOrThrow({
    where: { id: chapterId },
    include: { volume: true, arc: true },
  })

  // ── L1: Gene Memory (always loaded, ~500 tokens) ──
  const gene = await db.gene.findUnique({ where: { novelId } })
  const l1Gene = gene?.content
    ? `【全书基因】\n${truncateToTokens(gene.content, 500)}`
    : ''

  // ── L2: Volume Memory (~800 tokens) ──
  const l2Volume = chapter.volume.memory
    ? `【卷记忆 · ${chapter.volume.title}】\n${truncateToTokens(chapter.volume.memory, 800)}`
    : ''

  // ── L3: Arc Memory (~600 tokens) ──
  const l3Arc = chapter.arc?.memory
    ? `【弧线记忆 · ${chapter.arc.title}】\n${truncateToTokens(chapter.arc.memory, 600)}`
    : ''

  // ── L4: Chapter Continuity (deep version, ~1800 tokens) ──
  const prevChapters = await db.chapter.findMany({
    where: {
      volumeId: chapter.volumeId,
      sortOrder: { lt: chapter.sortOrder },
    },
    orderBy: { sortOrder: 'desc' },
    take: 3,
    select: {
      title: true,
      summary: true,
      content: true,
      endingMood: true,
      unresolvedHooks: true,
      nextChapterHint: true,
      activeCharacters: true,
    },
  })

  let l4Chapters = ''
  if (prevChapters.length > 0) {
    // Summaries of last 3 chapters
    const summaries = prevChapters
      .reverse()
      .map((ch) => `${ch.title}: ${ch.summary || '(无摘要)'}`)
      .join('\n')
    l4Chapters = `【前文摘要】\n${truncateToTokens(summaries, 600)}`

    // Last chapter's tail for prose continuity
    const lastCh = prevChapters[prevChapters.length - 1]
    if (lastCh?.content) {
      l4Chapters += `\n\n【上一章结尾（续写衔接用）】\n${lastCh.content.slice(-800)}`
    }

    // Chapter continuity signals
    if (lastCh?.endingMood || lastCh?.unresolvedHooks || lastCh?.nextChapterHint) {
      l4Chapters += '\n\n【章节衔接信号】'
      if (lastCh.endingMood) l4Chapters += `\n上章结尾情绪基调: ${lastCh.endingMood}`
      if (lastCh.unresolvedHooks) l4Chapters += `\n未解决的悬念/冲突: ${lastCh.unresolvedHooks}`
      if (lastCh.nextChapterHint) l4Chapters += `\n本章应当处理: ${lastCh.nextChapterHint}`
      if (lastCh.activeCharacters) l4Chapters += `\n场景中的角色: ${lastCh.activeCharacters}`
    }
  }

  if (chapter.outline) {
    l4Chapters += `\n\n【本章大纲】\n${chapter.outline}`
  }

  // ── L5: On-Demand Deep Context ──
  const usedTokens = estimateTokens(l1Gene) + estimateTokens(l2Volume) +
    estimateTokens(l3Arc) + estimateTokens(l4Chapters)
  const remainingTokens = Math.max(tokenBudget - usedTokens, 800)
  const l5Parts: string[] = []
  let l5Used = 0

  // 5a. Character Voice Prints (protagonist + key characters)
  const characters = await db.character.findMany({
    where: { novelId },
    orderBy: [{ role: 'asc' }],
    take: 6,
    select: {
      name: true,
      role: true,
      personality: true,
      speechPattern: true,
      verbalHabits: true,
      voiceSamples: true,
      behaviorPattern: true,
      currentState: true,
    },
  })

  if (characters.length > 0) {
    const charLines = characters.map((c) => {
      let line = `◆ ${c.name}（${roleLabel(c.role)}）`
      if (c.personality) line += `\n  性格: ${c.personality}`
      if (c.speechPattern) line += `\n  说话方式: ${c.speechPattern}`
      if (c.verbalHabits) line += `\n  口头禅/习惯: ${c.verbalHabits}`
      if (c.voiceSamples) {
        const samples = c.voiceSamples.split('\n').filter(Boolean).slice(0, 3)
        if (samples.length > 0) line += `\n  对话样本:\n    ${samples.map(s => `"${s.trim()}"`).join('\n    ')}`
      }
      if (c.behaviorPattern) line += `\n  行为模式: ${c.behaviorPattern}`
      if (c.currentState) line += `\n  当前状态: ${c.currentState}`
      return line
    }).join('\n\n')

    const charSection = `【角色声纹 · 写对话时严格模仿每个角色的说话方式】\n${charLines}`
    const charTokens = estimateTokens(charSection)
    if (l5Used + charTokens <= remainingTokens) {
      l5Parts.push(charSection)
      l5Used += charTokens
    }
  }

  // 5b. Active Foreshadow Reminders
  const foreshadows = await db.foreshadow.findMany({
    where: { novelId, status: { in: ['planted', 'partial'] } },
    orderBy: { urgency: 'desc' },
    take: 5,
    select: {
      title: true,
      description: true,
      status: true,
      plantedAt: true,
      hintStrategy: true,
      targetResolve: true,
      urgency: true,
    },
  })

  if (foreshadows.length > 0) {
    const fsLines = foreshadows.map((f) => {
      const icon = f.urgency >= 2 ? '🔴紧急' : f.urgency >= 1 ? '🟡待铺垫' : '🔵已埋设'
      let line = `${icon} ${f.title}（埋于${f.plantedAt}）`
      if (f.description) line += `\n  内容: ${f.description}`
      if (f.hintStrategy) line += `\n  铺垫策略: ${f.hintStrategy}`
      if (f.targetResolve) line += `\n  计划回收: ${f.targetResolve}`
      return line
    }).join('\n\n')

    const fsSection = `【伏笔提醒 · 在合适时机自然地铺垫或回收以下伏笔】\n${fsLines}`
    const fsTokens = estimateTokens(fsSection)
    if (l5Used + fsTokens <= remainingTokens) {
      l5Parts.push(fsSection)
      l5Used += fsTokens
    }
  }

  // 5c. Pacing guidance based on chapter position
  const totalChaptersInVolume = await db.chapter.count({
    where: { volumeId: chapter.volumeId },
  })
  const chapterPosition = chapter.sortOrder
  const pacingHint = getPacingGuidance(chapterPosition, totalChaptersInVolume)
  if (pacingHint) {
    const pacingSection = `【本章节奏指引】\n${pacingHint}`
    const pacingTokens = estimateTokens(pacingSection)
    if (l5Used + pacingTokens <= remainingTokens) {
      l5Parts.push(pacingSection)
      l5Used += pacingTokens
    }
  }

  // Assemble
  const parts = [l1Gene, l2Volume, l3Arc, l4Chapters, ...l5Parts].filter(Boolean)
  const assembled = parts.join('\n\n───────────\n\n')

  return {
    layers: { l1Gene, l2Volume, l3Arc, l4Chapters, l5OnDemand: l5Parts },
    assembled,
    tokenEstimate: estimateTokens(assembled),
  }
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    protagonist: '主角',
    antagonist: '反派',
    supporting: '配角',
    minor: '龙套',
  }
  return map[role] ?? role
}

/**
 * Pacing guidance based on chapter position within volume.
 * Implements the rhythm model: tension waves with escalating peaks.
 */
function getPacingGuidance(chapterPos: number, totalChapters: number): string {
  // Determine position ratio
  const ratio = totalChapters > 1 ? (chapterPos - 1) / (totalChapters - 1) : 0

  // Is this a "peak" chapter? (every 3-5 chapters)
  const isPeak = chapterPos % 4 === 0 || chapterPos === totalChapters

  if (chapterPos === 1) {
    return '这是本卷第一章。需要强力开场：使用开篇钩子技巧，在前20%建立核心冲突，' +
      '让读者立刻进入状态。不要缓慢铺垫，直接进入紧张场景。'
  }

  if (ratio >= 0.9) {
    return '这是本卷收尾章节。需要：①回收本卷主要伏笔 ②大高潮场景（Boss战/重大反转/蜕变）' +
      '③留下通往下一卷的悬念 ④角色状态做阶段性总结。'
  }

  if (ratio >= 0.7) {
    return '进入本卷高潮区间。张力应持续升高：冲突升级、真相逐步揭示、角色面临最大考验。' +
      '不要在这里安排日常过渡场景。'
  }

  if (isPeak) {
    return '这是一个爽点章节（每3-5章一个小高潮）。安排一个明确的爽点：打脸/突破/获宝/揭秘。' +
      '爽感要具体、有铺垫、有对比（先压后扬）。'
  }

  if (ratio < 0.15) {
    return '这是卷初章节，建立本卷核心矛盾、引入新角色或新环境。可以稍缓但必须有小冲突，' +
      '不超过2章纯铺垫。'
  }

  // Default: development chapter
  return '发展推进章节。要求：①至少一个小冲突或矛盾 ②推进至少一条叙事线 ' +
    '③适当铺垫伏笔 ④章末留悬念。避免纯日常流水账。'
}

/**
 * Generate chapter continuity context after saving.
 * Called via AI to analyze the chapter and extract continuity signals.
 */
export function buildContinuityAnalysisPrompt(chapterContent: string, chapterTitle: string): string {
  return `分析以下章节，提取续写所需的衔接信息。用JSON格式输出。

章节标题：${chapterTitle}
章节内容：
${chapterContent}

请输出以下JSON（每个字段用中文填写，简洁精确）：
{
  "summary": "本章核心事件摘要（150字以内）",
  "endingMood": "结尾情绪基调（一个词：紧张/温馨/压抑/热血/悬疑/悲伤/平静）",
  "unresolvedHooks": "本章留下的未解决悬念或冲突（逗号分隔）",
  "nextChapterHint": "下一章应当优先处理的事项",
  "activeCharacters": "章末场景中在场的角色及其状态（格式：角色名-状态）",
  "characterStateUpdates": [
    {"name": "角色名", "state": "该角色在本章后的情感/位置/目标变化"}
  ]
}

只输出JSON，不要其他内容：`
}

/**
 * Get memory context summary for display in the editor sidebar.
 */
export async function getMemoryPreview(novelId: string, chapterId: string) {
  const context = await assembleMemoryContext(novelId, chapterId)
  return {
    layers: {
      gene: { content: context.layers.l1Gene, tokens: estimateTokens(context.layers.l1Gene) },
      volume: { content: context.layers.l2Volume, tokens: estimateTokens(context.layers.l2Volume) },
      arc: { content: context.layers.l3Arc, tokens: estimateTokens(context.layers.l3Arc) },
      chapters: { content: context.layers.l4Chapters, tokens: estimateTokens(context.layers.l4Chapters) },
      onDemand: context.layers.l5OnDemand.map((text) => ({
        content: text,
        tokens: estimateTokens(text),
      })),
    },
    totalTokens: context.tokenEstimate,
  }
}
