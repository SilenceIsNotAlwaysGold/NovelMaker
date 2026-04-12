import { db } from '@/server/db'
import { NextRequest } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ novelId: string }> },
) {
  const { novelId } = await params
  const format = req.nextUrl.searchParams.get('format') ?? 'txt'

  const novel = await db.novel.findUniqueOrThrow({
    where: { id: novelId },
    include: {
      volumes: {
        orderBy: { sortOrder: 'asc' },
        include: {
          chapters: {
            orderBy: { sortOrder: 'asc' },
            select: { title: true, content: true },
          },
        },
      },
    },
  })

  const lines: string[] = []

  if (format === 'md') {
    // Markdown format with full structure
    lines.push(`# ${novel.title}`)
    lines.push('')
    if (novel.logline) {
      lines.push(`> ${novel.logline}`)
      lines.push('')
    }
    lines.push('---')
    lines.push('')

    for (const volume of novel.volumes) {
      lines.push(`## ${volume.title}`)
      lines.push('')

      for (const chapter of volume.chapters) {
        lines.push(`### ${chapter.title}`)
        lines.push('')
        lines.push(chapter.content)
        lines.push('')
      }
    }
  } else {
    // Plain text format - no markdown syntax
    lines.push(novel.title)
    lines.push('='.repeat(novel.title.length * 2))
    lines.push('')

    for (const volume of novel.volumes) {
      lines.push(volume.title)
      lines.push('-'.repeat(volume.title.length * 2))
      lines.push('')

      for (const chapter of volume.chapters) {
        lines.push(`    ${chapter.title}`)
        lines.push('')
        lines.push(chapter.content)
        lines.push('')
        lines.push('')
      }
    }
  }

  const text = lines.join('\n')
  const ext = format === 'md' ? 'md' : 'txt'
  const contentType = format === 'md' ? 'text/markdown' : 'text/plain'
  const filename = `${novel.title}.${ext}`

  return new Response(text, {
    headers: {
      'Content-Type': `${contentType}; charset=utf-8`,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
