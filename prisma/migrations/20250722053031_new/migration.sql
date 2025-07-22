/*
  Warnings:

  - A unique constraint covering the columns `[Privatekey]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[Privatekey]` on the table `Merchant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `Privatekey` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `iv` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Privatekey` to the `Merchant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `iv` to the `Merchant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "Privatekey" TEXT NOT NULL,
ADD COLUMN     "iv" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "Privatekey" TEXT NOT NULL,
ADD COLUMN     "iv" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_Privatekey_key" ON "Customer"("Privatekey");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_Privatekey_key" ON "Merchant"("Privatekey");
