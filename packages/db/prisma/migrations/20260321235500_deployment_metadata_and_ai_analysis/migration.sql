-- AlterTable
ALTER TABLE "Deployment"
ADD COLUMN "aiAnalysis" TEXT,
ADD COLUMN "commitMessage" TEXT,
ADD COLUMN "sourceBranch" TEXT;
