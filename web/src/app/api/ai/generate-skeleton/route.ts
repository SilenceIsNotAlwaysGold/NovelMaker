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

function planStructure(totalWords: number) {
  const chapterWords = 4000 // 每章约4000字
  const totalChapters = Math.round(totalWords / chapterWords)
  const chaptersPerVolume = Math.min(Math.max(Math.round(totalChapters / Math.ceil(totalChapters / 15)), 8), 20)
  const volumeCount = Math.max(1, Math.ceil(totalChapters / chaptersPerVolume))

  return { totalChapters, chaptersPerVolume, volumeCount }
}

export async function POST(req: Request) {
  const { totalWords, theme, genre } = await req.json()

  if (!theme) {
    return new Response('需要主题描述', { status: 400 })
  }

  const wordCount = Number(totalWords) || 300000
  const { totalChapters, chaptersPerVolume, volumeCount } = planStructure(wordCount)
  const modelId = process.env.DEFAULT_MODEL ?? 'deepseek-chat'

  const prompt = `你是一位资深网文策划编辑，擅长从一个主题出发推演出完整的长篇小说框架。

【用户需求】
- 目标字数：约 ${(wordCount / 10000).toFixed(0)} 万字
- 主题/创意：${theme}
${genre ? `- 目标类型：${genre}` : '- 类型：根据主题自动判断最合适的类型'}

【结构规划】
根据 ${(wordCount / 10000).toFixed(0)} 万字的体量，自动拆分为：
- ${volumeCount} 卷
- 每卷约 ${chaptersPerVolume} 章
- 共约 ${totalChapters} 章
- 每章约 4000 字

请输出以下 JSON：

{
  "title": "小说名（4-8字，有记忆点）",
  "logline": "一句话核心卖点（30字内）",
  "genre": "xuanhuan/dushi/xuanyi/yanqing/wuxia/kehuan/lishi",
  "gene": "全书基因文档（至少800字），包含：\\n【题材与风格】\\n【主角设定】姓名/性格/初始状态/终极目标\\n【金手指/特殊能力】\\n【核心冲突】\\n【力量体系/世界规则】\\n【全书节奏路线图】每卷的主线走向和高潮点",
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
    {"category": "分类（地理/势力/功法/种族/历史/物品）", "title": "名称", "content": "详细描述"}
  ],
  "volumes": [
    {
      "title": "卷名",
      "summary": "本卷核心矛盾、主线发展、高潮事件（150字）",
      "chapters": ["第01章 章节名 - 一句话概要", "第02章 章节名 - 一句话概要", "..."]
    }
  ],
  "foreshadows": [
    {"title": "伏笔名", "description": "内容", "plantedAt": "埋设位置（如：卷一第3章）", "targetResolve": "计划回收位置"}
  ],
  "structureSummary": "整体结构说明：总体量、节奏设计、每卷定位（200字）"
}

要求：
1. 角色至少6个（1主角+1-2反派+3-4配角），每个都要有完整声纹
2. 世界观至少6个条目，覆盖不同分类
3. 严格按 ${volumeCount} 卷规划，每卷 ${chaptersPerVolume} 章左右，每章标题后带一句话概要
4. 伏笔至少 ${Math.max(3, volumeCount)} 条，跨卷埋设和回收
5. 全书基因文档要详细，体现 ${(wordCount / 10000).toFixed(0)} 万字体量的深度
6. 节奏要有起伏：开篇黄金三章抓人、每卷有小高潮、全书有大高潮
7. 从主题"${theme}"出发推演，所有设定要逻辑自洽

只输出JSON：`

  const result = streamText({
    model: getModel(modelId),
    prompt,
    maxOutputTokens: 16000,
    temperature: 0.85,
  })

  return result.toTextStreamResponse()
}
