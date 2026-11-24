-- Add signupCreditsGranted: tracks whether the one-time signup grant (50 credits
-- for FREE tier) has been applied. Prevents duplicate signup grants.
ALTER TABLE "User" ADD COLUMN "signupCreditsGranted" BOOLEAN NOT NULL DEFAULT false;

-- Add totalConsumedCredits: lifetime consumed credits for usage reporting.
ALTER TABLE "User" ADD COLUMN "totalConsumedCredits" INTEGER NOT NULL DEFAULT 0;
