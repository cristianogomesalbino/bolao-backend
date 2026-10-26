-- The legacy rename migration drops these constraints before recreating the
-- empty Story tables as Destaque tables. The remote database lacks them.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Story_grupoId_fkey') THEN
    ALTER TABLE "Story" ADD CONSTRAINT "Story_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "Grupo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Story_usuarioId_fkey') THEN
    ALTER TABLE "Story" ADD CONSTRAINT "Story_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Story_jogoId_fkey') THEN
    ALTER TABLE "Story" ADD CONSTRAINT "Story_jogoId_fkey" FOREIGN KEY ("jogoId") REFERENCES "Jogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StoryReacao_storyId_fkey') THEN
    ALTER TABLE "StoryReacao" ADD CONSTRAINT "StoryReacao_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StoryVisualizacao_storyId_fkey') THEN
    ALTER TABLE "StoryVisualizacao" ADD CONSTRAINT "StoryVisualizacao_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StoryVisualizacao_usuarioId_fkey') THEN
    ALTER TABLE "StoryVisualizacao" ADD CONSTRAINT "StoryVisualizacao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
