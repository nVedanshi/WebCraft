import { prisma } from '../../lib/prisma.js'

/**
 * PricingEngine — centralized pricing and cost calculation for WebCraft.
 *
 * Calculates usage costs based on:
 *   - Provider (kilo | openai | anthropic | gemini)
 *   - Model (e.g. "anthropic/claude-sonnet-4.5", "gpt-4o")
 *   - Input tokens
 *   - Output tokens
 *   - Actual provider pricing (from PricingModel historical records)
 *   - Configured WebCraft markup percentage
 *   - WebCraft credit conversion rate (credits per $1 USD)
 *
 * All pricing is stored as historical records in the PricingModel table
 * so that previous transactions remain auditable even when pricing changes.
 *
 * Costs are tracked in three separate values:
 *   1. Provider token consumption (inputTokens, outputTokens)
 *   2. Actual provider cost in USD (costCents)
 *   3. WebCraft credits consumed (credits)
 *
 * These are never equated: 1 credit != 1 token.
 */

// Default pricing in cents per 1M tokens (used when no DB record exists)
const DEFAULT_PRICING = {
  kilo: {
    'anthropic/claude-3-haiku': { input: 0.25, output: 1.25 },
    'anthropic/claude-3-sonnet': { input: 3.00, output: 15.00 },
    'anthropic/claude-sonnet-4.5': { input: 3.00, output: 15.00 },
    'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
    'openai/gpt-4o': { input: 2.50, output: 10.00 },
    'google/gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'google/gemini-1.5-pro': { input: 1.25, output: 5.00 },
  },
  openai: {
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o': { input: 2.50, output: 10.00 },
  },
  anthropic: {
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  },
  gemini: {
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  },
}

const DEFAULT_MARKUP_PERCENT = parseFloat(
  process.env.DEFAULT_MARKUP_PERCENT || '20'
) // 20% markup
const DEFAULT_CREDIT_PER_USD = parseFloat(
  process.env.DEFAULT_CREDIT_PER_USD || '10'
) // 10 credits per $1 USD

/**
 * Result of a pricing calculation.
 */
export class PricingResult {
  constructor({
    provider,
    model,
    inputTokens,
    outputTokens,
    providerCostCents,
    markupPercent,
    markedUpCostCents,
    creditPerUsd,
    creditsConsumed,
    pricingRecordId,
  }) {
    this.provider = provider
    this.model = model
    this.inputTokens = inputTokens
    this.outputTokens = outputTokens
    this.providerCostCents = providerCostCents
    this.markupPercent = markupPercent
    this.markedUpCostCents = markedUpCostCents
    this.creditPerUsd = creditPerUsd
    this.creditsConsumed = creditsConsumed
    this.pricingRecordId = pricingRecordId
  }
}

export class PricingEngine {
  /**
   * Calculate the cost for a given usage.
   *
   * @param provider - provider name (kilo | openai | anthropic | gemini)
   * @param model - model ID
   * @param inputTokens - number of input tokens
   * @param outputTokens - number of output tokens
   * @returns PricingResult with cost and credit breakdown
   */
  async calculateCost(provider, model, inputTokens, outputTokens) {
    // Look up active pricing record from database
    const pricing = await this._getPricing(provider, model)

    const markupPercent = pricing.markupPercent
    const creditPerUsd = pricing.creditPerUsd

    // Calculate provider cost in cents (USD * 100)
    // Pricing is stored as cents per 1M tokens
    const inputCostCents =
      (inputTokens * pricing.inputCostPer1M) / 1_000_000
    const outputCostCents =
      (outputTokens * pricing.outputCostPer1M) / 1_000_000
    const providerCostCents = inputCostCents + outputCostCents

    // Apply markup
    const markedUpCostCents = providerCostCents * (1 + markupPercent / 100)

    // Convert to WebCraft credits (round up to ensure we never under-charge)
    const usdCost = markedUpCostCents / 100
    const creditsConsumed = Math.ceil(usdCost * creditPerUsd)

    return new PricingResult({
      provider,
      model,
      inputTokens,
      outputTokens,
      providerCostCents: Math.round(providerCostCents * 100) / 100,
      markupPercent,
      markedUpCostCents: Math.round(markedUpCostCents * 100) / 100,
      creditPerUsd,
      creditsConsumed: Math.max(1, creditsConsumed), // minimum 1 credit
      pricingRecordId: pricing.id,
    })
  }

