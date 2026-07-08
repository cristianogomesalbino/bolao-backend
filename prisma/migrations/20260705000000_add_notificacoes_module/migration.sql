-- CreateEnum
CREATE TYPE "TipoNotificacao" AS ENUM ('JOGO_PROXIMO', 'RODADA_ENCERRADA', 'ACERTO_EM_CHEIO', 'SUBIU_POSICAO', 'DESCEU_POSICAO', 'PALPITES_PENDENTES');

-- CreateEnum
CREATE TYPE "StatusNotificacao" AS ENUM ('NAO_LIDA', 'LIDA');

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL,
    "tipo" "TipoNotificacao" NOT NULL,
    "titulo" VARCHAR(100) NOT NULL,
    "mensagem" VARCHAR(500) NOT NULL,
    "status" "StatusNotificacao" NOT NULL DEFAULT 'NAO_LIDA',
    "usuarioId" TEXT NOT NULL,
    "jogoId" TEXT,
    "grupoId" TEXT,
    "faseId" TEXT,
    "rodada" INTEGER,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataLeitura" TIMESTAMP(3),

    CONSTRAINT "Notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InscricaoPush" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "endpoint" VARCHAR(2048) NOT NULL,
    "p256dh" VARCHAR(128) NOT NULL,
    "auth" VARCHAR(48) NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InscricaoPush_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreferenciaNotificacao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "jogoProximo" BOOLEAN NOT NULL DEFAULT true,
    "rodadaEncerrada" BOOLEAN NOT NULL DEFAULT true,
    "acertoEmCheio" BOOLEAN NOT NULL DEFAULT true,
    "subiuPosicao" BOOLEAN NOT NULL DEFAULT true,
    "desceuPosicao" BOOLEAN NOT NULL DEFAULT true,
    "palpitesPendentes" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PreferenciaNotificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notificacao_usuarioId_status_dataCriacao_idx" ON "Notificacao"("usuarioId", "status", "dataCriacao");

-- CreateIndex
CREATE INDEX "Notificacao_usuarioId_dataCriacao_idx" ON "Notificacao"("usuarioId", "dataCriacao");

-- CreateIndex
CREATE INDEX "Notificacao_jogoId_tipo_idx" ON "Notificacao"("jogoId", "tipo");

-- CreateIndex
CREATE INDEX "Notificacao_faseId_rodada_tipo_idx" ON "Notificacao"("faseId", "rodada", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "InscricaoPush_usuarioId_endpoint_key" ON "InscricaoPush"("usuarioId", "endpoint");

-- CreateIndex
CREATE INDEX "InscricaoPush_usuarioId_idx" ON "InscricaoPush"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "PreferenciaNotificacao_usuarioId_key" ON "PreferenciaNotificacao"("usuarioId");

-- AddForeignKey
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InscricaoPush" ADD CONSTRAINT "InscricaoPush_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreferenciaNotificacao" ADD CONSTRAINT "PreferenciaNotificacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
