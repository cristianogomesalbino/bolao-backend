-- CreateEnum
CREATE TYPE "TipoFase" AS ENUM ('PONTOS_CORRIDOS', 'MATA_MATA');

-- CreateEnum
CREATE TYPE "StatusJogo" AS ENUM ('AGENDADO', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "FonteResultado" AS ENUM ('MANUAL', 'API_FOOTBALL');

-- CreateTable
CREATE TABLE "Fase" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoFase" NOT NULL,
    "ordem" INTEGER NOT NULL,
    "idaVolta" BOOLEAN NOT NULL DEFAULT false,
    "temporadaId" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Fase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jogo" (
    "id" TEXT NOT NULL,
    "faseId" TEXT NOT NULL,
    "timeCasaId" TEXT NOT NULL,
    "timeForaId" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "status" "StatusJogo" NOT NULL DEFAULT 'AGENDADO',
    "golsCasa" INTEGER,
    "golsFora" INTEGER,
    "temProrrogacao" BOOLEAN NOT NULL DEFAULT false,
    "golsProrrogacaoCasa" INTEGER,
    "golsProrrogacaoFora" INTEGER,
    "temPenaltis" BOOLEAN NOT NULL DEFAULT false,
    "penaltisCasa" INTEGER,
    "penaltisFora" INTEGER,
    "vencedorId" TEXT,
    "ehJogoVolta" BOOLEAN NOT NULL DEFAULT false,
    "grupoIdaVolta" TEXT,
    "fonteResultado" "FonteResultado" NOT NULL DEFAULT 'MANUAL',
    "externoId" TEXT,
    "criadoPor" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Jogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Jogo_externoId_key" ON "Jogo"("externoId");

-- AddForeignKey
ALTER TABLE "Fase" ADD CONSTRAINT "Fase_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jogo" ADD CONSTRAINT "Jogo_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "Fase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
