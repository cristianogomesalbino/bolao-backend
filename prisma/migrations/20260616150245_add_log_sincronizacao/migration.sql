-- CreateEnum
CREATE TYPE "StatusSincronizacao" AS ENUM ('SUCESSO', 'PARCIAL', 'ERRO', 'SEM_JOGOS');

-- CreateTable
CREATE TABLE "LogSincronizacao" (
    "id" TEXT NOT NULL,
    "campeonatoSlug" TEXT NOT NULL,
    "fasesIds" TEXT[],
    "totalJogos" INTEGER NOT NULL,
    "sincronizados" INTEGER NOT NULL,
    "erros" INTEGER NOT NULL DEFAULT 0,
    "status" "StatusSincronizacao" NOT NULL,
    "mensagem" TEXT,
    "duracaoMs" INTEGER NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detalhes" JSONB,

    CONSTRAINT "LogSincronizacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogSincronizacao_campeonatoSlug_idx" ON "LogSincronizacao"("campeonatoSlug");

-- CreateIndex
CREATE INDEX "LogSincronizacao_dataCriacao_idx" ON "LogSincronizacao"("dataCriacao");

-- CreateIndex
CREATE INDEX "LogSincronizacao_status_idx" ON "LogSincronizacao"("status");
