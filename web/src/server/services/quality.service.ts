/**
 * Quality checking service - comprehensive novel writing quality analysis.
 * Performs: word count, AI-flavor detection, scene structure, dialogue quality,
 * repetition detection, rhythm analysis, and generates rewrite suggestions.
 */

export interface QualityReport {
  wordCount: WordCountResult
  aiFlavor: AIFlavorResult
  sceneStructure: SceneStructureResult
  dialogueQuality: DialogueQualityResult
  repetition: RepetitionResult
  rhythm: RhythmResult
  suggestions: RewriteSuggestion[]
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

export interface RepetitionResult {
  score: number // 0-100, lower is better (fewer repetitions)
  level: 'excellent' | 'fair' | 'poor' | 'severe'
  issues: RepetitionIssue[]
}

export interface RepetitionIssue {
  type: 'sentence_opening' | 'phrase_repeat' | 'vocab_monotony' | 'structure_repeat'
  description: string
  count: number
  examples: string[]
}

export interface RhythmResult {
  score: number // 0-100
  level: 'excellent' | 'fair' | 'poor'
  issues: string[]
  sentenceLengthVariance: number
  avgSentenceLength: number
}

export interface RewriteSuggestion {
  priority: 'high' | 'medium' | 'low'
  category: string
  problem: string
  suggestion: string
  location?: string // approximate position hint
}

export interface CharacterVoiceResult {
  score: number // 0-100
  issues: CharacterVoiceIssue[]
}

export interface CharacterVoiceIssue {
  characterName: string
  problem: string
  dialogueExample: string
}

export interface CharacterVoiceProfile {
  name: string
  speechPattern?: string | null
  verbalHabits?: string | null
  personality?: string | null
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

// ── 重复检测 ──
export function checkRepetition(content: string): RepetitionResult {
  const issues: RepetitionIssue[] = []
  let totalScore = 0
  const plainText = content.replace(/<[^>]*>/g, '')

  // Split into sentences (Chinese sentence endings)
  const sentences = plainText
    .split(/[。！？!?…]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4)

  if (sentences.length < 5) {
    return { score: 0, level: 'excellent', issues: [] }
  }

  // 1. Sentence opening repetition (连续段首/句首重复)
  const openings = sentences.map((s) => s.slice(0, 2))
  let consecutiveCount = 1
  let maxConsecutive = 1
  const repeatedOpenings: Map<string, number> = new Map()

  for (let i = 1; i < openings.length; i++) {
    if (openings[i] === openings[i - 1]) {
      consecutiveCount++
      maxConsecutive = Math.max(maxConsecutive, consecutiveCount)
    } else {
      consecutiveCount = 1
    }
    repeatedOpenings.set(openings[i], (repeatedOpenings.get(openings[i]) || 0) + 1)
  }

  // Flag consecutive same openings (3+ is problematic)
  if (maxConsecutive >= 3) {
    totalScore += (maxConsecutive - 2) * 5
    issues.push({
      type: 'sentence_opening',
      description: `连续${maxConsecutive}句以相同字词开头`,
      count: maxConsecutive,
      examples: findConsecutiveOpening(sentences, openings),
    })
  }

  // Flag "他/她" opening overuse
  const pronOpenings = sentences.filter((s) => /^[他她它我你]/.test(s))
  const pronRatio = pronOpenings.length / sentences.length
  if (pronRatio > 0.4 && pronOpenings.length > 6) {
    totalScore += Math.round((pronRatio - 0.4) * 30)
    issues.push({
      type: 'sentence_opening',
      description: `人称代词开头过多（${Math.round(pronRatio * 100)}%的句子以他/她/我开头）`,
      count: pronOpenings.length,
      examples: pronOpenings.slice(0, 3).map((s) => s.slice(0, 30) + '…'),
    })
  }

  // 2. Phrase repetition (相同短语在短距离内重复)
  const phraseMap = new Map<string, number[]>()
  for (let i = 0; i < sentences.length; i++) {
    // Extract 3-5 char phrases
    for (let len = 3; len <= 5; len++) {
      for (let j = 0; j <= sentences[i].length - len; j++) {
        const phrase = sentences[i].slice(j, j + len)
        // Skip common functional phrases
        if (/^[的了在是有不也都]/.test(phrase)) continue
        if (!phraseMap.has(phrase)) phraseMap.set(phrase, [])
        phraseMap.get(phrase)!.push(i)
      }
    }
  }

  const repeatedPhrases: Array<{ phrase: string; count: number; proximity: boolean }> = []
  for (const [phrase, positions] of phraseMap) {
    if (positions.length >= 3) {
      // Check if they appear in proximity (within 5 sentences)
      let proximityHits = 0
      for (let i = 1; i < positions.length; i++) {
        if (positions[i] - positions[i - 1] <= 5) proximityHits++
      }
      if (proximityHits >= 2) {
        repeatedPhrases.push({ phrase, count: positions.length, proximity: true })
      }
    }
  }

  // Only report top-5 most repeated phrases
  repeatedPhrases.sort((a, b) => b.count - a.count)
  if (repeatedPhrases.length > 0) {
    const top = repeatedPhrases.slice(0, 5)
    totalScore += top.reduce((sum, p) => sum + (p.count - 2) * 2, 0)
    issues.push({
      type: 'phrase_repeat',
      description: `短距离内出现重复短语`,
      count: top.reduce((sum, p) => sum + p.count, 0),
      examples: top.map((p) => `"${p.phrase}" 重复${p.count}次`),
    })
  }

  // 3. Vocabulary monotony — check verb/adjective diversity
  const actionVerbs = plainText.match(/[看望走跑站坐拿放笑哭说道问答点摇挥握推拉转身抬起低下]+/g) || []
  if (actionVerbs.length > 10) {
    const uniqueVerbs = new Set(actionVerbs)
    const diversityRatio = uniqueVerbs.size / actionVerbs.length
    if (diversityRatio < 0.3) {
      totalScore += Math.round((0.3 - diversityRatio) * 40)
      const verbCounts = new Map<string, number>()
      for (const v of actionVerbs) {
        verbCounts.set(v, (verbCounts.get(v) || 0) + 1)
      }
      const topVerbs = [...verbCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
      issues.push({
        type: 'vocab_monotony',
        description: `动词词汇单调（${uniqueVerbs.size}种动词重复出现${actionVerbs.length}次）`,
        count: actionVerbs.length,
        examples: topVerbs.map(([v, c]) => `"${v}" ${c}次`),
      })
    }
  }

  // 4. Structure repetition — similar sentence patterns repeating
  const patterns = sentences.map(classifySentencePattern)
  let patternRepeat = 0
  for (let i = 2; i < patterns.length; i++) {
    if (patterns[i] === patterns[i - 1] && patterns[i] === patterns[i - 2]) {
      patternRepeat++
    }
  }
  if (patternRepeat >= 2) {
    totalScore += patternRepeat * 3
    issues.push({
      type: 'structure_repeat',
      description: `连续3+句使用相同句式结构（${patternRepeat}处）`,
      count: patternRepeat,
      examples: ['建议交替使用：短句/长句、对话/叙述/动作'],
    })
  }

  const score = Math.min(totalScore, 100)
  let level: RepetitionResult['level']
  if (score <= 5) level = 'excellent'
  else if (score <= 15) level = 'fair'
  else if (score <= 30) level = 'poor'
  else level = 'severe'

  return { score, level, issues: issues.slice(0, 10) }
}

function classifySentencePattern(sentence: string): string {
  if (/^[""「]/.test(sentence)) return 'dialogue'
  if (/^[他她我你它]/.test(sentence)) return 'pronoun_subject'
  if (/[的了]$/.test(sentence)) return 'descriptive'
  if (sentence.length < 15) return 'short'
  if (sentence.length > 60) return 'long'
  return 'medium'
}

function findConsecutiveOpening(sentences: string[], openings: string[]): string[] {
  const examples: string[] = []
  let run = 1
  for (let i = 1; i < openings.length; i++) {
    if (openings[i] === openings[i - 1]) {
      run++
    } else {
      if (run >= 3) {
        const start = i - run
        examples.push(
          ...sentences.slice(start, start + Math.min(run, 3)).map((s) => s.slice(0, 30) + '…'),
        )
      }
      run = 1
    }
  }
  if (run >= 3) {
    const start = openings.length - run
    examples.push(
      ...sentences.slice(start, start + Math.min(run, 3)).map((s) => s.slice(0, 30) + '…'),
    )
  }
  return examples.slice(0, 4)
}

// ── 节奏分析 ──
export function checkRhythm(content: string): RhythmResult {
  const issues: string[] = []
  const plainText = content.replace(/<[^>]*>/g, '')

  const sentences = plainText
    .split(/[。！？!?…，,；;]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)

  if (sentences.length < 10) {
    return { score: 60, level: 'fair', issues: ['内容过短，无法准确评估节奏'], sentenceLengthVariance: 0, avgSentenceLength: 0 }
  }

  const lengths = sentences.map((s) => s.length)
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((a, b) => a + (b - avg) ** 2, 0) / lengths.length
  const stdDev = Math.sqrt(variance)
  const cv = stdDev / Math.max(avg, 1) // coefficient of variation

  let score = 0

  // Good rhythm = high variation (cv > 0.5)
  if (cv >= 0.6) score += 40
  else if (cv >= 0.4) score += 25
  else if (cv >= 0.25) score += 10
  else issues.push(`句子长度过于均匀（变异系数${cv.toFixed(2)}），缺乏节奏感。建议：长句铺陈后用短句冲击`)

  // Check for consecutive similar-length sentences (monotone rhythm)
  let monotoneRuns = 0
  for (let i = 2; i < lengths.length; i++) {
    const spread = Math.max(lengths[i], lengths[i - 1], lengths[i - 2]) -
      Math.min(lengths[i], lengths[i - 1], lengths[i - 2])
    if (spread < 5) monotoneRuns++
  }
  const monotoneRatio = monotoneRuns / Math.max(lengths.length - 2, 1)
  if (monotoneRatio < 0.15) score += 30
  else if (monotoneRatio < 0.3) score += 15
  else issues.push(`${Math.round(monotoneRatio * 100)}%的连续句子长度接近，节奏缺乏起伏`)

  // Check paragraph rhythm (long/short paragraph alternation)
  const paragraphs = plainText.split(/\n\n+/).filter((p) => p.trim().length > 10)
  if (paragraphs.length >= 5) {
    const pLengths = paragraphs.map((p) => p.length)
    const pAvg = pLengths.reduce((a, b) => a + b, 0) / pLengths.length
    const pCv = Math.sqrt(pLengths.reduce((a, b) => a + (b - pAvg) ** 2, 0) / pLengths.length) / Math.max(pAvg, 1)
    if (pCv >= 0.4) score += 30
    else if (pCv >= 0.25) score += 15
    else issues.push('段落长度过于均匀，建议长段叙述与短段对话/动作交替')
  } else {
    score += 15 // Not enough paragraphs to judge
  }

  let level: RhythmResult['level']
  if (score >= 70) level = 'excellent'
  else if (score >= 40) level = 'fair'
  else level = 'poor'

  return { score: Math.min(score, 100), level, issues, sentenceLengthVariance: cv, avgSentenceLength: avg }
}

// ── 角色声音一致性检测 ──
export function checkCharacterVoice(
  content: string,
  characters: CharacterVoiceProfile[],
): CharacterVoiceResult {
  const issues: CharacterVoiceIssue[] = []
  const plainText = content.replace(/<[^>]*>/g, '')

  if (characters.length === 0) {
    return { score: 80, issues: [] }
  }

  // Extract dialogues with speaker attribution
  // Pattern: 角色名 + speech verb + "dialogue" or narration + 角色名 + "dialogue"
  const dialogueBlocks: Array<{ speaker: string; text: string }> = []

  for (const char of characters) {
    // Match patterns like: 角色名说道："..." or 角色名..."
    const nameEscaped = char.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const patterns = [
      new RegExp(`${nameEscaped}[^""]*?[：:]?\\s*[""「]([^""」]+)[""」]`, 'g'),
      new RegExp(`[""「]([^""」]+)[""」][^。]*${nameEscaped}`, 'g'),
    ]
    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(plainText)) !== null) {
        dialogueBlocks.push({ speaker: char.name, text: match[1] })
      }
    }
  }

