-- Add PUBLISHED to ProjectStatus enum.
-- (The first version of this migration queried pg_enum.typname, a column that
-- does not exist, so it failed before changing anything. Needs PostgreSQL 12+.)
ALTER TYPE "ProjectStatus" ADD VALUE IF NOT EXISTS 'PUBLISHED';

-- Add publish/deploy columns to Project
ALTER TABLE "Project" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Project" ADD COLUMN "publishedAt" TIMESTAMP(3);
ALTER TABLE "Project" ADD COLUMN "deploymentUrl" TEXT;
ALTER TABLE "Project" ADD COLUMN "draftRevisionId" TEXT;
ALTER TABLE "Project" ADD COLUMN "publishedRevisionId" TEXT;

-- Add snapshot column to ProjectVersion
ALTER TABLE "ProjectVersion" ADD COLUMN "snapshot" JSONB NOT NULL DEFAULT '{}';

-- Create Deployment table
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BUILDING',
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "totalSize" INTEGER NOT NULL DEFAULT 0,
    "buildLogs" TEXT,
    "error" TEXT,
    "deployedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "Deployment_projectId_idx" ON "Deployment"("projectId");
CREATE INDEX "Deployment_userId_idx" ON "Deployment"("userId");
CREATE INDEX "Deployment_versionId_idx" ON "Deployment"("versionId");
CREATE INDEX "Deployment_status_idx" ON "Deployment"("status");
CREATE INDEX "Deployment_createdAt_idx" ON "Deployment"("createdAt");

-- Add foreign keys
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ProjectVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
