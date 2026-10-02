-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Education" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "institution" TEXT NOT NULL DEFAULT '',
    "degree" TEXT NOT NULL DEFAULT '',
    "field" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "description" TEXT,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Education" ("createdAt", "degree", "description", "endDate", "field", "id", "institution", "sortIndex", "startDate", "updatedAt") SELECT "createdAt", "degree", "description", "endDate", "field", "id", "institution", "sortIndex", "startDate", "updatedAt" FROM "Education";
DROP TABLE "Education";
ALTER TABLE "new_Education" RENAME TO "Education";
CREATE INDEX "Education_sortIndex_idx" ON "Education"("sortIndex");
CREATE TABLE "new_Experience" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL DEFAULT '',
    "location" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "description" TEXT NOT NULL DEFAULT '',
    "bullets" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Experience" ("bullets", "company", "createdAt", "description", "endDate", "id", "location", "sortIndex", "startDate", "tags", "title", "updatedAt") SELECT "bullets", "company", "createdAt", "description", "endDate", "id", "location", "sortIndex", "startDate", "tags", "title", "updatedAt" FROM "Experience";
DROP TABLE "Experience";
ALTER TABLE "new_Experience" RENAME TO "Experience";
CREATE INDEX "Experience_sortIndex_idx" ON "Experience"("sortIndex");
CREATE TABLE "new_PrivateContact" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_PrivateContact" ("email", "id", "phone", "updatedAt") SELECT "email", "id", "phone", "updatedAt" FROM "PrivateContact";
DROP TABLE "PrivateContact";
ALTER TABLE "new_PrivateContact" RENAME TO "PrivateContact";
CREATE TABLE "new_Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "publicEmail" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "socialLinks" JSONB NOT NULL,
    "avatarPath" TEXT,
    "resumePath" TEXT,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Profile" ("avatarPath", "bio", "id", "location", "name", "publicEmail", "resumePath", "socialLinks", "tagline", "updatedAt") SELECT "avatarPath", "bio", "id", "location", "name", "publicEmail", "resumePath", "socialLinks", "tagline", "updatedAt" FROM "Profile";
DROP TABLE "Profile";
ALTER TABLE "new_Profile" RENAME TO "Profile";
CREATE TABLE "new_Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "techStack" JSONB NOT NULL,
    "repoUrl" TEXT,
    "liveUrl" TEXT,
    "images" JSONB NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Project" ("createdAt", "description", "featured", "id", "images", "liveUrl", "repoUrl", "slug", "sortIndex", "status", "summary", "techStack", "title", "updatedAt") SELECT "createdAt", "description", "featured", "id", "images", "liveUrl", "repoUrl", "slug", "sortIndex", "status", "summary", "techStack", "title", "updatedAt" FROM "Project";
DROP TABLE "Project";
ALTER TABLE "new_Project" RENAME TO "Project";
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_sortIndex_idx" ON "Project"("sortIndex");
CREATE TABLE "new_Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "proficiency" INTEGER,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Skill" ("category", "createdAt", "id", "name", "proficiency", "sortIndex", "updatedAt") SELECT "category", "createdAt", "id", "name", "proficiency", "sortIndex", "updatedAt" FROM "Skill";
DROP TABLE "Skill";
ALTER TABLE "new_Skill" RENAME TO "Skill";
CREATE INDEX "Skill_sortIndex_idx" ON "Skill"("sortIndex");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
