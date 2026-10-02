-- Detail page URLs for experience and education (filled in by the app on first use).
ALTER TABLE "Experience" ADD COLUMN "slug" TEXT;
ALTER TABLE "Education" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "Experience_slug_key" ON "Experience"("slug");
CREATE UNIQUE INDEX "Education_slug_key" ON "Education"("slug");

-- Many-to-many links: experience <-> project, experience <-> education.
-- (Education has no direct link to projects: they hang off an experience.)
CREATE TABLE "_ExperienceToProject" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ExperienceToProject_A_fkey" FOREIGN KEY ("A") REFERENCES "Experience" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ExperienceToProject_B_fkey" FOREIGN KEY ("B") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "_ExperienceToProject_AB_unique" ON "_ExperienceToProject"("A", "B");
CREATE INDEX "_ExperienceToProject_B_index" ON "_ExperienceToProject"("B");

CREATE TABLE "_EducationToExperience" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_EducationToExperience_A_fkey" FOREIGN KEY ("A") REFERENCES "Education" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_EducationToExperience_B_fkey" FOREIGN KEY ("B") REFERENCES "Experience" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "_EducationToExperience_AB_unique" ON "_EducationToExperience"("A", "B");
CREATE INDEX "_EducationToExperience_B_index" ON "_EducationToExperience"("B");
