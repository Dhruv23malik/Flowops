-- Add SKIPPED to the StepStatus enum so the execution engine can
-- persist skipped-branch steps without a runtime error.
ALTER TYPE "StepStatus" ADD VALUE 'SKIPPED';
