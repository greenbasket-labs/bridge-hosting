CREATE TABLE "BillingTransaction" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'paystack',
  "reference" TEXT NOT NULL,
  "amountKobo" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'NGN',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingTransaction_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BillingTransaction_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BillingTransaction_reference_key" ON "BillingTransaction"("reference");
CREATE INDEX "BillingTransaction_customerId_createdAt_idx" ON "BillingTransaction"("customerId", "createdAt");
CREATE INDEX "BillingTransaction_applicationId_createdAt_idx" ON "BillingTransaction"("applicationId", "createdAt");