  /**
   * Estimate cost before generation (for credit reservation).
   * Uses the same calculation but returns the estimated credits needed.
   */
  async estimateCredits(provider, model, inputTokens, outputTokens) {
    const result = await this.calculateCost(provider, model, inputTokens, outputTokens)
    return result.creditsConsumed
  }

  /**
   * Record actual usage after generation completes.
   * Creates an LLMUsage record with the pricing result.
   */
  async recordUsage(userId, pricingResult, { jobId } = {}) {
    return prisma.lLMUsage.create({
      data: {
        userId,
        jobId,
        provider: pricingResult.provider,
        model: pricingResult.model,
        inputTokens: pricingResult.inputTokens,
        outputTokens: pricingResult.outputTokens,
        totalTokens:
          pricingResult.inputTokens + pricingResult.outputTokens,
        costCents: Math.round(pricingResult.providerCostCents),
      },
    })
  }

  /**
   * Get or create a pricing record for a provider/model.
   * Falls back to default pricing if no DB record exists.
   */
  async _getPricing(provider, model) {
    const now = new Date()

    const record = await prisma.pricingModel.findFirst({
      where: {
        provider,
        model,
        isActive: true,
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    })

    if (record) {
      return record
    }

    // Fall back to default pricing (not stored in DB)
    const defaults = DEFAULT_PRICING[provider]
    const modelPricing = defaults?.[model]

    if (!modelPricing) {
      // Unknown model - use a reasonable default
      return {
        id: null,
        provider,
        model,
        inputCostPer1M: 1.00,
        outputCostPer1M: 4.00,
        markupPercent: DEFAULT_MARKUP_PERCENT,
        creditPerUsd: DEFAULT_CREDIT_PER_USD,
      }
    }

    return {
      id: null,
      provider,
      model,
      inputCostPer1M: modelPricing.input,
      outputCostPer1M: modelPricing.output,
      markupPercent: DEFAULT_MARKUP_PERCENT,
      creditPerUsd: DEFAULT_CREDIT_PER_USD,
    }
  }

  /**
   * Set or update pricing for a provider/model (admin operation).
   * Creates a new historical record and deactivates the old one.
   */
  async setPricing({
    provider,
    model,
    inputCostPer1M,
    outputCostPer1M,
    markupPercent,
    creditPerUsd,
    effectiveFrom,
  }) {
    const now = new Date()
    const effectiveFromDate = effectiveFrom ? new Date(effectiveFrom) : now

    // Deactivate existing active records for this provider/model
    await prisma.pricingModel.updateMany({
      where: {
        provider,
        model,
        isActive: true,
      },
      data: {
        isActive: false,
        effectiveTo: effectiveFromDate,
      },
    })

    // Create new pricing record
    const record = await prisma.pricingModel.create({
      data: {
        provider,
        model,
        inputCostPer1M,
        outputCostPer1M,
        markupPercent,
        creditPerUsd,
        effectiveFrom: effectiveFromDate,
        isActive: true,
      },
    })

    return record
  }

  /**
   * Get all active pricing records.
   */
  async getActivePricing() {
    return prisma.pricingModel.findMany({
      where: { isActive: true },
      orderBy: [{ provider: 'asc' }, { model: 'asc' }],
    })
  }

  /**
   * Get pricing history for a provider/model.
   */
  async getPricingHistory(provider, model) {
    return prisma.pricingModel.findMany({
      where: { provider, model },
      orderBy: { effectiveFrom: 'desc' },
    })
  }
}

export const pricingEngine = new PricingEngine()
export default PricingEngine
