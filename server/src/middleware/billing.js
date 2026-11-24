import { AppError, catchAsync } from '../middleware/error.js'
import { creditAccountingService } from '../services/billing/credit.service.js'
import { subscriptionTierService } from '../services/billing/subscription.service.js'
import { pricingEngine } from '../services/billing/pricing.service.js'

/**
 * BillingMiddleware — credit enforcement for generation endpoints.
 *
 * Provides two middleware functions:
 *   - checkCredits: verifies the user can afford generation and reserves credits
 *   - finalizeCredits: consumes (success) or releases (failure) the reservation
 *
 * Usage pattern:
 *
 *   router.post('/generate', protect, checkCredits, generationController.generate)
 *   // In the controller, after generation completes:
 *   await finalizeCredits(req, success=true/false)
 *
 * Credits are reserved BEFORE calling the generation handler.
 * On success: credits are consumed (deducted from balance).
 * On failure: credits are released (returned to available balance).
 */

const DEFAULT_ESTIMATED_CREDITS = 10

/**
 * Middleware: Check credits and reserve before generation.
 *
 * Reads estimated credits from req.body.estimatedCredits or uses a default.
 * Stores the reservation ID on req.billingReservation for later finalization.
 */
export const checkCredits = catchAsync(async (req, res, next) => {
  const userId = req.user.id

  // Get estimated credits from request body or use default
  const estimatedCredits = req.body?.estimatedCredits ?? DEFAULT_ESTIMATED_CREDITS

  // Check if user can generate
  const canGenerate = await subscriptionTierService.canGenerate(
    userId,
    estimatedCredits
  )
  if (!canGenerate.allowed) {
    throw new AppError(
      402,
      'INSUFFICIENT_CREDITS',
      canGenerate.reason || 'Insufficient credits for generation'
    )
  }

  // Reserve credits
  const reservation = await creditAccountingService.reserveCredits(
    userId,
    estimatedCredits,
    {
      jobId: req.body?.jobId,
      reason: 'AI generation credit reservation',
    }
  )

  // Attach reservation to request for finalization
  req.billingReservation = {
    reservationId: reservation.reservationId,
    reservedAmount: reservation.amount,
  }

  next()
})

/**
 * Finalize credits after generation completes.
 *
 * @param req - Express request with billingReservation attached
 * @param success - whether generation succeeded
 * @param actualCredits - actual credits consumed (if success)
 * @param jobId - GenerationJob ID
 */
export const finalizeCredits = catchAsync(async (req, res, next) => {
  const { success, actualCredits, jobId } = req.body ?? {}
  const reservation = req.billingReservation

  if (!reservation) {
    // No reservation was made (e.g., endpoint doesn't use billing)
    return next()
  }

  if (success) {
    // Consume the reserved credits (actual amount used)
    const consumeAmount = actualCredits ?? reservation.reservedAmount
    await creditAccountingService.consumeCredits(
      reservation.reservationId,
      consumeAmount,
      { jobId }
    )
  } else {
    // Release the reserved credits (generation failed)
    await creditAccountingService.releaseCredits(
      reservation.reservationId,
      { reason: 'Generation failed', jobId }
    )
  }

  next()
})

/**
 * Middleware: Release credits on error (for use in error handling).
 * Called when a route handler throws after credits were reserved.
 */
export const releaseCreditsOnError = catchAsync(async (err, req, res, next) => {
  const reservation = req.billingReservation
  if (reservation && reservation.reservationId) {
    try {
      await creditAccountingService.releaseCredits(
        reservation.reservationId,
        { reason: `Generation error: ${err.message}` }
      )
    } catch (releaseErr) {
      // Log but don't fail the original error response
      // eslint-disable-next-line no-console
      console.error('[BILLING] Failed to release credits:', releaseErr.message)
    }
  }
  next(err)
})

export default { checkCredits, finalizeCredits, releaseCreditsOnError }
