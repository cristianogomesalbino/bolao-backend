-- CreateTable
CREATE TABLE "Grupo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "temporadaId" TEXT NOT NULL,
    "criadoPor" TEXT NOT NULL,
    "privado" BOOLEAN NOT NULL DEFAULT false,
    "codigoConvite" TEXT,
    "permitirPalpiteAutomatico" BOOLEAN NOT NULL DEFAULT false,
    "maxParticipantes" INTEGER NOT NULL DEFAULT 50,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "permitirPalpiteDobrado" BOOLEAN NOT NULL DEFAULT false,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grupo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Grupo_nome_key" ON "Grupo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Grupo_codigoConvite_key" ON "Grupo"("codigoConvite");

-- AddForeignKey
ALTER TABLE "Grupo" ADD CONSTRAINT "Grupo_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
