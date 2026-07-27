-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GROUP',
    "city" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "contactUserId" TEXT NOT NULL,
    "demoFileName" TEXT,
    "demoFileUrl" TEXT,
    "demoLinkUrl" TEXT,
    "extraFieldsJson" TEXT,
    "kvkkAcceptedAt" DATETIME NOT NULL,
    "fsekAcceptedAt" DATETIME NOT NULL,
    "reviewNote" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_contactUserId_fkey" FOREIGN KEY ("contactUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Application" ("city", "contactUserId", "demoFileName", "demoFileUrl", "demoLinkUrl", "extraFieldsJson", "fsekAcceptedAt", "groupName", "id", "kvkkAcceptedAt", "reference", "reviewNote", "status", "submittedAt", "type", "updatedAt") SELECT "city", "contactUserId", "demoFileName", "demoFileUrl", "demoLinkUrl", "extraFieldsJson", "fsekAcceptedAt", "groupName", "id", "kvkkAcceptedAt", "reference", "reviewNote", "status", "submittedAt", "type", "updatedAt" FROM "Application";
DROP TABLE "Application";
ALTER TABLE "new_Application" RENAME TO "Application";
CREATE UNIQUE INDEX "Application_reference_key" ON "Application"("reference");
CREATE INDEX "Application_status_idx" ON "Application"("status");
CREATE INDEX "Application_city_idx" ON "Application"("city");
CREATE INDEX "Application_submittedAt_idx" ON "Application"("submittedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
