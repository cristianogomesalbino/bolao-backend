-- Corrige FK de DestaqueReacao: remove usuarioId órfão e liga remetenteId a Usuario
ALTER TABLE "DestaqueReacao" DROP CONSTRAINT IF EXISTS "DestaqueReacao_usuarioId_fkey";
ALTER TABLE "DestaqueReacao" DROP COLUMN IF EXISTS "usuarioId";

-- Remove reações com remetente inválido antes de criar FK
DELETE FROM "DestaqueReacao" dr
WHERE NOT EXISTS (SELECT 1 FROM "Usuario" u WHERE u.id = dr."remetenteId");

ALTER TABLE "DestaqueReacao"
  ADD CONSTRAINT "DestaqueReacao_remetenteId_fkey"
  FOREIGN KEY ("remetenteId") REFERENCES "Usuario"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "DestaqueReacao_remetenteId_idx" ON "DestaqueReacao"("remetenteId");
