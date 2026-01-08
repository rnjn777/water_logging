-- Migration: add processed_image and is_waterlogged to Report
ALTER TABLE "Report" ADD COLUMN "processed_image" TEXT;
ALTER TABLE "Report" ADD COLUMN "is_waterlogged" BOOLEAN;
