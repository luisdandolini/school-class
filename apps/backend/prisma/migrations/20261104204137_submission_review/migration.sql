-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "feedback" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Submission_taskId_correct_idx" ON "Submission"("taskId", "correct");
