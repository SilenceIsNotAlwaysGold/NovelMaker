/**
 * Quality checking service - comprehensive novel writing quality analysis.
 * Performs: word count, AI-flavor detection, scene structure, dialogue quality, pacing.
 */

export interface QualityReport {
  wordCount: WordCountResult
  aiFlavor: AIFlavorResult
  sceneStructure: SceneStructureResult
  dialogueQuality: DialogueQualityResult
  overall: 'pass' | 'warn' | 'fail'
  score: number // 0-100
}

export interface WordCountResult {
  count: number
  min: number
  max: number
  status: 'pass' | 'warn' | 'fail'
  message: string
}

export interface AIFlavorResult {
  score: number // 0-100, lower is better
  level: 'excellent' | 'fair' | 'poor' | 'severe'
  issues: AIFlavorIssue[]
}

export interface AIFlavorIssue {
  type: string
  pattern: string
  count: number
  examples: string[]
}

export interface SceneStructureResult {
  hasOpeningHook: boolean
  hasConflict: boolean
  hasCliffhanger: boolean
  beatScore: number // 0-100
  issues: string[]
}

export interface DialogueQualityResult {
  dialogueRatio: number // 0-1
  avgDialogueLength: number
  hasActionBeats: boolean
  issues: string[]
}

// ── AI-flavor blacklist words (common AI writing tells in Chinese) ──
const aiBlacklist = [
  // 古风滥用
  '然而', '不禁', '仿佛', '宛如', '犹如', '恍若',
  '霎时间', '刹那间', '须臾', '转瞬',
  // 程度副词滥用
  '不由自主', '情不自禁', '不由得',
  '深深地', '缓缓地', '轻轻地', '默默地', '静静地',
  // 内心戏泛滥
  '内心深处', '心中暗想', '暗自思忖', '心中不由得',
  // 说明文口吻
  '显而易见', '毋庸置疑', '不言而喻',
  '值得一提', '有趣的是', '令人惊讶的是',
  // 量词滥用
  '一丝', '一抹', '一缕',
  // 言情模板词
  '眼眸', '唇角', '眸光', '薄唇',
  '勾勒', '氤氲', '斑驳', '璀璨',
  // 时间标记滥用
  '此刻', '这一刻', '那一刻',
  // 情感直述（应该用动作展示）
  '心中一暖', '心中一紧', '心中一沉',
  '眼中闪过一丝', '眼底闪过',
  // AI 八股套路
  '与此同时', '正当此时', '就在这时',
  '不得不说', '说实话', '坦白说',
]

// "Tell not show" patterns — 情感直述而非动作展示
const tellPatterns = [
  /[他她它](?:感到|觉得|感觉|意识到|明白|知道|心想|暗想)(?:了)?/g,
  /心中(?:一[惊喜怒悲暖凉凛沉]|涌起|升起|泛起|充满)/g,
  /脸上(?:露出|浮现|闪过|掠过|写满)(?:了)?/g,
  /眼[中里](?:闪过|浮现|透出|带着|充满|流露)/g,
  /语气中(?:带着|充满|透着|满是)/g,
]

// Transition word overuse
const transitionWords = [
  '然而', '但是', '不过', '可是', '尽管', '虽然',
  '因此', '所以', '于是', '随即', '接着', '随后',
]

// ── 过度修饰检测 ──
const overDecoration = [
  /(?:美丽|漂亮|好看)(?:的|地)/g,
  /(?:巨大|庞大|宽广)(?:的|地)/g,
  /如同.{2,8}一般/g,
  /(?:仿佛|宛如|犹如).{2,12}(?:一样|一般|似的)/g,
]

// ── 信息灌输式对话检测 ──
const infoDialoguePatterns = [
  /"[^"]{80,}"/g, // 超长对话（80字以上一口气说完）
  /正如你所知|你应该知道|众所周知/g, // "As you know" syndrome
]

export function checkWordCount(
  content: string,
  min = 3000,
  max = 5000,
): WordCountResult {
  const count = content.replace(/\s/g, '').length

  if (count === 0) {
    return { count, min, max, status: 'fail', message: '章节为空' }
  }
  if (count < min) {
    return { count, min, max, status: 'warn', message: `字数不足，当前 ${count} 字，最低要求 ${min} 字` }
  }
  if (count > max) {
    return { count, min, max, status: 'warn', message: `字数偏多，当前 ${count} 字，建议不超过 ${max} 字` }
  }
  return { count, min, max, status: 'pass', message: `字数合格：${count} 字` }
}

