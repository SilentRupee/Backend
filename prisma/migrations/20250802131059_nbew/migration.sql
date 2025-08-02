/*
  Warnings:

  - A unique constraint covering the columns `[pda]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[vaultuser]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pda]` on the table `Merchant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[vaultuser]` on the table `Merchant` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Customer_pda_key" ON "Customer"("pda");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_vaultuser_key" ON "Customer"("vaultuser");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_pda_key" ON "Merchant"("pda");

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_vaultuser_key" ON "Merchant"("vaultuser");
