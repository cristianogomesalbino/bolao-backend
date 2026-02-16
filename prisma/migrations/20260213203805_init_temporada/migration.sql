-- CreateTable
CREATE TABLE "Temporada" (
    "id" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "campeonato" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Temporada_pkey" PRIMARY KEY ("id")
);
