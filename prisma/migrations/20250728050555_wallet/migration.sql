/*
  Warnings:

  - Added the required column `pda` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pda` to the `Merchant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "pda" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "pda" TEXT NOT NULL;
