import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { db } from '../db'
import { assembleMemoryContext } from './memory.service'
import { buildWritingSystemPrompt, buildExpansionPrompt, hookTechniques, pacingGuide } from './writing-knowledge'

type AIOperation = 'continue' | 'rewrite' | 'expand' | 'summarize' | 'brainstorm' | 'polish_dialogue' | 'scene_analysis'

function getModel(modelId: string) {
  if (modelId.startsWith('claude') || modelId.startsWith('anthropic')) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    return anthropic(modelId)
  }
  // OpenAI-compatible (supports DeepSeek, OpenAI, etc. via OPENAI_BASE_URL)
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  })
  return openai(modelId)
}

async function getNovelSettings(novelId: string) {
  const settings = await db.novelSettings.findUnique({ where: { novelId } })
  return {
    model: settings?.llmModel ?? process.env.DEFAULT_MODEL ?? 'deepseek-chat',
    maxTokens: settings?.maxTokens ?? 4096,
    temperature: settings?.temperature ?? 0.8,
    tokenBudget: settings?.tokenBudget ?? 6000,
  }
}

async function getNovelGenre(novelId: string): Promise<string> {
  const novel = await db.novel.findUniqueOrThrow({
    where: { id: novelId },
    select: { genre: true },
  })
  return novel.genre
}

function buildPrompt(
  operation: AIOperation,
  context: string,
  selectedText: string,
  genre: string,
  instruction?: string,
): string {
  switch (operation) {
    case 'continue':
      return `基于以下上下文信息和已有内容，继续创作下一段。

要求：
- 自然衔接已有内容，不重复
- 用动作和对话推进，不用旁白概述
- 保持该场景的紧张感或情感基调
- 如果接近章节结尾，使用章末悬念技巧
- 每个角色说话必须有各自的语言风格

${hookTechniques.ending}

${context}

---
已有内容（最后一段）：
${selectedText}

直接续写，不要加任何解释或标注：`

    case 'rewrite':
      return `改写下面这段文字，核心情节不变，大幅提升文笔质量。
${instruction ? `特别要求：${instruction}` : ''}

改写方向：
- 抽象情感→具体动作和细节（"他很紧张"→写出紧张的具体表现）
- 平铺直叙→有节奏的长短句交替
- 通用描写→符合角色个性的独特表达
- 如果有对话，确保每个角色声音不同
- 删除所有AI味词汇（然而、不禁、仿佛、宛如等）

${context}

---
需要改写的原文：
${selectedText}

改写后（直接输出，不加说明）：`

    case 'expand':
      return `扩写下面这段文字，使内容更丰富饱满。

${buildExpansionPrompt()}

选择最合适的1-2种技巧扩写，要求：
- 新增内容必须服务于角色塑造、氛围营造或情节推进
- 不加无意义的风景描写或心理独白
- 感官描写选2-3种（视觉+听觉或触觉+嗅觉），不要五感齐上
- 如果扩写对话，加潜台词和动作beats

${context}

---
需要扩写的段落：
${selectedText}

扩写后（直接输出，不加说明）：`

    case 'summarize':
      return `为以下章节生成记忆摘要（150-200字），用于长篇小说写作的上下文记忆。

摘要必须包含：
1. 本章核心事件（一句话）
2. 主要角色的状态变化
3. 推进或埋设的伏笔
4. 场景/地点转换
5. 情感基调

不要包含评价性语言，只记录事实。

章节内容：
${selectedText}

摘要：`

    case 'polish_dialogue':
      return `你是一位专业的对话打磨师。请根据角色声纹信息，逐句检查并优化以下对话片段。

核心原则：
1. 每个角色的语言必须有独特辨识度——遮住名字也能猜出是谁在说话
2. 对话要有潜台词（角色嘴上说的≠心里想的）
3. 用动作 beats 代替"他说/她说"等对话标签
4. 删除所有不自然的书面语（"我认为""事实上""从某种意义上"）
5. 加入角色特有的口头禅、断句方式、语气词
6. 对话要推进情节或揭示性格，删除废话和信息灌输式对话

${context}

---
需要打磨的对话：
${selectedText}

请输出：
1. 首先列出每个角色的声纹要点（如果上下文有角色信息）
2. 逐段打磨后的对话（直接输出可替换原文的版本）
3. 简要说明改动理由（不超过3行）

打磨后的对话：`

    case 'scene_analysis':
      return `你是一位资深小说编辑，请对以下章节/片段进行场景结构分析。

按以下 beat 拆解：
1. 【开篇钩子】前200字是否有效抓住读者？用了什么技巧？
2. 【冲突建立】核心矛盾是什么？何时出现？
3. 【张力递进】紧张感是否逐步升级？有无泄气点？
4. 【高潮时刻】本章最强爽点/情感冲击点在哪？
5. 【结尾悬念】结尾是否留钩子？能否驱动翻页欲？
6. 【节奏评估】快慢交替是否合理？有无拖沓段落？
7. 【角色表现】主要角色是否有目标-行动-后果的完整弧？

${context}

---
章节内容：
${selectedText}

请输出结构化分析，每个 beat 给出评分（A/B/C/D）和具体建议。最后给出整体评分和最需要改进的TOP3问题。

分析结果：`

    case 'brainstorm':
      return `基于以下小说设定信息，进行创意头脑风暴。
${instruction ? `方向：${instruction}` : ''}

${pacingGuide}

${context}

请提供5个具体的创意方向，每个包含：
1. 核心冲突/事件（一句话）
2. 涉及的角色和他们的动机
3. 可能的反转或意外
4. 对整体故事线的推进作用
5. 适合埋设的伏笔

创意方向：`

    default:
      return selectedText
  }
}

export async function generateNovelText(params: {
  novelId: string
  chapterId?: string
  operation: AIOperation
  selectedText: string
  instruction?: string
}) {
  const { novelId, chapterId, operation, selectedText, instruction } = params
  const settings = await getNovelSettings(novelId)
  const genre = await getNovelGenre(novelId)

  // Build genre-aware system prompt
  const systemPrompt = buildWritingSystemPrompt(genre)

  // Assemble memory context if we have a chapter
  let contextText = ''
  if (chapterId) {
    const memory = await assembleMemoryContext(novelId, chapterId, settings.tokenBudget)
    contextText = memory.assembled
  }

  const prompt = buildPrompt(operation, contextText, selectedText, genre, instruction)

  const result = streamText({
    model: getModel(settings.model),
    system: systemPrompt,
    prompt,
    maxOutputTokens: settings.maxTokens,
    temperature: settings.temperature,
  })

  return result
}
