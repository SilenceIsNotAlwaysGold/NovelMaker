import { streamText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { db } from '@/server/db'

export async function POST(req: Request) {
  const { chapterId } = await req.json()

  if (!chapterId) {
    return new Response('Missing chapterId', { status: 400 })
  }

  const chapter = await db.chapter.findUniqueOrThrow({
    where: { id: chapterId },
    include: { volume: { include: { novel: { include: { settings: true } } } } },
  })

  if (!chapter.content || chapter.content.trim().length < 100) {
    return Response.json({ summary: '' })
  }

  const settings = chapter.volume.novel.settings
  const modelId = settings?.llmModel ?? 'deepseek-chat'

  let model
  if (modelId.startsWith('claude') || modelId.startsWith('anthropic')) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    model = anthropic(modelId)
  } else {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL || undefined })
    model = openai(modelId)
  }

  const result = await streamText({
    model,
    prompt: `请为以下章节内容生成一段精炼的摘要（150-200字），用于长篇小说的记忆系统。
摘要应包含：本章核心事件、人物状态变化、推进的伏笔。不要包含评价性语言。

章节标题：${chapter.title}
章节内容：
${chapter.content}

摘要：`,
    maxOutputTokens: 300,
    temperature: 0.3,
  })

  let summary = ''
  for await (const chunk of result.textStream) {
    summary += chunk
  }

  // Save summary to chapter
  await db.chapter.update({
    where: { id: chapterId },
    data: { summary },
  })

  return Response.json({ summary })
}
