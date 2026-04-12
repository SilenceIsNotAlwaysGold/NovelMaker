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
  const { genre } = await req.json()

  const modelId = process.env.DEFAULT_MODEL ?? 'deepseek-chat'

  const prompt = `你是一位资深网文行业分析师，非常了解当前中国网络文学市场的热门作品和流行趋势。

${genre ? `用户想看【${genre}】类型的热门小说。` : '用户想看各类型的热门小说。'}

请推荐10本当前最火、最具代表性的网络小说（可以是近几年的爆款）。每本都要分析其成功的核心套路。

输出JSON数组格式：
[
  {
    "title": "小说名",
    "author": "作者",
    "genre": "xuanhuan/dushi/xuanyi/yanqing/wuxia/kehuan/lishi",
    "genreLabel": "玄幻/都市/悬疑/言情/武侠/科幻/历史",
    "platform": "起点/番茄/晋江/其他",
    "heat": "热度描述（如：起点月票榜TOP10）",
    "premise": "一句话核心设定（30字内）",
    "corePattern": "成功的核心套路（50字内，如：废物逆袭+宗门争霸+境界碾压）",
    "pacing": "节奏特点（如：前期快节奏打脸，中期宗门政治，后期大陆争霸）",
    "protagonist": "主角类型（如：隐忍型/热血型/智谋型/佛系型）",
    "sellingPoints": ["卖点1", "卖点2", "卖点3"],
    "targetAudience": "目标读者"
  }
]

要求：
1. 必须是真实存在的、有一定知名度的小说
2. 涵盖不同的套路和风格
3. 分析要具体，不要空泛
4. 排序按推荐程度

只输出JSON数组：`

  const result = streamText({
    model: getModel(modelId),
    prompt,
    maxOutputTokens: 4000,
    temperature: 0.7,
  })

  return result.toTextStreamResponse()
}
