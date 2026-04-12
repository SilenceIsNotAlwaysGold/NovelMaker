import { router } from '../trpc'
import { novelRouter } from './novel'
import { volumeRouter } from './volume'
import { chapterRouter } from './chapter'
import { characterRouter } from './character'
import { worldviewRouter } from './worldview'
import { foreshadowRouter } from './foreshadow'
import { memoryRouter } from './memory'
import { workflowRouter } from './workflow'
import { qualityRouter } from './quality'
import { settingsRouter } from './settings'
import { statsRouter } from './stats'

export const appRouter = router({
  novel: novelRouter,
  volume: volumeRouter,
  chapter: chapterRouter,
  character: characterRouter,
  worldview: worldviewRouter,
  foreshadow: foreshadowRouter,
  memory: memoryRouter,
  workflow: workflowRouter,
  quality: qualityRouter,
  settings: settingsRouter,
  stats: statsRouter,
})

export type AppRouter = typeof appRouter
