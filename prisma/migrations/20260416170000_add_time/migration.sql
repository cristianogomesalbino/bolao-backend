-- CreateTable
CREATE TABLE "Time" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "escudo" TEXT,
    "externoId" TEXT,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Time_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Time_sigla_key" ON "Time"("sigla");

-- CreateIndex
CREATE UNIQUE INDEX "Time_externoId_key" ON "Time"("externoId");

-- CreateIndex (for Jogo FK)
CREATE INDEX "Jogo_timeCasaId_idx" ON "Jogo"("timeCasaId");
CREATE INDEX "Jogo_timeForaId_idx" ON "Jogo"("timeForaId");
