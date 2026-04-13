export async function GET() {
  return Response.json({
    hasOpenAI: !!process.env.OPENAI_API_KEY,
    hasAnthropic: !!process.env.ANTHROPIC_API_KEY,
    openaiBaseURL: process.env.OPENAI_BASE_URL || '',
    defaultModel: process.env.DEFAULT_MODEL || 'deepseek-chat',
    maxTokens: Number(process.env.MAX_TOKENS) || 4096,
  })
}
