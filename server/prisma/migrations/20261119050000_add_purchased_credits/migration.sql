-- Add purchasedCredits: persistent credits (purchases, refunds, positive adjustments)
-- that are never erased by the daily no-rollover allowance reset.
ALTER TABLE "User" ADD COLUMN "purchasedCredits" INTEGER NOT NULL DEFAULT 0;
