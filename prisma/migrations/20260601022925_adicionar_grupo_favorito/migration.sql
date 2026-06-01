-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "grupoFavoritoId" TEXT;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_grupoFavoritoId_fkey" FOREIGN KEY ("grupoFavoritoId") REFERENCES "Grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;