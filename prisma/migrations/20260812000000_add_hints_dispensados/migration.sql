-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "dicasDispensadas" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Usuario" ADD COLUMN "toast_descobrilidade_visto" BOOLEAN NOT NULL DEFAULT false;
