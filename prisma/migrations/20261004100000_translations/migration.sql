-- Language each item's base text is written in.
ALTER TABLE "Profile" ADD COLUMN "sourceLang" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Experience" ADD COLUMN "sourceLang" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Education" ADD COLUMN "sourceLang" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Project" ADD COLUMN "sourceLang" TEXT NOT NULL DEFAULT 'en';
ALTER TABLE "Skill" ADD COLUMN "sourceLang" TEXT NOT NULL DEFAULT 'en';

-- CreateTable
CREATE TABLE "Translation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "sourceHash" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Translation_entity_entityId_lang_key" ON "Translation"("entity", "entityId", "lang");
