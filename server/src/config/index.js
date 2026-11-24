/**
 * Centralized application configuration.
 *
 * Reads environment variables, applies sensible defaults, and validates that
 * every required value is present before the server starts. Failing fast on
 * missing configuration prevents subtle runtime failures later.
 *
 * All configuration is accessed through this module rather than
 * `process.env` scattered across the codebase, which makes the app easier to
 * test, reason about, and deploy.
 */
import { config as dotenvConfig } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

// Load .env from the project root before any env-dependent code runs.
// dotenv does not override existing environment variables, so this is safe in
// production where the platform supplies real values.
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = resolve(__dirname, '..', '..', '..')
dotenvConfig({ path: resolve(rootDir, '.env') })

const required = (key) => {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

const optional = (key, fallback) => process.env[key] ?? fallback

const parseBool = (value) => value === 'true' || value === '1'

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '4000'), 10),
  apiVersion: optional('API_VERSION', 'v1'),
  clientUrl: optional('CLIENT_URL', 'http://localhost:5173'),
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),

  databaseUrl: required('DATABASE_URL'),
  redisUrl: optional('REDIS_URL', 'redis://localhost:6380'),

  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET'),
  jwtAccessTtl: optional('JWT_ACCESS_TTL', '15m'),
  jwtRefreshTtl: optional('JWT_REFRESH_TTL', '7d'),

  encryptionKey: optional('ENCRYPTION_KEY', ''),

  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  rateLimitWindowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  rateLimitMaxRequests: parseInt(optional('RATE_LIMIT_MAX_REQUESTS', '100'), 10),

  razorpayKeyId: optional('RAZORPAY_KEY_ID', ''),
  razorpayKeySecret: optional('RAZORPAY_KEY_SECRET', ''),
  razorpayWebhookSecret: optional('RAZORPAY_WEBHOOK_SECRET', ''),

  s3Endpoint: optional('S3_ENDPOINT', ''),
  s3Region: optional('S3_REGION', 'us-east-1'),
  s3AccessKeyId: optional('S3_ACCESS_KEY_ID', ''),
  s3SecretAccessKey: optional('S3_SECRET_ACCESS_KEY', ''),
  s3Bucket: optional('S3_BUCKET', ''),

  openaiApiKey: optional('OPENAI_API_KEY', ''),
  anthropicApiKey: optional('ANTHROPIC_API_KEY', ''),
  geminiApiKey: optional('GEMINI_API_KEY', ''),

  // Kilo AI Gateway (OpenAI-compatible)
  kiloApiKey: optional('KILO_API_KEY', ''),

  // Billing configuration
  freeDailyCredits: parseInt(optional('FREE_DAILY_CREDITS', '50'), 10),
  proDailyCredits: parseInt(optional('PRO_DAILY_CREDITS', '200'), 10),
  proMonthlyPriceCents: parseInt(optional('PRO_MONTHLY_PRICE_CENTS', '1000'), 10),
  proBillingIntervalMonths: parseInt(optional('PRO_BILLING_INTERVAL_MONTHS', '1'), 10),
  defaultMarkupPercent: parseFloat(optional('DEFAULT_MARKUP_PERCENT', '20')),
  defaultCreditPerUsd: parseFloat(optional('DEFAULT_CREDIT_PER_USD', '10')),
  inrPerCredit: parseFloat(optional('INR_PER_CREDIT', '1') || '1'),
  razorpayCurrency: optional('RAZORPAY_CURRENCY', 'INR'),

  previewSandboxTimeoutMs: parseInt(
    optional('PREVIEW_SANDBOX_TIMEOUT_MS', '30000'),
    10
  ),
  previewSandboxMaxMemoryMb: parseInt(
    optional('PREVIEW_SANDBOX_MAX_MEMORY_MB', '256'),
    10
  ),
}

/**
 * Validate configuration at load time. Throws if any required value is absent,
 * so the operator sees a clear startup error instead of a cryptic failure mid-request.
 */
export function validateConfig() {
  const missing = []
  for (const key of [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ]) {
    if (!process.env[key]) missing.push(key)
  }
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }
}

export default config
