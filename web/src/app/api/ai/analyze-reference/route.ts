import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'

function getModel(modelId: string) {
  if (modelId.startsWith('claude') || modelId.startsWith('anthropic')) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    return anthropic(modelId)
  }
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  })
  return openai(modelId)
}

export async function POST(req: Request) {
  const { referenceText, genre, userIdea } = await req.json()

  if (!referenceText && !genre) {
    return new Response('需要参考文本或类型', { status: 400 })
  }

  const modelId = process.env.DEFAULT_MODEL ?? 'deepseek-chat'

  const prompt = `你是一位资深网文策划编辑。根据以下信息，为一部全新的小说设计完整骨架。

${referenceText ? `【参考作品片段】（分析其风格、结构、爽点模式，但不要抄袭内容）\n${referenceText.slice(0, 5000)}\n` : ''}
${genre ? `【目标类型】${genre}` : ''}
${userIdea ? `【用户创意方向】${userIdea}` : ''}

请输出以下JSON（所有内容必须是原创的，只借鉴参考作品的结构和风格，不抄袭任何人物名/地名/情节）：

{
  "title": "小说名（4-8字，有记忆点）",
  "logline": "一句话核心卖点（30字内）",
  "genre": "${genre || '根据参考作品判断'}",
  "gene": "全书基因文档，包含：\\n【题材与风格】\\n【主角设定】姓名/性格/初始状态/终极目标\\n【金手指/特殊能力】\\n【核心冲突】\\n【力量体系/世界规则】\\n【全书节奏路线图】卷一到卷三的主线走向",
  "characters": [
    {
      "name": "角色名",
      "role": "protagonist/antagonist/supporting",
      "personality": "性格特点（具体，不要空泛）",
      "background": "背景故事",
      "speechPattern": "说话方式描述",
      "verbalHabits": "口头禅或语言习惯",
      "voiceSamples": "三句代表性台词，换行分隔",
      "behaviorPattern": "标志性行为模式"
    }
  ],
  "worldview": [
    {"category": "分类（地理/势力/功法等）", "title": "名称", "content": "描述"}
  ],
  "volumes": [
    {
      "title": "卷名",
      "summary": "本卷核心矛盾和走向（100字）",
      "chapters": ["第01章 章节名", "第02章 章节名", "...（8-15章）"]
    }
  ],
  "foreshadows": [
    {"title": "伏笔名", "description": "内容", "plantedAt": "埋设位置", "targetResolve": "计划回收位置"}
  ],
  "styleAnalysis": "从参考作品提取的风格特征总结（节奏/文风/爽点密度/叙事手法）"
}

要求：
1. 角色至少5个（1主角+1反派+3配角），每个都要有完整的声纹信息
2. 世界观至少5个条目
3. 至少规划3卷，每卷8-15章
4. 至少3条伏笔，要有明确的埋设和回收计划
5. 全书基因文档要详细，至少500字
6. 所有内容原创，只借鉴参考作品的模式和节奏

只输出JSON：`

  const result = streamText({
    model: getModel(modelId),
    prompt,
    maxOutputTokens: 8000,
    temperature: 0.85,
  })

  return result.toTextStreamResponse()
}
