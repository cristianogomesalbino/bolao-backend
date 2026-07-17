-- CreateEnum
CREATE TYPE "StatusEvento" AS ENUM ('PENDENTE', 'PROCESSANDO', 'PROCESSADO', 'FALHA_DEFINITIVA');

-- CreateTable
CREATE TABLE "EventoPendente" (
    "id" TEXT NOT NULL,
    "tipo" VARCHAR(50) NOT NULL,
    "chaveIdempotencia" VARCHAR(200) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "StatusEvento" NOT NULL DEFAULT 'PENDENTE',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimoErro" VARCHAR(500),
    "syncId" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processadoEm" TIMESTAMP(3),
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventoPendente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EventoPendente_chaveIdempotencia_key" ON "EventoPendente"("chaveIdempotencia");

-- CreateIndex
CREATE INDEX "EventoPendente_status_idx" ON "EventoPendente"("status");

-- CreateIndex
CREATE INDEX "EventoPendente_tipo_status_idx" ON "EventoPendente"("tipo", "status");
