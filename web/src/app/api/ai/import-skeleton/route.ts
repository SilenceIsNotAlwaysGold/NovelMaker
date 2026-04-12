import { db } from '@/server/db'

export async function POST(req: Request) {
  const data = await req.json()

  // Create novel
  const novel = await db.novel.create({
    data: {
      title: data.title || '未命名小说',
      genre: data.genre || 'xuanhuan',
      logline: data.logline || '',
      settings: { create: { llmModel: process.env.DEFAULT_MODEL ?? 'deepseek-chat' } },
      gene: { create: { content: data.gene || '' } },
      workflow: { create: {} },
    },
  })

  // Create characters
  if (data.characters && Array.isArray(data.characters)) {
    for (const ch of data.characters) {
      await db.character.create({
        data: {
          novelId: novel.id,
          name: ch.name || '未命名',
          role: ch.role || 'supporting',
          personality: ch.personality || '',
          background: ch.background || '',
          speechPattern: ch.speechPattern || '',
          verbalHabits: ch.verbalHabits || '',
          voiceSamples: ch.voiceSamples || '',
          behaviorPattern: ch.behaviorPattern || '',
        },
      })
    }
  }

  // Create worldview entries
  if (data.worldview && Array.isArray(data.worldview)) {
    for (const wv of data.worldview) {
      await db.worldviewEntry.create({
        data: {
          novelId: novel.id,
          category: wv.category || '其他',
          title: wv.title || '未命名',
          content: wv.content || '',
        },
      })
    }
  }

  // Create volumes and chapters
  if (data.volumes && Array.isArray(data.volumes)) {
    for (let vi = 0; vi < data.volumes.length; vi++) {
      const vol = data.volumes[vi]
      const volume = await db.volume.create({
        data: {
          novelId: novel.id,
          title: vol.title || `卷${vi + 1}`,
          summary: vol.summary || '',
          sortOrder: vi + 1,
        },
      })

      if (vol.chapters && Array.isArray(vol.chapters)) {
        for (let ci = 0; ci < vol.chapters.length; ci++) {
          const chTitle = typeof vol.chapters[ci] === 'string'
            ? vol.chapters[ci]
            : `第${String(ci + 1).padStart(2, '0')}章`
          await db.chapter.create({
            data: {
              volumeId: volume.id,
              title: chTitle,
              sortOrder: ci + 1,
            },
          })
        }
      }
    }
  }

  // Create foreshadows
  if (data.foreshadows && Array.isArray(data.foreshadows)) {
    for (const fs of data.foreshadows) {
      await db.foreshadow.create({
        data: {
          novelId: novel.id,
          title: fs.title || '未命名伏笔',
          description: fs.description || '',
          plantedAt: fs.plantedAt || '',
          targetResolve: fs.targetResolve || '',
          hintStrategy: fs.hintStrategy || '',
        },
      })
    }
  }

  return Response.json({ novelId: novel.id })
}
