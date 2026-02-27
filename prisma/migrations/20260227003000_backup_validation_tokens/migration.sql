-- CreateTable
CREATE TABLE "BackupValidationToken" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackupValidationToken_pkey" PRIMARY KEY ("token")
);

-- CreateIndex
CREATE INDEX "BackupValidationToken_userId_expiresAt_idx" ON "BackupValidationToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "BackupValidationToken_expiresAt_idx" ON "BackupValidationToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "BackupValidationToken" ADD CONSTRAINT "BackupValidationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
