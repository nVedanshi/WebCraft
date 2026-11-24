-- Add billingMode to ProviderConfig.
-- 'system' = use server-side key + WebCraft credits (default)
-- 'byok' = use this user's encrypted key, no WebCraft credits deducted
ALTER TABLE "ProviderConfig" ADD COLUMN "billingMode" TEXT NOT NULL DEFAULT 'system';