export function checkAIFlavor(content: string): AIFlavorResult {
  const issues: AIFlavorIssue[] = []
  let totalScore = 0

  // Check blacklist words
  for (const word of aiBlacklist) {
    const regex = new RegExp(word, 'g')
    const matches = content.match(regex)
    if (matches && matches.length > 0) {
      totalScore += matches.length * 2
      issues.push({
        type: 'blacklist',
        pattern: word,
        count: matches.length,
        examples: findExamples(content, word, 2),
      })
    }
  }

  // Check "tell not show" patterns
  for (const pattern of tellPatterns) {
    const regex = new RegExp(pattern.source, pattern.flags)
    const matches = content.match(regex)
    if (matches && matches.length > 2) {
      totalScore += (matches.length - 2) * 3
      issues.push({
        type: 'tell_not_show',
        pattern: '情感直述（应改为动作展示）',
        count: matches.length,
        examples: matches.slice(0, 3),
      })
    }
  }

  // Check transition word overuse
  let transitionCount = 0
  for (const word of transitionWords) {
    const matches = content.match(new RegExp(word, 'g'))
    if (matches) transitionCount += matches.length
  }
  if (transitionCount > 10) {
    totalScore += (transitionCount - 10) * 1
    issues.push({
      type: 'transition_overuse',
      pattern: '转折词过多',
      count: transitionCount,
      examples: transitionWords.filter((w) => content.includes(w)).slice(0, 5),
    })
  }

  // Check over-decoration
  for (const pattern of overDecoration) {
    const regex = new RegExp(pattern.source, pattern.flags)
    const matches = content.match(regex)
    if (matches && matches.length > 2) {
      totalScore += (matches.length - 2) * 2
      issues.push({
        type: 'over_decoration',
        pattern: '过度修饰/冗余比喻',
        count: matches.length,
        examples: matches.slice(0, 3),
      })
    }
  }

  // Check info-dump dialogue
  for (const pattern of infoDialoguePatterns) {
    const regex = new RegExp(pattern.source, pattern.flags)
    const matches = content.match(regex)
    if (matches && matches.length > 0) {
      totalScore += matches.length * 4
      issues.push({
        type: 'info_dump_dialogue',
        pattern: '信息灌输式对话（超长台词或"众所周知"句式）',
        count: matches.length,
        examples: matches.slice(0, 2).map((m) => m.length > 50 ? m.slice(0, 50) + '...' : m),
      })
    }
  }

  // Normalize score
  const score = Math.min(totalScore, 100)

  let level: AIFlavorResult['level']
  if (score <= 5) level = 'excellent'
  else if (score <= 15) level = 'fair'
  else if (score <= 30) level = 'poor'
  else level = 'severe'

  issues.sort((a, b) => b.count - a.count)

  return { score, level, issues: issues.slice(0, 15) }
}

// ── 场景结构检测 ──
export function checkSceneStructure(content: string): SceneStructureResult {
  const issues: string[] = []
  let beatScore = 0

  const plainText = content.replace(/<[^>]*>/g, '')
  const lines = plainText.split(/\n+/).filter((l) => l.trim())
  if (lines.length === 0) {
    return { hasOpeningHook: false, hasConflict: false, hasCliffhanger: false, beatScore: 0, issues: ['章节内容为空'] }
  }

  // 1. Opening hook: first 200 chars should have dialogue, action, or question
  const opening = plainText.slice(0, 200)
  const hasOpeningHook =
    /[""「]/.test(opening) || // 对话开场
    /[！？!?]/.test(opening) || // 疑问/感叹
    /[跑冲砍刺挡闪躲抓握]/.test(opening) // 动作开场
  if (hasOpeningHook) beatScore += 20
  else issues.push('开篇200字缺少钩子（建议用对话、动作或悬念开头）')

  // 2. Conflict: check for conflict keywords
  const hasConflict =
    /[怒骂吼喝斥质问反驳拒绝]/.test(plainText) ||
    /[打斗战厮杀击攻]/.test(plainText) ||
    /不[行可能会]|不允许|不同意|休想|别想/.test(plainText)
  if (hasConflict) beatScore += 25
  else issues.push('未检测到明显的冲突/对抗场景')

  // 3. Cliffhanger ending: last 200 chars
  const ending = plainText.slice(-200)
  const hasCliffhanger =
    /[？?！!]/.test(ending.slice(-50)) || // 以疑问/感叹结尾
    /[突然忽然猛然骤然]/.test(ending) || // 突变
    /[却但然而]/.test(ending.slice(-80)) || // 转折结尾
    /[…——]/.test(ending.slice(-30)) // 省略号/破折号
  if (hasCliffhanger) beatScore += 20
  else issues.push('章节结尾缺少悬念钩子（建议用转折、疑问或突变结尾）')

  // 4. Dialogue vs narration balance
  const dialogueLines = plainText.match(/[""「][^""」]*[""」]/g) || []
  const dialogueChars = dialogueLines.join('').length
  const dialogueRatio = dialogueChars / Math.max(plainText.length, 1)
  if (dialogueRatio >= 0.2 && dialogueRatio <= 0.6) beatScore += 15
  else if (dialogueRatio < 0.1) issues.push('对话过少，建议增加人物互动（目标占比20%-60%）')
  else if (dialogueRatio > 0.7) issues.push('对话过多，建议增加动作/场景描写（目标占比20%-60%）')

  // 5. Paragraph variation (length variation = good pacing)
  const paragraphs = plainText.split(/\n\n+/).filter((p) => p.trim())
  if (paragraphs.length >= 3) {
    const lengths = paragraphs.map((p) => p.length)
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((a, b) => a + (b - avg) ** 2, 0) / lengths.length
    const cv = Math.sqrt(variance) / Math.max(avg, 1)
    if (cv > 0.3) beatScore += 20 // Good variation
    else issues.push('段落长度过于均匀，建议长短交替营造节奏感')
  }

  return { hasOpeningHook, hasConflict, hasCliffhanger, beatScore: Math.min(beatScore, 100), issues }
}

