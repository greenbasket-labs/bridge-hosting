ALTER TABLE "Plan" ADD COLUMN "paystackPlanCode" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "paystackSubscriptionCode" TEXT;

CREATE UNIQUE INDEX "Plan_paystackPlanCode_key" ON "Plan"("paystackPlanCode");
CREATE UNIQUE INDEX "Subscription_paystackSubscriptionCode_key" ON "Subscription"("paystackSubscriptionCode");
