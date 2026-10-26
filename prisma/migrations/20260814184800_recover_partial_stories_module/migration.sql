-- Completes objects missing after the partial Stories module setup.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CategoriaRecorde') THEN
    CREATE TYPE "CategoriaRecorde" AS ENUM ('MOSCA', 'RESULTADO');
  END IF;

  -- A database that already applied the next migration has DESTAQUES_GRUPO.
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TipoNotificacao' AND e.enumlabel IN ('STORIES_GRUPO', 'DESTAQUES_GRUPO')
  ) THEN
    ALTER TYPE "TipoNotificacao" ADD VALUE 'STORIES_GRUPO';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TipoNotificacao' AND e.enumlabel = 'RECEBEU_F'
  ) THEN
    ALTER TYPE "TipoNotificacao" ADD VALUE 'RECEBEU_F';
  END IF;
END $$;

ALTER TABLE "PreferenciaNotificacao"
  ADD COLUMN IF NOT EXISTS "storiesGrupo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "recebeuF" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "RecordeSequencia" (
  "id" TEXT NOT NULL,
  "grupoId" TEXT NOT NULL,
  "temporadaId" TEXT NOT NULL,
  "categoria" "CategoriaRecorde" NOT NULL,
  "valor" INTEGER NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecordeSequencia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RecordeDetentor" (
  "id" TEXT NOT NULL,
  "recordeId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "atingidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecordeDetentor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RankingSnapshot" (
  "id" TEXT NOT NULL,
  "grupoId" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "faseId" TEXT NOT NULL,
  "rodada" INTEGER,
  "posicao" INTEGER NOT NULL,
  "pontuacao" INTEGER NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankingSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "RecordeSequencia_grupoId_temporadaId_categoria_key" ON "RecordeSequencia"("grupoId", "temporadaId", "categoria");
CREATE INDEX IF NOT EXISTS "RecordeSequencia_grupoId_temporadaId_idx" ON "RecordeSequencia"("grupoId", "temporadaId");
CREATE UNIQUE INDEX IF NOT EXISTS "RecordeDetentor_recordeId_usuarioId_key" ON "RecordeDetentor"("recordeId", "usuarioId");
CREATE INDEX IF NOT EXISTS "RecordeDetentor_recordeId_idx" ON "RecordeDetentor"("recordeId");
CREATE UNIQUE INDEX IF NOT EXISTS "RankingSnapshot_grupoId_usuarioId_faseId_rodada_key" ON "RankingSnapshot"("grupoId", "usuarioId", "faseId", "rodada");
CREATE INDEX IF NOT EXISTS "RankingSnapshot_grupoId_faseId_rodada_idx" ON "RankingSnapshot"("grupoId", "faseId", "rodada");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecordeSequencia_grupoId_fkey') THEN
    ALTER TABLE "RecordeSequencia" ADD CONSTRAINT "RecordeSequencia_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecordeSequencia_temporadaId_fkey') THEN
    ALTER TABLE "RecordeSequencia" ADD CONSTRAINT "RecordeSequencia_temporadaId_fkey" FOREIGN KEY ("temporadaId") REFERENCES "Temporada"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecordeDetentor_recordeId_fkey') THEN
    ALTER TABLE "RecordeDetentor" ADD CONSTRAINT "RecordeDetentor_recordeId_fkey" FOREIGN KEY ("recordeId") REFERENCES "RecordeSequencia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RankingSnapshot_grupoId_fkey') THEN
    ALTER TABLE "RankingSnapshot" ADD CONSTRAINT "RankingSnapshot_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
