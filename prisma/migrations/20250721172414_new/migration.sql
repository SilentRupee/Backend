/*
  Warnings:

  - You are about to drop the `Bill` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomerSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EscrowAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GeneralStoreDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RestaurantDetails` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Tip` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Waiter` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pin` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `Customer` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_customerSessionId_fkey";

-- DropForeignKey
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_escrowAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Bill" DROP CONSTRAINT "Bill_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "BillItem" DROP CONSTRAINT "BillItem_billId_fkey";

-- DropForeignKey
ALTER TABLE "CustomerSession" DROP CONSTRAINT "CustomerSession_customerId_fkey";

-- DropForeignKey
ALTER TABLE "GeneralStoreDetails" DROP CONSTRAINT "GeneralStoreDetails_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "RestaurantDetails" DROP CONSTRAINT "RestaurantDetails_merchantId_fkey";

-- DropForeignKey
ALTER TABLE "Tip" DROP CONSTRAINT "Tip_billId_fkey";

-- DropForeignKey
ALTER TABLE "Tip" DROP CONSTRAINT "Tip_waiterId_fkey";

-- DropForeignKey
ALTER TABLE "Waiter" DROP CONSTRAINT "Waiter_merchantId_fkey";

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "email" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "pin" INTEGER NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- DropTable
DROP TABLE "Bill";

-- DropTable
DROP TABLE "CustomerSession";

-- DropTable
DROP TABLE "EscrowAccount";

-- DropTable
DROP TABLE "GeneralStoreDetails";

-- DropTable
DROP TABLE "RestaurantDetails";

-- DropTable
DROP TABLE "Tip";

-- DropTable
DROP TABLE "Waiter";

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_username_key" ON "Customer"("username");
