-- Project grouping, progress status and period.
ALTER TABLE "Project" ADD COLUMN "category" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN "status" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN "startDate" DATETIME;
ALTER TABLE "Project" ADD COLUMN "endDate" DATETIME;
