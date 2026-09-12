ALTER TYPE "AppStatus" RENAME TO "AppStatus_old";
CREATE TYPE "AppStatus" AS ENUM ('CREATING', 'BUILDING', 'DEPLOYING', 'LIVE', 'FAILED', 'SUSPENDED', 'STOPPING', 'STARTING');
ALTER TABLE "Application" ALTER COLUMN "status" TYPE "AppStatus" USING "status"::text::"AppStatus";
DROP TYPE "AppStatus_old";

CREATE TYPE "AvailabilityStatus" AS ENUM ('UNKNOWN', 'ONLINE', 'OFFLINE', 'CHECKING');
ALTER TABLE "Application" ADD COLUMN "availabilityStatus" "AvailabilityStatus" NOT NULL DEFAULT 'UNKNOWN';
ALTER TABLE "Application" ADD COLUMN "healthCheckPath" TEXT NOT NULL DEFAULT '/';
ALTER TABLE "Application" ADD COLUMN "healthCheckedAt" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN "healthCheckStatus" INTEGER;
ALTER TABLE "Application" ADD COLUMN "healthCheckLatencyMs" INTEGER;
ALTER TABLE "Application" ADD COLUMN "healthCheckError" TEXT;
