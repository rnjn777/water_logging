-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "approved_at" TIMESTAMP(6),
ADD COLUMN     "image" TEXT,
ADD COLUMN     "is_approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "user_id" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approved_reports" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "total_reports" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trust_score" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "idx_report_user_id" ON "Report"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_trust_score" ON "User"("trust_score" DESC);

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "report_user_fk" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
