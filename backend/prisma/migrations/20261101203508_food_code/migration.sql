/*
  Warnings:

  - A unique constraint covering the columns `[foodCode]` on the table `MenuItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "foodCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_foodCode_key" ON "MenuItem"("foodCode");
