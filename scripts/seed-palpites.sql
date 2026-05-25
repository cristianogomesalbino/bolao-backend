-- Gera palpites aleatórios para todos os membros do grupo "Cristiano"
-- em todos os jogos finalizados que ainda não têm palpite

INSERT INTO "Palpite" (id, "usuarioId", "jogoId", "golsCasa", "golsFora", "dataCriacao", "atualizadoEm")
SELECT 
  gen_random_uuid(),
  c."usuarioId",
  c."jogoId",
  floor(random() * 4)::int,
  floor(random() * 4)::int,
  NOW() - interval '1 day' * floor(random() * 30),
  NOW() - interval '1 day' * floor(random() * 30)
FROM (
  SELECT m."usuarioId", j.id as "jogoId"
  FROM (SELECT "usuarioId" FROM "GrupoUsuario" WHERE "grupoId" = '39014992-7c70-4f3c-ba31-1066d43b5557') m
  CROSS JOIN (SELECT id FROM "Jogo" WHERE status = 'FINALIZADO') j
) c
LEFT JOIN "Palpite" p ON p."usuarioId" = c."usuarioId" AND p."jogoId" = c."jogoId"
WHERE p.id IS NULL;
