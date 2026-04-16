-- AlterTable
ALTER TABLE "Temporada" DROP COLUMN "campeonato",
ADD COLUMN     "campeonatoId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Campeonato" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campeonato_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Temporada" ADD CONSTRAINT "Temporada_campeonatoId_fkey" FOREIGN KEY ("campeonatoId") REFERENCES "Campeonato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
