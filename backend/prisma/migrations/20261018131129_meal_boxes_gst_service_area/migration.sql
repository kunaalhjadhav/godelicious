-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "couponMinOrder" DOUBLE PRECISION NOT NULL DEFAULT 1000,
ADD COLUMN     "gstPercent" DOUBLE PRECISION NOT NULL DEFAULT 5,
ADD COLUMN     "mealBoxMinQty" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "serviceAreaOn" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "serviceLat" DOUBLE PRECISION NOT NULL DEFAULT 12.322983,
ADD COLUMN     "serviceLng" DOUBLE PRECISION NOT NULL DEFAULT 76.5878328,
ADD COLUMN     "serviceRadiusKm" DOUBLE PRECISION NOT NULL DEFAULT 20;

-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isMealBox" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "gstAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "MealBoxItem" (
    "id" TEXT NOT NULL,
    "boxId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MealBoxItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealBoxItem_boxId_itemId_key" ON "MealBoxItem"("boxId", "itemId");

-- AddForeignKey
ALTER TABLE "MealBoxItem" ADD CONSTRAINT "MealBoxItem_boxId_fkey" FOREIGN KEY ("boxId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealBoxItem" ADD CONSTRAINT "MealBoxItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
