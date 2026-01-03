/*
  Warnings:

  - Added the required column `location` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rainIntensity` to the `Report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "location" TEXT NOT NULL,
ADD COLUMN     "rainIntensity" TEXT NOT NULL;
