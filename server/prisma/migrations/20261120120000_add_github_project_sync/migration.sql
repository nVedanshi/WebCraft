-- CreateTable: GitHubProject — links a WebCraft project to a GitHub repository + branch
CREATE TABLE "GitHubProject" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "lastSyncedCommitSha" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GitHubProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GitHubSyncRecord — tracks sync operations for conflict detection
CREATE TABLE "GitHubSyncRecord" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "filesChanged" INTEGER NOT NULL DEFAULT 0,
    "commitsPushed" INTEGER NOT NULL DEFAULT 0,
    "conflicts" JSON NOT NULL DEFAULT '[]',
    "resolvedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubSyncRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubProject_projectId_key" ON "GitHubProject"("projectId");

-- CreateIndex
CREATE INDEX "GitHubProject_userId_idx" ON "GitHubProject"("userId");

-- CreateIndex
CREATE INDEX "GitHubProject_owner_repo_idx" ON "GitHubProject"("owner", "repo");

-- CreateIndex
CREATE INDEX "GitHubSyncRecord_projectId_idx" ON "GitHubSyncRecord"("projectId");

-- CreateIndex
CREATE INDEX "GitHubSyncRecord_userId_idx" ON "GitHubSyncRecord"("userId");

-- CreateIndex
CREATE INDEX "GitHubSyncRecord_type_idx" ON "GitHubSyncRecord"("type");

-- CreateIndex
CREATE INDEX "GitHubSyncRecord_status_idx" ON "GitHubSyncRecord"("status");

-- CreateIndex
CREATE INDEX "GitHubSyncRecord_createdAt_idx" ON "GitHubSyncRecord"("createdAt");

-- AddForeignKey
ALTER TABLE "GitHubProject" ADD CONSTRAINT "GitHubProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubProject" ADD CONSTRAINT "GitHubProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubSyncRecord" ADD CONSTRAINT "GitHubSyncRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubSyncRecord" ADD CONSTRAINT "GitHubSyncRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
