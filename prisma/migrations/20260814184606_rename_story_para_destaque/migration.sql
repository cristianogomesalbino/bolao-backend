/*
  Warnings:

  - You are about to drop the `Story` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StoryReacao` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StoryVisualizacao` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoDestaque" AS ENUM ('ACERTOU_EM_CHEIO', 'UNICO_NA_MOSCA', 'SUBIU_RANKING', 'SEQUENCIA_MOSCA', 'SEQUENCIA_RESULTADO', 'NAO_PALPITOU', 'DOBROU_E_ACERTOU');

-- DropForeignKey
ALTER TABLE "Story" DROP CONSTRAINT "Story_grupoId_fkey";

-- DropForeignKey
ALTER TABLE "Story" DROP CONSTRAINT "Story_jogoId_fkey";

-- DropForeignKey
ALTER TABLE "Story" DROP CONSTRAINT "Story_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "StoryReacao" DROP CONSTRAINT "StoryReacao_storyId_fkey";

-- DropForeignKey
ALTER TABLE "StoryVisualizacao" DROP CONSTRAINT "StoryVisualizacao_storyId_fkey";

-- DropForeignKey
ALTER TABLE "StoryVisualizacao" DROP CONSTRAINT "StoryVisualizacao_usuarioId_fkey";

-- DropTable
DROP TABLE "Story";

-- DropTable
DROP TABLE "StoryReacao";

-- DropTable
DROP TABLE "StoryVisualizacao";

-- DropEnum
DROP TYPE "TipoStory";

-- CreateTable
CREATE TABLE "Destaque" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "jogoId" TEXT NOT NULL,
    "rodada" INTEGER,
    "tipo" "TipoDestaque" NOT NULL,
    "dados" JSONB NOT NULL,
    "titulo" VARCHAR(100) NOT NULL,
    "contadorFs" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Destaque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestaqueReacao" (
    "id" TEXT NOT NULL,
    "destaqueId" TEXT NOT NULL,
    "remetenteId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,

    CONSTRAINT "DestaqueReacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DestaqueVisualizacao" (
    "id" TEXT NOT NULL,
    "destaqueId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "visualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DestaqueVisualizacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Destaque_grupoId_criadoEm_idx" ON "Destaque"("grupoId", "criadoEm");

-- CreateIndex
CREATE INDEX "Destaque_grupoId_usuarioId_idx" ON "Destaque"("grupoId", "usuarioId");

-- CreateIndex
CREATE INDEX "Destaque_grupoId_rodada_idx" ON "Destaque"("grupoId", "rodada");

-- CreateIndex
CREATE UNIQUE INDEX "Destaque_grupoId_usuarioId_jogoId_tipo_key" ON "Destaque"("grupoId", "usuarioId", "jogoId", "tipo");

-- CreateIndex
CREATE INDEX "DestaqueReacao_destaqueId_idx" ON "DestaqueReacao"("destaqueId");

-- CreateIndex
CREATE UNIQUE INDEX "DestaqueReacao_remetenteId_destaqueId_key" ON "DestaqueReacao"("remetenteId", "destaqueId");

-- CreateIndex
CREATE INDEX "DestaqueVisualizacao_destaqueId_idx" ON "DestaqueVisualizacao"("destaqueId");

-- CreateIndex
CREATE INDEX "DestaqueVisualizacao_usuarioId_idx" ON "DestaqueVisualizacao"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "DestaqueVisualizacao_destaqueId_usuarioId_key" ON "DestaqueVisualizacao"("destaqueId", "usuarioId");

-- AddForeignKey
ALTER TABLE "Destaque" ADD CONSTRAINT "Destaque_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destaque" ADD CONSTRAINT "Destaque_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Destaque" ADD CONSTRAINT "Destaque_jogoId_fkey" FOREIGN KEY ("jogoId") REFERENCES "Jogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestaqueReacao" ADD CONSTRAINT "DestaqueReacao_destaqueId_fkey" FOREIGN KEY ("destaqueId") REFERENCES "Destaque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestaqueReacao" ADD CONSTRAINT "DestaqueReacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestaqueVisualizacao" ADD CONSTRAINT "DestaqueVisualizacao_destaqueId_fkey" FOREIGN KEY ("destaqueId") REFERENCES "Destaque"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DestaqueVisualizacao" ADD CONSTRAINT "DestaqueVisualizacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
