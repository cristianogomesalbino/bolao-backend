-- AlterTable
ALTER TABLE "PreferenciaNotificacao" ADD COLUMN "jogoLiberado" BOOLEAN NOT NULL DEFAULT true;

-- AlterEnum
ALTER TYPE "TipoNotificacao" ADD VALUE 'JOGO_LIBERADO';
