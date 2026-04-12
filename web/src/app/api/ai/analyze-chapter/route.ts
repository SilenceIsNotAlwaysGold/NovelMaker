import { streamText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { db } from '@/server/db'
import { buildContinuityAnalysisPrompt } from '@/server/services/memory.service'

export async function POST(req: Request) {
  const { chapterId } = await req.json()
  if (!chapterId) return new Response('Missing chapterId', { status: 400 })

  const chapter = await db.chapter.findUniqueOrThrow({
    where: { id: chapterId },
    include: { volume: { include: { novel: { include: { settings: true } } } } },
  })

  if (!chapter.content || chapter.content.trim().length < 200) {
    return Response.json({ success: false, reason: 'Content too short' })
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

  const prompt = buildContinuityAnalysisPrompt(chapter.content, chapter.title)

  const result = await streamText({
    model,
    prompt,
    maxOutputTokens: 500,
    temperature: 0.2,
  })

  let fullText = ''
  for await (const chunk of result.textStream) {
    fullText += chunk
  }

  // Parse JSON response
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = fullText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')

    const data = JSON.parse(jsonMatch[0])

    // Update chapter with continuity signals
    await db.chapter.update({
      where: { id: chapterId },
      data: {
        summary: data.summary || chapter.summary,
        endingMood: data.endingMood || '',
        unresolvedHooks: data.unresolvedHooks || '',
        nextChapterHint: data.nextChapterHint || '',
        activeCharacters: data.activeCharacters || '',
      },
    })

    // Update character states if provided
    if (data.characterStateUpdates && Array.isArray(data.characterStateUpdates)) {
      for (const update of data.characterStateUpdates) {
        if (update.name && update.state) {
          // Find character by name in this novel
          const character = await db.character.findFirst({
            where: { novelId: chapter.volume.novelId, name: update.name },
          })
          if (character) {
            await db.character.update({
              where: { id: character.id },
              data: { currentState: update.state },
            })
          }
        }
      }
    }

    return Response.json({ success: true, data })
  } catch {
    // Even if JSON parsing fails, store raw as summary
    await db.chapter.update({
      where: { id: chapterId },
      data: { summary: fullText.slice(0, 300) },
    })
    return Response.json({ success: false, rawText: fullText })
  }
}
