-- CreateEnum
CREATE TYPE "TipoTokenDobro" AS ENUM ('CONCESSAO', 'UTILIZACAO');

-- CreateEnum
CREATE TYPE "MotivoTokenDobro" AS ENUM ('PALPITES_COMPLETOS', 'ACERTO_EM_CHEIO', 'ULTIMO_RANKING', 'PRIMEIRO_RANKING', 'ATIVACAO_DOBRO', 'CANCELAMENTO_DOBRO');

-- AlterTable
ALTER TABLE "Grupo" ADD COLUMN     "palpiteDobradoHabilitado" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Palpite" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "jogoId" TEXT NOT NULL,
    "golsCasa" INTEGER NOT NULL,
    "golsFora" INTEGER NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Palpite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PalpiteDobrado" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "jogoId" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PalpiteDobrado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenDobro" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "tipo" "TipoTokenDobro" NOT NULL,
    "motivo" "MotivoTokenDobro" NOT NULL,
    "referenciaId" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenDobro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Palpite_jogoId_idx" ON "Palpite"("jogoId");

-- CreateIndex
CREATE INDEX "Palpite_usuarioId_idx" ON "Palpite"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "Palpite_usuarioId_jogoId_key" ON "Palpite"("usuarioId", "jogoId");

-- CreateIndex
CREATE INDEX "PalpiteDobrado_jogoId_grupoId_idx" ON "PalpiteDobrado"("jogoId", "grupoId");

-- CreateIndex
CREATE UNIQUE INDEX "PalpiteDobrado_usuarioId_jogoId_grupoId_key" ON "PalpiteDobrado"("usuarioId", "jogoId", "grupoId");

-- CreateIndex
CREATE INDEX "TokenDobro_usuarioId_grupoId_idx" ON "TokenDobro"("usuarioId", "grupoId");

-- AddForeignKey
ALTER TABLE "Palpite" ADD CONSTRAINT "Palpite_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Palpite" ADD CONSTRAINT "Palpite_jogoId_fkey" FOREIGN KEY ("jogoId") REFERENCES "Jogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PalpiteDobrado" ADD CONSTRAINT "PalpiteDobrado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PalpiteDobrado" ADD CONSTRAINT "PalpiteDobrado_jogoId_fkey" FOREIGN KEY ("jogoId") REFERENCES "Jogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PalpiteDobrado" ADD CONSTRAINT "PalpiteDobrado_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenDobro" ADD CONSTRAINT "TokenDobro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenDobro" ADD CONSTRAINT "TokenDobro_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
