-- Soft lifecycle for content entities: archivedAt hides from the public site,
-- deletedAt puts into the trash. Both are restorable.
ALTER TABLE "Experience" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Experience" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Education" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Education" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Project" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Project" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Skill" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Skill" ADD COLUMN "deletedAt" DATETIME;

-- Project.status = 'archived' is replaced by archivedAt; carry existing rows over.
UPDATE "Project" SET "archivedAt" = "updatedAt" WHERE "status" = 'archived';
ALTER TABLE "Project" DROP COLUMN "status";
