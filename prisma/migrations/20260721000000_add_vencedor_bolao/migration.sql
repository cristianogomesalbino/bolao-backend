-- AlterTable
ALTER TABLE "PreferenciaNotificacao" ADD COLUMN "vencedorBolao" BOOLEAN NOT NULL DEFAULT true;

-- AlterEnum
ALTER TYPE "TipoNotificacao" ADD VALUE 'VENCEDOR_BOLAO';

-- CreateEnum
CREATE TYPE "StatusCampeonato" AS ENUM ('NAO_INICIADO', 'EM_ANDAMENTO', 'FINALIZADO');

-- AlterTable
ALTER TABLE "Campeonato" ADD COLUMN "status" "StatusCampeonato" NOT NULL DEFAULT 'NAO_INICIADO';
