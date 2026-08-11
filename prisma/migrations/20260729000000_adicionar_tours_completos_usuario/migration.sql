-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "toursCompletos" TEXT[] DEFAULT ARRAY[]::TEXT[];
