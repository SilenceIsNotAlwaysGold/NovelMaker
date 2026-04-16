import { z } from 'zod'
import { router, publicProcedure } from '../trpc'
import { runQualityCheck, checkCharacterVoice } from '../services/quality.service'
import type { CharacterVoiceProfile, QualityReport } from '../services/quality.service'

export const qualityRouter = router({
  checkChapter: publicProcedure
    .input(z.object({ chapterId: z.string() }))
    .query(async ({ ctx, input }) => {
      const chapter = await ctx.db.chapter.findUniqueOrThrow({
        where: { id: input.chapterId },
        include: {
          volume: {
            include: {
              novel: { include: { settings: true } },
            },
          },
        },
      })

      const settings = chapter.volume.novel.settings

      // Load character voice profiles for voice consistency check
      const characters = await ctx.db.character.findMany({
        where: { novelId: chapter.volume.novelId },
        orderBy: [{ role: 'asc' }],
        take: 8,
        select: { name: true, speechPattern: true, verbalHabits: true, personality: true },
      })

      return runQualityCheck(chapter.content, {
        min: settings?.chapterMinLen ?? 3000,
        max: settings?.chapterMaxLen ?? 5000,
        characters,
      })
    }),

  checkText: publicProcedure
    .input(z.object({ text: z.string(), min: z.number().optional(), max: z.number().optional() }))
    .mutation(async ({ input }) => {
      return runQualityCheck(input.text, { min: input.min, max: input.max })
    }),

  // Batch quality audit for an entire volume
  auditVolume: publicProcedure
    .input(z.object({ volumeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const volume = await ctx.db.volume.findUniqueOrThrow({
        where: { id: input.volumeId },
        include: {
          novel: { include: { settings: true } },
          chapters: {
            orderBy: { sortOrder: 'asc' },
            select: { id: true, title: true, content: true, sortOrder: true, status: true },
          },
        },
      })

      const characters = await ctx.db.character.findMany({
        where: { novelId: volume.novelId },
        orderBy: [{ role: 'asc' }],
        take: 8,
        select: { name: true, speechPattern: true, verbalHabits: true, personality: true },
      })

      const settings = volume.novel.settings
      const chapterReports: Array<{
        chapterId: string
        title: string
        status: string
        report: QualityReport
      }> = []

      for (const ch of volume.chapters) {
        if (!ch.content || ch.content.replace(/<[^>]*>/g, '').trim().length < 100) continue
        const report = runQualityCheck(ch.content, {
          min: settings?.chapterMinLen ?? 3000,
          max: settings?.chapterMaxLen ?? 5000,
          characters,
        })
        chapterReports.push({ chapterId: ch.id, title: ch.title, status: ch.status, report })
      }

      // Aggregate stats
      const scores = chapterReports.map((r) => r.report.score)
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
      const weakChapters = chapterReports
        .filter((r) => r.report.score < 50)
        .map((r) => ({ title: r.title, score: r.report.score, topIssue: r.report.suggestions[0]?.problem ?? '' }))
      const strongChapters = chapterReports
        .filter((r) => r.report.score >= 80)
        .map((r) => r.title)

      // Cross-chapter repetition: collect all suggestions to find systemic issues
      const issueFrequency = new Map<string, number>()
      for (const cr of chapterReports) {
        for (const s of cr.report.suggestions) {
          const key = s.category + ':' + s.problem.slice(0, 20)
          issueFrequency.set(key, (issueFrequency.get(key) || 0) + 1)
        }
      }
      const systemicIssues = [...issueFrequency.entries()]
        .filter(([, count]) => count >= Math.ceil(chapterReports.length * 0.5))
        .map(([key, count]) => ({ issue: key.split(':')[1], category: key.split(':')[0], affectedChapters: count }))
        .sort((a, b) => b.affectedChapters - a.affectedChapters)

      return {
        volumeTitle: volume.title,
        totalChapters: volume.chapters.length,
        analyzedChapters: chapterReports.length,
        avgScore,
        weakChapters,
        strongChapters,
        systemicIssues,
        chapterReports,
      }
    }),

  // Foreshadow audit
  auditForeshadows: publicProcedure
    .input(z.object({ novelId: z.string() }))
    .query(async ({ ctx, input }) => {
      const foreshadows = await ctx.db.foreshadow.findMany({
        where: { novelId: input.novelId },
        include: { links: true },
      })

      const stats = {
        total: foreshadows.length,
        planted: foreshadows.filter((f) => f.status === 'planted').length,
        partial: foreshadows.filter((f) => f.status === 'partial').length,
        resolved: foreshadows.filter((f) => f.status === 'resolved').length,
        abandoned: foreshadows.filter((f) => f.status === 'abandoned').length,
      }

      const canComplete = stats.planted === 0 && stats.partial === 0

      // Overdue foreshadow detection
      const chapters = await ctx.db.chapter.findMany({
        where: { volume: { novelId: input.novelId } },
        select: { title: true, sortOrder: true, volumeId: true },
        orderBy: { sortOrder: 'asc' },
      })
      const chapterTitles = new Set(chapters.map((c) => c.title))

      const overdueItems = foreshadows
        .filter((f) => f.status === 'planted' && f.targetResolve)
        .filter((f) => {
          // Check if target resolution chapter has passed
          const targetChapter = chapters.find((c) => c.title === f.targetResolve)
          if (!targetChapter) return false
          const latestChapter = chapters[chapters.length - 1]
          return latestChapter && targetChapter.sortOrder <= latestChapter.sortOrder
        })
        .map((f) => ({ title: f.title, targetResolve: f.targetResolve, urgency: f.urgency }))

      return {
        stats,
        canComplete,
        overdueItems,
        foreshadows: foreshadows.map((f) => ({
          id: f.id,
          title: f.title,
          status: f.status,
          plantedAt: f.plantedAt,
          resolvedAt: f.resolvedAt,
          targetResolve: f.targetResolve,
          urgency: f.urgency,
          linkCount: f.links.length,
        })),
      }
    }),
})
