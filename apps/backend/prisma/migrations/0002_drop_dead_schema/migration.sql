-- Drop dead schema (FlowOps v2): ExecutionLog was never written by any code,
-- and ExecutionStep.retryCount was never read or written (see architecture.md).
-- Render's start command runs `prisma migrate deploy`, so this applies on the
-- next deploy. There is no data to preserve: no ExecutionLog row ever existed.
ALTER TABLE "ExecutionStep" DROP COLUMN "retryCount";

DROP TABLE "ExecutionLog";
