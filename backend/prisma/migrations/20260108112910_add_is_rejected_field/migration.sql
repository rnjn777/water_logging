-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "is_rejected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejected_at" TIMESTAMP(6);
