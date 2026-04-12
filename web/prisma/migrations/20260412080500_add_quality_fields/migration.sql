-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Chapter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "volumeId" TEXT NOT NULL,
    "arcId" TEXT,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "outline" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'outline',
    "endingMood" TEXT NOT NULL DEFAULT '',
    "unresolvedHooks" TEXT NOT NULL DEFAULT '',
    "nextChapterHint" TEXT NOT NULL DEFAULT '',
    "activeCharacters" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chapter_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "Volume" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Chapter_arcId_fkey" FOREIGN KEY ("arcId") REFERENCES "Arc" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Chapter" ("arcId", "content", "createdAt", "id", "outline", "sortOrder", "status", "summary", "title", "updatedAt", "volumeId", "wordCount") SELECT "arcId", "content", "createdAt", "id", "outline", "sortOrder", "status", "summary", "title", "updatedAt", "volumeId", "wordCount" FROM "Chapter";
DROP TABLE "Chapter";
ALTER TABLE "new_Chapter" RENAME TO "Chapter";
CREATE INDEX "Chapter_volumeId_sortOrder_idx" ON "Chapter"("volumeId", "sortOrder");
CREATE TABLE "new_Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'supporting',
    "profile" TEXT NOT NULL DEFAULT '',
    "personality" TEXT NOT NULL DEFAULT '',
    "appearance" TEXT NOT NULL DEFAULT '',
    "background" TEXT NOT NULL DEFAULT '',
    "voiceSamples" TEXT NOT NULL DEFAULT '',
    "speechPattern" TEXT NOT NULL DEFAULT '',
    "verbalHabits" TEXT NOT NULL DEFAULT '',
    "behaviorPattern" TEXT NOT NULL DEFAULT '',
    "currentState" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Character_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Character" ("appearance", "background", "createdAt", "id", "name", "novelId", "personality", "profile", "role", "updatedAt") SELECT "appearance", "background", "createdAt", "id", "name", "novelId", "personality", "profile", "role", "updatedAt" FROM "Character";
DROP TABLE "Character";
ALTER TABLE "new_Character" RENAME TO "Character";
CREATE INDEX "Character_novelId_idx" ON "Character"("novelId");
CREATE TABLE "new_Foreshadow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "novelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'planted',
    "plantedAt" TEXT NOT NULL DEFAULT '',
    "resolvedAt" TEXT NOT NULL DEFAULT '',
    "hintStrategy" TEXT NOT NULL DEFAULT '',
    "targetResolve" TEXT NOT NULL DEFAULT '',
    "urgency" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Foreshadow_novelId_fkey" FOREIGN KEY ("novelId") REFERENCES "Novel" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Foreshadow" ("createdAt", "description", "id", "novelId", "plantedAt", "resolvedAt", "status", "title", "updatedAt") SELECT "createdAt", "description", "id", "novelId", "plantedAt", "resolvedAt", "status", "title", "updatedAt" FROM "Foreshadow";
DROP TABLE "Foreshadow";
ALTER TABLE "new_Foreshadow" RENAME TO "Foreshadow";
CREATE INDEX "Foreshadow_novelId_status_idx" ON "Foreshadow"("novelId", "status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
