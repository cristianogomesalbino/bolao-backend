/*
  Warnings:

  - You are about to drop the column `timeDoCoracao` on the `Usuario` table. All the data in the column will be lost.
  - Added the required column `atualizadoEm` to the `Usuario` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('SUPER_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "GrupoRole" AS ENUM ('ADMIN', 'MEMBER');

-- AlterTable
ALTER TABLE "Usuario" DROP COLUMN "timeDoCoracao",
ADD COLUMN     "atualizadoEm" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "perfil" "Perfil" NOT NULL DEFAULT 'USER',
ALTER COLUMN "nome" SET DATA TYPE TEXT,
ALTER COLUMN "email" SET DATA TYPE TEXT,
ALTER COLUMN "senha" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "GrupoUsuario" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "role" "GrupoRole" NOT NULL DEFAULT 'MEMBER',
    "dataCriacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrupoUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GrupoUsuario_usuarioId_grupoId_key" ON "GrupoUsuario"("usuarioId", "grupoId");

-- AddForeignKey
ALTER TABLE "GrupoUsuario" ADD CONSTRAINT "GrupoUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrupoUsuario" ADD CONSTRAINT "GrupoUsuario_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