// ── 对话质量检测 ──
export function checkDialogueQuality(content: string): DialogueQualityResult {
  const issues: string[] = []
  const plainText = content.replace(/<[^>]*>/g, '')

  const dialogueMatches = plainText.match(/[""「][^""」]*[""」]/g) || []
  const dialogueChars = dialogueMatches.join('').length
  const dialogueRatio = dialogueChars / Math.max(plainText.length, 1)
  const avgDialogueLength = dialogueMatches.length > 0
    ? dialogueMatches.reduce((a, b) => a + b.length, 0) / dialogueMatches.length
    : 0

  // Check for action beats near dialogue
  const hasActionBeats = /[""」](?:[^""「]{1,30})[，。]/.test(plainText)

  // Check for "said" tags
  const saidTags = plainText.match(/[他她](?:说|道|问|答|喊|叫|嚷|喃喃|低声|冷声|沉声)/g) || []
  if (saidTags.length > 5) {
    issues.push(`对话标签过多（${saidTags.length}处），建议用动作beats代替"他说/她道"`)
  }

  // Check for uniform dialogue length
  if (dialogueMatches.length >= 4) {
    const lengths = dialogueMatches.map((d) => d.length)
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const allSimilar = lengths.every((l) => Math.abs(l - avg) < avg * 0.3)
    if (allSimilar) {
      issues.push('对话长度过于均匀，建议混合短促回应和长段表达')
    }
  }

  // Check for long monologues
  const longDialogues = dialogueMatches.filter((d) => d.length > 80)
  if (longDialogues.length > 0) {
    issues.push(`有 ${longDialogues.length} 处超长台词（>80字），建议拆分或加入动作中断`)
  }

  return { dialogueRatio, avgDialogueLength, hasActionBeats, issues }
}

function findExamples(text: string, word: string, count: number): string[] {
  const examples: string[] = []
  let idx = 0
  while (examples.length < count) {
    idx = text.indexOf(word, idx)
    if (idx === -1) break
    const start = Math.max(0, idx - 10)
    const end = Math.min(text.length, idx + word.length + 10)
    examples.push('...' + text.slice(start, end) + '...')
    idx += word.length
  }
  return examples
}

export function runQualityCheck(content: string, options?: { min?: number; max?: number }): QualityReport {
  const plainText = content.replace(/<[^>]*>/g, '')
  const wordCount = checkWordCount(plainText, options?.min, options?.max)
  const aiFlavor = checkAIFlavor(plainText)
  const sceneStructure = checkSceneStructure(content)
  const dialogueQuality = checkDialogueQuality(content)

  let overall: QualityReport['overall'] = 'pass'
  if (wordCount.status === 'fail' || aiFlavor.level === 'severe') {
    overall = 'fail'
  } else if (wordCount.status === 'warn' || aiFlavor.level === 'poor' || sceneStructure.beatScore < 30) {
    overall = 'warn'
  }

  // Combined score
  const wordScore = wordCount.status === 'pass' ? 100 : wordCount.status === 'warn' ? 70 : 30
  const aiScore = 100 - aiFlavor.score
  const structureScore = sceneStructure.beatScore
  const score = Math.round(wordScore * 0.2 + aiScore * 0.4 + structureScore * 0.4)

  return { wordCount, aiFlavor, sceneStructure, dialogueQuality, overall, score }
}
