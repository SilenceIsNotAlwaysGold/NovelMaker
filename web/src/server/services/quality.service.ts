/**
 * Quality checking service - TypeScript reimplementation of Python scripts.
 * Performs: word count check, AI-flavor detection, terminology consistency.
 */

export interface QualityReport {
  wordCount: WordCountResult
  aiFlavor: AIFlavorResult
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

// AI-flavor blacklist words (common AI writing tells in Chinese)
const aiBlacklist = [
  '然而', '不禁', '仿佛', '宛如', '犹如', '恍若',
  '霎时间', '刹那间', '须臾', '转瞬',
  '不由自主', '情不自禁', '不由得',
  '深深地', '缓缓地', '轻轻地', '默默地', '静静地',
  '内心深处', '心中暗想', '暗自思忖',
  '显而易见', '毋庸置疑', '不言而喻',
  '值得一提', '有趣的是', '令人惊讶的是',
  '一丝', '一抹', '一缕',
  '眼眸', '唇角', '眸光',
  '勾勒', '氤氲', '斑驳', '璀璨',
  '此刻', '这一刻', '那一刻',
]

// Patterns: "他感到/她觉得" type constructions
const tellPatterns = [
  /[他她它](?:感到|觉得|感觉|意识到|明白|知道|心想|暗想)/g,
  /心中(?:一[惊喜怒悲暖凉凛]|涌起|升起|泛起)/g,
  /脸上(?:露出|浮现|闪过|掠过)/g,
]

// Transition word overuse
const transitionWords = [
  '然而', '但是', '不过', '可是', '尽管', '虽然',
  '因此', '所以', '于是', '随即', '接着', '随后',
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

  // Check "tell" patterns
  for (const pattern of tellPatterns) {
    const matches = content.match(pattern)
    if (matches && matches.length > 2) {
      totalScore += (matches.length - 2) * 3
      issues.push({
        type: 'tell_not_show',
        pattern: pattern.source,
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

  // Normalize score to 0-100 (lower = more AI-like)
  const score = Math.min(totalScore, 100)

  let level: AIFlavorResult['level']
  if (score <= 5) level = 'excellent'
  else if (score <= 15) level = 'fair'
  else if (score <= 30) level = 'poor'
  else level = 'severe'

  // Sort issues by count descending
  issues.sort((a, b) => b.count - a.count)

  return { score, level, issues: issues.slice(0, 10) }
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
  const wordCount = checkWordCount(content, options?.min, options?.max)
  const aiFlavor = checkAIFlavor(content)

  let overall: QualityReport['overall'] = 'pass'
  if (wordCount.status === 'fail' || aiFlavor.level === 'severe') {
    overall = 'fail'
  } else if (wordCount.status === 'warn' || aiFlavor.level === 'poor') {
    overall = 'warn'
  }

  // Combined score (100 = perfect)
  const wordScore = wordCount.status === 'pass' ? 100 : wordCount.status === 'warn' ? 70 : 30
  const aiScore = 100 - aiFlavor.score
  const score = Math.round(wordScore * 0.3 + aiScore * 0.7)

  return { wordCount, aiFlavor, overall, score }
}
