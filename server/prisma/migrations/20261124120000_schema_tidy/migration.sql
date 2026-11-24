-- AlterTable
ALTER TABLE "GitHubSyncRecord" ALTER COLUMN "conflicts" SET DATA TYPE JSONB;

-- DropEnum
DROP TYPE "TemplateCategory";

-- CreateIndex
CREATE INDEX "PasswordResetToken_tokenHash_idx" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "Project_isPublished_idx" ON "Project"("isPublished");

-- CreateIndex
CREATE INDEX "ProviderConfig_billingMode_idx" ON "ProviderConfig"("billingMode");

-- CreateIndex
CREATE INDEX "Template_slug_idx" ON "Template"("slug");
