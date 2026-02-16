/*
  Warnings:

  - You are about to drop the column `campeonato` on the `Temporada` table. All the data in the column will be lost.
  - Added the required column `campeonatoId` to the `Temporada` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Temporada" DROP COLUMN "campeonato",
ADD COLUMN     "campeonatoId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Campeonato" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Campeonato_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Temporada" ADD CONSTRAINT "Temporada_campeonatoId_fkey" FOREIGN KEY ("campeonatoId") REFERENCES "Campeonato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
