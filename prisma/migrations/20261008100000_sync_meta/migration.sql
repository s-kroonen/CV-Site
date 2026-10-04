-- State marker for two-host sync (see docs/REDUNDANCY.md). Triggers on every data table bump it on any change.
CREATE TABLE "SyncMeta" (
    "id" INTEGER NOT NULL PRIMARY KEY,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "token" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "SyncMeta" ("id", "revision", "token") VALUES (1, 0, hex(randomblob(8)));

CREATE TRIGGER "sync_AdminPasskey_ai" AFTER INSERT ON "AdminPasskey" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_AdminPasskey_au" AFTER UPDATE ON "AdminPasskey" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_AdminPasskey_ad" AFTER DELETE ON "AdminPasskey" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_ApiToken_ai" AFTER INSERT ON "ApiToken" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_ApiToken_au" AFTER UPDATE ON "ApiToken" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_ApiToken_ad" AFTER DELETE ON "ApiToken" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_AuditLog_ai" AFTER INSERT ON "AuditLog" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_AuditLog_au" AFTER UPDATE ON "AuditLog" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_AuditLog_ad" AFTER DELETE ON "AuditLog" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_ContactMessage_ai" AFTER INSERT ON "ContactMessage" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_ContactMessage_au" AFTER UPDATE ON "ContactMessage" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_ContactMessage_ad" AFTER DELETE ON "ContactMessage" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Education_ai" AFTER INSERT ON "Education" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Education_au" AFTER UPDATE ON "Education" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Education_ad" AFTER DELETE ON "Education" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Experience_ai" AFTER INSERT ON "Experience" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Experience_au" AFTER UPDATE ON "Experience" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Experience_ad" AFTER DELETE ON "Experience" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_OAuthClient_ai" AFTER INSERT ON "OAuthClient" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_OAuthClient_au" AFTER UPDATE ON "OAuthClient" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_OAuthClient_ad" AFTER DELETE ON "OAuthClient" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_OAuthCode_ai" AFTER INSERT ON "OAuthCode" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_OAuthCode_au" AFTER UPDATE ON "OAuthCode" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_OAuthCode_ad" AFTER DELETE ON "OAuthCode" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_OAuthGrant_ai" AFTER INSERT ON "OAuthGrant" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_OAuthGrant_au" AFTER UPDATE ON "OAuthGrant" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_OAuthGrant_ad" AFTER DELETE ON "OAuthGrant" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_PrivateContact_ai" AFTER INSERT ON "PrivateContact" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_PrivateContact_au" AFTER UPDATE ON "PrivateContact" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_PrivateContact_ad" AFTER DELETE ON "PrivateContact" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Profile_ai" AFTER INSERT ON "Profile" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Profile_au" AFTER UPDATE ON "Profile" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Profile_ad" AFTER DELETE ON "Profile" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Project_ai" AFTER INSERT ON "Project" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Project_au" AFTER UPDATE ON "Project" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Project_ad" AFTER DELETE ON "Project" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Skill_ai" AFTER INSERT ON "Skill" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Skill_au" AFTER UPDATE ON "Skill" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Skill_ad" AFTER DELETE ON "Skill" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Translation_ai" AFTER INSERT ON "Translation" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Translation_au" AFTER UPDATE ON "Translation" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync_Translation_ad" AFTER DELETE ON "Translation" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync__EducationToExperience_ai" AFTER INSERT ON "_EducationToExperience" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync__EducationToExperience_au" AFTER UPDATE ON "_EducationToExperience" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync__EducationToExperience_ad" AFTER DELETE ON "_EducationToExperience" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync__ExperienceToProject_ai" AFTER INSERT ON "_ExperienceToProject" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync__ExperienceToProject_au" AFTER UPDATE ON "_ExperienceToProject" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
CREATE TRIGGER "sync__ExperienceToProject_ad" AFTER DELETE ON "_ExperienceToProject" BEGIN UPDATE "SyncMeta" SET "revision" = "revision" + 1, "token" = hex(randomblob(8)), "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = 1; END;
