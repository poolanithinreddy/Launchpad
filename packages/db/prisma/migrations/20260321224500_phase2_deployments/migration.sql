-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM (
    'QUEUED',
    'CLONING',
    'DETECTING',
    'BUILDING',
    'STARTING',
    'READY',
    'FAILED',
    'STOPPED'
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'QUEUED',
    "previewUrl" TEXT,
    "previewPort" INTEGER,
    "containerId" TEXT,
    "imageTag" TEXT,
    "framework" TEXT NOT NULL DEFAULT 'other',
    "sourceCommitSha" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Deployment_projectId_createdAt_idx" ON "Deployment"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Deployment_status_idx" ON "Deployment"("status");

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
