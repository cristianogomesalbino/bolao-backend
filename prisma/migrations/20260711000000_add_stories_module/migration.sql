-- CreateEnum
CREATE TYPE "TipoStory" AS ENUM ('ACERTOU_EM_CHEIO', 'UNICO_NA_MOSCA', 'SUBIU_RANKING', 'SEQUENCIA_MOSCA', 'SEQUENCIA_RESULTADO', 'NAO_PALPITOU', 'DOBROU_E_ACERTOU');

-- CreateEnum
CREATE TYPE "CategoriaRecorde" AS ENUM ('MOSCA', 'RESULTADO');

-- AlterEnum
ALTER TYPE "TipoNotificacao" ADD VALUE 'STORIES_GRUPO';
ALTER TYPE "TipoNotificacao" ADD VALUE 'RECEBEU_F';

-- AlterTable
ALTER TABLE "PreferenciaNotificacao" ADD COLUMN "storiesGrupo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "PreferenciaNotificacao" ADD COLUMN "recebeuF" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "jogoId" TEXT NOT NULL,
    "rodada" INTEGER,
    "tipo" "TipoStory" NOT NULL,
    "dados" JSONB NOT NULL,
    "titulo" VARCHAR(100) NOT NULL,
    "contadorFs" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryReacao" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "remetenteId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryReacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryVisualizacao" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "visualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoryVisualizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordeSequencia" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "temporadaId" TEXT NOT NULL,
    "categoria" "CategoriaRecorde" NOT NULL,
    "valor" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordeSequencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordeDetentor" (
    "id" TEXT NOT NULL,
    "recordeId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "atingidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordeDetentor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingSnapshot" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "faseId" TEXT NOT NULL,
    "rodada" INTEGER,
    "posicao" INTEGER NOT NULL,
    "pontuacao" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Story_grupoId_usuarioId_jogoId_tipo_key" ON "Story"("grupoId", "usuarioId", "jogoId", "tipo");

-- CreateIndex
CREATE INDEX "Story_grupoId_criadoEm_idx" ON "Story"("grupoId", "criadoEm");

-- CreateIndex
CREATE INDEX "Story_grupoId_usuarioId_idx" ON "Story"("grupoId", "usuarioId");

-- CreateIndex
CREATE INDEX "Story_grupoId_rodada_idx" ON "Story"("grupoId", "rodada");

-- CreateIndex
CREATE UNIQUE INDEX "StoryReacao_remetenteId_storyId_key" ON "StoryReacao"("remetenteId", "storyId");

-- CreateIndex
CREATE INDEX "StoryReacao_storyId_idx" ON "StoryReacao"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "StoryVisualizacao_storyId_usuarioId_key" ON "StoryVisualizacao"("storyId", "usuarioId");

-- CreateIndex
CREATE INDEX "StoryVisualizacao_storyId_idx" ON "StoryVisualizacao"("storyId");

-- CreateIndex
CREATE INDEX "StoryVisualizacao_usuarioId_idx" ON "StoryVisualizacao"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordeSequencia_grupoId_temporadaId_categoria_key" ON "RecordeSequencia"("grupoId", "temporadaId", "categoria");

-- CreateIndex
CREATE INDEX "RecordeSequencia_grupoId_temporadaId_idx" ON "RecordeSequencia"("grupoId", "temporadaId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordeDetentor_recordeId_usuarioId_key" ON "RecordeDetentor"("recordeId", "usuarioId");

-- CreateIndex
CREATE INDEX "RecordeDetentor_recordeId_idx" ON "RecordeDetentor"("recordeId");

-- CreateIndex
CREATE UNIQUE INDEX "RankingSnapshot_grupoId_usuarioId_faseId_rodada_key" ON "RankingSnapshot"("grupoId", "usuarioId", "faseId", "rodada");

-- CreateIndex
CREATE INDEX "RankingSnapshot_grupoId_faseId_rodada_idx" ON "RankingSnapshot"("grupoId", "faseId", "rodada");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_jogoId_fkey" FOREIGN KEY ("jogoId") REFERENCES "Jogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryReacao" ADD CONSTRAINT "StoryReacao_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryVisualizacao" ADD CONSTRAINT "StoryVisualizacao_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryVisualizacao" ADD CONSTRAINT "StoryVisualizacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordeSequencia" ADD CONSTRAINT "RecordeSequencia_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordeSequencia" ADD CONSTRAINT "RecordeSequencia_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordeDetentor" ADD CONSTRAINT "RecordeDetentor_recordeId_fkey" FOREIGN KEY ("recordeId") REFERENCES "RecordeSequencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingSnapshot" ADD CONSTRAINT "RankingSnapshot_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
