ALTER TABLE "BillingTransaction" ADD COLUMN "providerTransactionId" TEXT;

CREATE UNIQUE INDEX "BillingTransaction_providerTransactionId_key" ON "BillingTransaction"("providerTransactionId");
