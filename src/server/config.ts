import 'dotenv/config'

function readNumber(name: string, fallback: number) {
  const value = process.env[name]

  if (!value) {
    return fallback
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: readNumber('PORT', 8787),
  host: process.env.HOST ?? (isProductionEnv() ? '0.0.0.0' : '127.0.0.1'),
  allowedOrigin: process.env.ALLOWED_ORIGIN ?? '',
  geminiApiKey: isTestMode() ? '' : (process.env.GEMINI_API_KEY ?? ''),
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-3.5-flash',
  aiTimeoutMs: readNumber('AI_TIMEOUT_MS', 8000),
  aiCacheTtlMs: readNumber('AI_CACHE_TTL_MS', 120000),
}

export function isProduction() {
  return config.nodeEnv === 'production'
}

function isProductionEnv() {
  return process.env.NODE_ENV === 'production'
}

function isTestMode() {
  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
}
