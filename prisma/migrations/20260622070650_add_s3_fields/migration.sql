-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Endpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "endpointUrl" TEXT NOT NULL,
    "token" TEXT NOT NULL DEFAULT '',
    "accessKeyId" TEXT NOT NULL DEFAULT '',
    "secretKey" TEXT NOT NULL DEFAULT '',
    "bucket" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Endpoint" ("createdAt", "endpointUrl", "id", "name", "token") SELECT "createdAt", "endpointUrl", "id", "name", "token" FROM "Endpoint";
DROP TABLE "Endpoint";
ALTER TABLE "new_Endpoint" RENAME TO "Endpoint";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
