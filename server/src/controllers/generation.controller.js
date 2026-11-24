import { generationPipeline } from '../services/generation/pipeline.js'
import { getGenerationJobQueue } from '../jobs/generation.job.js'
import { subscribeToProgress, publishProgress, completeProgress } from '../jobs/progress.js'
import { creditAccountingService } from '../services/billing/credit.service.js'
import { subscriptionTierService } from '../services/billing/subscription.service.js'
import { pricingEngine } from '../services/billing/pricing.service.js'
import { isByokActive, resolveProviderCredentials } from '../services/billing/byok.service.js'
import { AppError, catchAsync } from '../middleware/error.js'

/**
 * Generation controller with full billing integration.
 *
 * Flow:
 *   1. Check user's tier and available credits
 *   2. Estimate credits needed for generation
 *   3. Reserve credits (atomic transaction)
 *   4. Run the generation pipeline
 *   5. Calculate actual cost from token usage
 *   6. Consume (success) or release (failure) the reservation
 *   7. Record LLM usage for auditing
 *
 * Credits are never deducted directly from generation logic.
 * All credit operations go through CreditAccountingService.
 */
export const generationController = {
  /**
   * Start a new project generation from a natural-language prompt.
   * Runs synchronously for MVP with full credit enforcement.
   */
  generate: catchAsync(async (req, res) => {
    const { prompt, projectName, projectId } = req.validatedBody || req.body
    const userId = req.user.id

    // ── Step 0: Check BYOK status ──
    // If the user has connected their own provider key with billingMode='byok',
    // generation uses their key and NO WebCraft credits are deducted.
    const byokActive = await isByokActive(userId, 'openai')
    let apiKey = null
    let reservation = null
    if (byokActive) {
      const creds = await resolveProviderCredentials(userId, 'openai')
      apiKey = creds.apiKey
    } else {
      // ── Step 1: Check credits and estimate cost ──
      const estimatedCredits = await pricingEngine.estimateCredits(
        'kilo', // default provider for estimation
        'anthropic/claude-3-haiku',
        prompt.length * 4, // rough estimate: ~4 tokens per word
        2000 // rough output estimate
      )

      // Check if user can generate
      const canGenerate = await subscriptionTierService.canGenerate(
        userId,
        estimatedCredits
      )
      if (!canGenerate.allowed) {
        throw new AppError(
          402,
          'INSUFFICIENT_CREDITS',
          canGenerate.reason || 'Insufficient credits for generation. Purchase more credits or connect your own API key.'
        )
      }

      // ── Step 2: Reserve credits ──
      reservation = await creditAccountingService.reserveCredits(
        userId,
        estimatedCredits,
        {
          reason: 'AI generation credit reservation',
        }
      )
    }

    let generationResult
    try {
      // ── Step 3: Run generation pipeline ──
      generationResult = await generationPipeline.generate({
        userId,
        prompt,
        projectName,
        projectId,
        byokMode: byokActive,
        apiKey,
        progressCallback: undefined,
      })

      if (!byokActive) {
        // ── Step 4: Calculate actual cost from token usage ──
        const tokenUsage = generationResult.tokenUsage || {
          inputTokens: 0,
          outputTokens: 0,
        }

        // Use the provider/model actually used by the pipeline (from providerInfo)
        const provider = generationResult.providerInfo?.provider || 'openai'
        const model = generationResult.providerInfo?.model || 'gpt-4o-mini'

        const pricingResult = await pricingEngine.calculateCost(
          provider,
          model,
          tokenUsage.inputTokens,
          tokenUsage.outputTokens
        )

        // ── Step 5: Consume credits (actual usage) ──
        const actualCredits = pricingResult.creditsConsumed
        await creditAccountingService.consumeCredits(
          reservation.reservationId,
          actualCredits
        )

        // ── Step 6: Record LLM usage ──
        await pricingEngine.recordUsage(userId, pricingResult)

        res.status(201).json({
          success: true,
          data: {
            ...generationResult,
            billing: {
              reservationId: reservation.reservationId,
              creditsReserved: reservation.amount,
              creditsConsumed: actualCredits,
              providerCostCents: pricingResult.providerCostCents,
              markedUpCostCents: pricingResult.markedUpCostCents,
              creditsPerUsd: pricingResult.creditPerUsd,
            },
          },
        })
      } else {
        // BYOK: no credits deducted, provider bills user directly
        res.status(201).json({
          success: true,
          data: {
            ...generationResult,
            billing: {
              byok: true,
              creditsReserved: 0,
              creditsConsumed: 0,
              message: 'Generated using your own API key. No WebCraft credits deducted.',
            },
          },
        })
      }
    } catch (error) {
      if (!byokActive && reservation) {
        // ── Step 7: On failure, release reserved credits ──
        await creditAccountingService.releaseCredits(
          reservation.reservationId,
          { reason: `Generation failed: ${error.message}` }
        )
      }
      throw error
    }
  }),

  /**
   * Start an asynchronous generation job via BullMQ.
   * Returns immediately with a jobId; credits are reserved when the job runs.
   */
  generateAsync: catchAsync(async (req, res) => {
    const { prompt, projectName, projectId } = req.validatedBody || req.body
    const userId = req.user.id

    // ── Step 0: Check BYOK status ──
    const byokActive = await isByokActive(userId, 'openai')
    let reservation = null
    if (!byokActive) {
      // Estimate credits and check availability before queueing
      const estimatedCredits = await pricingEngine.estimateCredits(
        'kilo',
        'anthropic/claude-3-haiku',
        prompt.length * 4,
        2000
      )

      const canGenerate = await subscriptionTierService.canGenerate(
        userId,
        estimatedCredits
      )
      if (!canGenerate.allowed) {
        throw new AppError(
          402,
          'INSUFFICIENT_CREDITS',
          canGenerate.reason || 'Insufficient credits for generation. Purchase more credits or connect your own API key.'
        )
      }

      // Reserve credits before queueing
      reservation = await creditAccountingService.reserveCredits(
        userId,
        estimatedCredits,
        {
          reason: 'Async generation credit reservation',
        }
      )
    }

    const job = await getGenerationJobQueue().add('generate', {
      userId,
      prompt,
      projectName,
      projectId,
      reservationId: reservation?.reservationId,
      estimatedCredits: reservation?.amount,
      byokMode: byokActive,
    })

    res.status(202).json({
      success: true,
      data: {
        jobId: job.id,
        status: 'queued',
        reservationId: reservation?.reservationId,
        creditsReserved: reservation?.amount,
        byok: byokActive,
      },
    })
  }),

  /**
   * Run an incremental modification on an existing project.
   */
  modify: catchAsync(async (req, res) => {
    const { projectId, instruction, expectedRevisionId } = req.validatedBody || req.body
    const userId = req.user.id

    // ── Step 0: Check BYOK status ──
    const byokActive = await isByokActive(userId, 'openai')
    let apiKey = null
    let reservation = null
    if (byokActive) {
      const creds = await resolveProviderCredentials(userId, 'openai')
      apiKey = creds.apiKey
    } else {
      // Check credits for modification
      const estimatedCredits = await pricingEngine.estimateCredits(
        'kilo',
        'anthropic/claude-3-haiku',
        instruction.length * 4,
        1000
      )

      const canGenerate = await subscriptionTierService.canGenerate(
        userId,
        estimatedCredits
      )
      if (!canGenerate.allowed) {
        throw new AppError(
          402,
          'INSUFFICIENT_CREDITS',
          canGenerate.reason || 'Insufficient credits for modification. Purchase more credits or connect your own API key.'
        )
      }

      // Reserve credits
      reservation = await creditAccountingService.reserveCredits(
        userId,
        estimatedCredits,
        {
          reason: 'Incremental modification credit reservation',
        }
      )
    }

    try {
      const result = await generationPipeline.modify({
        projectId,
        userId,
        instruction,
        expectedRevisionId,
        byokMode: byokActive,
        apiKey,
      })

      if (!byokActive) {
        // Calculate actual cost using the provider/model actually used
        const tokenUsage = result.tokenUsage || { inputTokens: 0, outputTokens: 0 }
        const provider = result.providerInfo?.provider || 'openai'
        const model = result.providerInfo?.model || 'gpt-4o-mini'

        const pricingResult = await pricingEngine.calculateCost(
          provider,
          model,
          tokenUsage.inputTokens,
          tokenUsage.outputTokens
        )

        const actualCredits = pricingResult.creditsConsumed
        await creditAccountingService.consumeCredits(
          reservation.reservationId,
          actualCredits
        )

        await pricingEngine.recordUsage(userId, pricingResult)

        res.json({
          success: true,
          data: {
            ...result,
            billing: {
              creditsConsumed: actualCredits,
              providerCostCents: pricingResult.providerCostCents,
            },
          },
        })
      } else {
        // BYOK: no credits deducted
        res.json({
          success: true,
          data: {
            ...result,
            billing: {
              byok: true,
              creditsConsumed: 0,
              message: 'Modified using your own API key. No WebCraft credits deducted.',
            },
          },
        })
      }
    } catch (error) {
      if (!byokActive && reservation) {
        await creditAccountingService.releaseCredits(
          reservation.reservationId,
          { reason: `Modification failed: ${error.message}` }
        )
      }
      throw error
    }
  }),

  /**
   * Get the status of a BullMQ generation job.
   */
  getJob: catchAsync(async (req, res) => {
    const { jobId } = req.validatedParams || req.params
    const job = await getGenerationJobQueue().getJob(jobId)

    if (!job) {
      throw new AppError(404, 'JOB_NOT_FOUND', 'Generation job not found')
    }

    const state = await job.getState()

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: state,
        progress: job.progress || 0,
        returnValue: job.returnvalue,
        failedReason: job.failedReason,
      },
    })
  }),

  /**
   * SSE stream for real-time generation progress.
   */
  stream: catchAsync(async (req, res) => {
    const { jobId } = req.validatedParams || req.params

    const job = await getGenerationJobQueue().getJob(jobId)
    if (!job) {
      throw new AppError(404, 'JOB_NOT_FOUND', 'Generation job not found')
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    res.write('data: ' + JSON.stringify({ type: 'connected', jobId }) + '\n\n')

    subscribeToProgress(jobId, res)

    const state = await job.getState()
    if (state === 'completed' || state === 'failed') {
      completeProgress(jobId)
    }
  }),
}

export default generationController