  // Check if different characters sound the same
  const speakerDialogues = new Map<string, string[]>()
  for (const block of dialogueBlocks) {
    if (!speakerDialogues.has(block.speaker)) speakerDialogues.set(block.speaker, [])
    speakerDialogues.get(block.speaker)!.push(block.text)
  }

  // Check each character's dialogue against their profile
  for (const char of characters) {
    const dialogues = speakerDialogues.get(char.name) || []
    if (dialogues.length === 0) continue

    // Check if character has verbal habits defined and whether they appear
    if (char.verbalHabits) {
      const habits = char.verbalHabits.split(/[,，、/]/).map((h) => h.trim()).filter(Boolean)
      const allDialogue = dialogues.join(' ')
      const habitsUsed = habits.filter((h) => allDialogue.includes(h))
      if (habits.length >= 2 && habitsUsed.length === 0 && dialogues.length >= 3) {
        issues.push({
          characterName: char.name,
          problem: `${char.name}的对话未体现设定的语言习惯（${habits.slice(0, 3).join('、')}）`,
          dialogueExample: dialogues[0].slice(0, 40),
        })
      }
    }

    // Check if character speech pattern matches
    if (char.speechPattern) {
      const pattern = char.speechPattern.toLowerCase()
      const allDialogue = dialogues.join(' ')
      // Rough heuristic checks
      if (pattern.includes('粗犷') || pattern.includes('直接') || pattern.includes('粗鲁')) {
        // Should have short, direct sentences
        const avgLen = dialogues.reduce((a, d) => a + d.length, 0) / dialogues.length
        if (avgLen > 40) {
          issues.push({
            characterName: char.name,
            problem: `${char.name}设定说话"${char.speechPattern}"，但对话平均长度${Math.round(avgLen)}字，过于文绉绉`,
            dialogueExample: dialogues.find((d) => d.length > 40)?.slice(0, 40) || '',
          })
        }
      }
      if (pattern.includes('文雅') || pattern.includes('学究') || pattern.includes('书卷气')) {
        // Check if too casual
        const casualWords = dialogues.filter((d) => /[卧槽靠草妈逼操]/.test(d))
        if (casualWords.length > 0) {
          issues.push({
            characterName: char.name,
            problem: `${char.name}设定说话"${char.speechPattern}"，但出现粗俗用语`,
            dialogueExample: casualWords[0].slice(0, 40),
          })
        }
      }
    }
  }

