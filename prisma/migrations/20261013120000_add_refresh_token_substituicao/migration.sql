-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN "substituidoPor" TEXT;
ALTER TABLE "RefreshToken" ADD COLUMN "substituidoEm" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RefreshToken_substituidoPor_idx" ON "RefreshToken"("substituidoPor");
