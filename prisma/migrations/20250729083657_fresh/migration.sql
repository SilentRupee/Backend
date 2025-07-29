/*
  Warnings:

  - Made the column `vaultuser` on table `Customer` required. This step will fail if there are existing NULL values in that column.
  - Made the column `vaultuser` on table `Merchant` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Customer" ALTER COLUMN "vaultuser" SET NOT NULL;

-- AlterTable
ALTER TABLE "Merchant" ALTER COLUMN "vaultuser" SET NOT NULL;
