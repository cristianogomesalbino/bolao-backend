-- AlterEnum
ALTER TYPE "StatusJogo" ADD VALUE 'ADIADO';

-- AlterTable
ALTER TABLE "Jogo" ADD COLUMN     "foiAdiado" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "dataHora" DROP NOT NULL;
