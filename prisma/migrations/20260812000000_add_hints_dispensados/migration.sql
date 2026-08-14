-- AddColumn (idempotente — ignora se já existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Usuario' AND column_name = 'dicasDispensadas'
  ) THEN
    ALTER TABLE "Usuario" ADD COLUMN "dicasDispensadas" TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Usuario' AND column_name = 'toast_descobrilidade_visto'
  ) THEN
    ALTER TABLE "Usuario" ADD COLUMN "toast_descobrilidade_visto" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END
$$;
