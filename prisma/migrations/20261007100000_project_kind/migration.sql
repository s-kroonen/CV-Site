-- Which Projects sub-tab a project belongs to (personal / education / work).
ALTER TABLE "Project" ADD COLUMN "kind" TEXT NOT NULL DEFAULT '';