  // Check if all characters sound identical (compare sentence length distributions)
  const speakerNames = [...speakerDialogues.keys()]
  if (speakerNames.length >= 2) {
    const avgLengths = speakerNames.map((name) => {
      const ds = speakerDialogues.get(name)!
      return { name, avg: ds.reduce((a, d) => a + d.length, 0) / ds.length, count: ds.length }
    }).filter((s) => s.count >= 2)

    if (avgLengths.length >= 2) {
      const maxDiff = Math.max(...avgLengths.map((a) => a.avg)) - Math.min(...avgLengths.map((a) => a.avg))
      if (maxDiff < 5) {
        issues.push({
          characterName: '所有角色',
          problem: '不同角色的对话长度和风格过于接近，缺乏个性区分',
          dialogueExample: `平均对话长度差异仅${maxDiff.toFixed(0)}字`,
        })
      }
    }
  }

  // Score: start at 100, deduct per issue
  const score = Math.max(0, 100 - issues.length * 15)
  return { score, issues }
}

// ── 生成改写建议 ──
export function generateSuggestions(report: Omit<QualityReport, 'suggestions'>): RewriteSuggestion[] {
  const suggestions: RewriteSuggestion[] = []

  // AI-flavor suggestions
  for (const issue of report.aiFlavor.issues) {
    if (issue.type === 'blacklist' && issue.count >= 3) {
      suggestions.push({
        priority: 'high',
        category: 'AI味',
        problem: `"${issue.pattern}" 出现${issue.count}次`,
        suggestion: getBlacklistReplacement(issue.pattern),
      })
    }
    if (issue.type === 'tell_not_show') {
      suggestions.push({
        priority: 'high',
        category: '展示vs叙述',
        problem: `情感直述${issue.count}处`,
        suggestion: '将"他感到紧张"改为具体行为：搓手、吞咽、声音发颤等。用动作外化情绪，让读者自己感受。',
      })
    }
    if (issue.type === 'info_dump_dialogue') {
      suggestions.push({
        priority: 'high',
        category: '对话质量',
        problem: '信息灌输式对话',
        suggestion: '将长段解释拆成多轮对话，用提问-回答推进。加入打断、犹豫、话题转移等自然对话元素。',
      })
    }
  }

  // Scene structure suggestions
  if (!report.sceneStructure.hasOpeningHook) {
    suggestions.push({
      priority: 'high',
      category: '结构',
      problem: '开篇缺少钩子',
      suggestion: '重写前200字：用一句震撼对话、突发动作或反常情境开场。避免景物描写和缓慢铺垫。',
      location: '章节开头',
    })
  }
  if (!report.sceneStructure.hasCliffhanger) {
    suggestions.push({
      priority: 'high',
      category: '结构',
      problem: '结尾缺少悬念',
      suggestion: '在最后200字加入：突然揭示、紧急危机、身份反转、或两难选择。让读者有翻页冲动。',
      location: '章节结尾',
    })
  }
  if (!report.sceneStructure.hasConflict) {
    suggestions.push({
      priority: 'medium',
      category: '结构',
      problem: '未检测到明显冲突',
      suggestion: '补充至少一处冲突：人物分歧、利益碰撞、外部威胁或内心矛盾。冲突是小说的引擎。',
    })
  }

  // Repetition suggestions
  if (report.repetition.level === 'poor' || report.repetition.level === 'severe') {
    for (const issue of report.repetition.issues) {
      if (issue.type === 'sentence_opening') {
        suggestions.push({
          priority: 'medium',
          category: '重复',
          problem: issue.description,
          suggestion: '交替使用不同的句首：动作开头("他一把拽住…"）、场景开头("雨越下越大…"）、对话开头。避免连续3句以"他/她"开头。',
        })
      }
      if (issue.type === 'phrase_repeat') {
        suggestions.push({
          priority: 'medium',
          category: '重复',
          problem: `重复短语：${issue.examples.slice(0, 3).join('、')}`,
          suggestion: '用近义词/换一种表达替换重复短语，或重构句子结构避免重复。',
        })
      }
    }
  }

  // Rhythm suggestions
  if (report.rhythm.level === 'poor') {
    suggestions.push({
      priority: 'medium',
      category: '节奏',
      problem: '句子节奏单调',
      suggestion: '技巧：长句铺陈细节→短句制造冲击。对话段用短碎句，描写段可用长句。关键动作用3-5字短句爆发力。',
    })
  }

  // Dialogue suggestions
  for (const issue of report.dialogueQuality.issues) {
    suggestions.push({
      priority: issue.includes('超长台词') ? 'high' : 'low',
      category: '对话',
      problem: issue,
      suggestion: issue.includes('标签')
        ? '用动作beats代替对话标签："他擦了擦额头上的汗，"你确定？""而不是"他问道"。'
        : issue.includes('超长') ? '将长台词拆分：加入动作中断、对方反应、环境描写穿插。' : '调整对话节奏。',
    })
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  return suggestions.slice(0, 15)
}

function getBlacklistReplacement(word: string): string {
  const replacements: Record<string, string> = {
    '然而': '删除或用具体转折动作替代（他本想…却发现…）',
    '不禁': '删除，直接写动作（"不禁笑了"→"嘴角翘起来"）',
    '仿佛': '删除修饰，直接写具体意象',
    '宛如': '同"仿佛"，用具体比喻代替泛化修饰',
    '犹如': '同上，减少虚化比喻',
    '深深地': '删除副词，用动作强化（"深深地看了一眼"→"目光钉在他脸上"）',
    '缓缓地': '删除或换成具体节奏描写',
    '轻轻地': '删除或用动作替代（"轻轻地关上门"→"门带上时几乎没发出声音"）',
    '默默地': '删除，用沉默的具体表现替代（攥拳、移开视线）',
    '内心深处': '删除，用外化行为展示',
    '心中暗想': '删除，直接写内心独白或用动作暗示',
    '此刻': '删除或用具体时间锚点替代',
    '眼眸': '换成"眼睛"或具体描写（瞳孔收缩/眼底发红）',
    '薄唇': '删除或用动作替代（抿嘴/咬唇/嘴角一撇）',
    '氤氲': '用具体气象描写替代',
    '璀璨': '用具体光线描写替代（反光刺眼/光点乱跳）',
  }
  return replacements[word] ?? `减少使用"${word}"，换成具体的动作或场景描写`
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

export function runQualityCheck(
  content: string,
  options?: { min?: number; max?: number; characters?: CharacterVoiceProfile[] },
): QualityReport {
  const plainText = content.replace(/<[^>]*>/g, '')
  const wordCount = checkWordCount(plainText, options?.min, options?.max)
  const aiFlavor = checkAIFlavor(plainText)
  const sceneStructure = checkSceneStructure(content)
  const dialogueQuality = checkDialogueQuality(content)
  const repetition = checkRepetition(content)
  const rhythm = checkRhythm(content)

  // Character voice check (if profiles provided)
  let characterVoice: CharacterVoiceResult | undefined
  if (options?.characters && options.characters.length > 0) {
    characterVoice = checkCharacterVoice(content, options.characters)
  }

  let overall: QualityReport['overall'] = 'pass'
  if (wordCount.status === 'fail' || aiFlavor.level === 'severe') {
    overall = 'fail'
  } else if (
    wordCount.status === 'warn' ||
    aiFlavor.level === 'poor' ||
    sceneStructure.beatScore < 30 ||
    repetition.level === 'severe'
  ) {
    overall = 'warn'
  }

  // Combined score (6 dimensions)
  const wordScore = wordCount.status === 'pass' ? 100 : wordCount.status === 'warn' ? 70 : 30
  const aiScore = 100 - aiFlavor.score
  const structureScore = sceneStructure.beatScore
  const repetitionScore = 100 - repetition.score
  const rhythmScore = rhythm.score
  const voiceScore = characterVoice?.score ?? 80

  // Weights: AI味30% + 结构25% + 重复15% + 节奏10% + 字数10% + 角色声音10%
  const score = Math.round(
    aiScore * 0.30 +
    structureScore * 0.25 +
    repetitionScore * 0.15 +
    rhythmScore * 0.10 +
    wordScore * 0.10 +
    voiceScore * 0.10,
  )

  // Build the partial report for suggestion generation
  const partialReport = { wordCount, aiFlavor, sceneStructure, dialogueQuality, repetition, rhythm, overall, score }
  const suggestions = generateSuggestions(partialReport)

  return { wordCount, aiFlavor, sceneStructure, dialogueQuality, repetition, rhythm, suggestions, overall, score }
}
