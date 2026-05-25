-- Dar acertos em cheio na rodada 17 para alguns usuários (causar mudança no ranking)
-- Cristiano: acerta 6 jogos em cheio (vai subir muito)
UPDATE "Palpite" SET "golsCasa" = 1, "golsFora" = 1 WHERE "usuarioId" = '89ecd520-bac4-4b39-86a5-2fd7d456685c' AND "jogoId" = 'a93cb902-4479-4573-86ba-f6391a357e2f';
UPDATE "Palpite" SET "golsCasa" = 2, "golsFora" = 0 WHERE "usuarioId" = '89ecd520-bac4-4b39-86a5-2fd7d456685c' AND "jogoId" = '445ab5b6-e144-44ef-8463-29b43980af89';
UPDATE "Palpite" SET "golsCasa" = 1, "golsFora" = 0 WHERE "usuarioId" = '89ecd520-bac4-4b39-86a5-2fd7d456685c' AND "jogoId" = '2fd1478d-4ef0-4f77-bd5e-c1361a3559b2';
UPDATE "Palpite" SET "golsCasa" = 3, "golsFora" = 2 WHERE "usuarioId" = '89ecd520-bac4-4b39-86a5-2fd7d456685c' AND "jogoId" = '0708653c-3faf-4224-b767-d099815de3bc';
UPDATE "Palpite" SET "golsCasa" = 0, "golsFora" = 3 WHERE "usuarioId" = '89ecd520-bac4-4b39-86a5-2fd7d456685c' AND "jogoId" = '39e190ec-fbe7-456f-a73d-d7bdc9f12d4f';
UPDATE "Palpite" SET "golsCasa" = 2, "golsFora" = 1 WHERE "usuarioId" = '89ecd520-bac4-4b39-86a5-2fd7d456685c' AND "jogoId" = 'c94a2145-ebe1-454b-85ff-326b804db1c8';

-- Fernanda Dias: acerta 5 em cheio (vai subir)
UPDATE "Palpite" SET "golsCasa" = 1, "golsFora" = 1 WHERE "usuarioId" = '52ab8cb2-c244-4577-a9dd-49a9ab79b0eb' AND "jogoId" = 'a93cb902-4479-4573-86ba-f6391a357e2f';
UPDATE "Palpite" SET "golsCasa" = 2, "golsFora" = 0 WHERE "usuarioId" = '52ab8cb2-c244-4577-a9dd-49a9ab79b0eb' AND "jogoId" = '445ab5b6-e144-44ef-8463-29b43980af89';
UPDATE "Palpite" SET "golsCasa" = 1, "golsFora" = 0 WHERE "usuarioId" = '52ab8cb2-c244-4577-a9dd-49a9ab79b0eb' AND "jogoId" = '2fd1478d-4ef0-4f77-bd5e-c1361a3559b2';
UPDATE "Palpite" SET "golsCasa" = 0, "golsFora" = 3 WHERE "usuarioId" = '52ab8cb2-c244-4577-a9dd-49a9ab79b0eb' AND "jogoId" = '39e190ec-fbe7-456f-a73d-d7bdc9f12d4f';
UPDATE "Palpite" SET "golsCasa" = 1, "golsFora" = 2 WHERE "usuarioId" = '52ab8cb2-c244-4577-a9dd-49a9ab79b0eb' AND "jogoId" = 'bc5abe8a-811b-475f-b5af-6a760f1c077b';

-- Lucas Silva: erra tudo na rodada 17 (vai descer)
UPDATE "Palpite" SET "golsCasa" = 3, "golsFora" = 0 WHERE "usuarioId" = 'c683449a-0fb3-4297-8e4a-36d20036a9cb' AND "jogoId" = 'a93cb902-4479-4573-86ba-f6391a357e2f';
UPDATE "Palpite" SET "golsCasa" = 0, "golsFora" = 2 WHERE "usuarioId" = 'c683449a-0fb3-4297-8e4a-36d20036a9cb' AND "jogoId" = '445ab5b6-e144-44ef-8463-29b43980af89';
UPDATE "Palpite" SET "golsCasa" = 0, "golsFora" = 3 WHERE "usuarioId" = 'c683449a-0fb3-4297-8e4a-36d20036a9cb' AND "jogoId" = '2fd1478d-4ef0-4f77-bd5e-c1361a3559b2';
UPDATE "Palpite" SET "golsCasa" = 0, "golsFora" = 0 WHERE "usuarioId" = 'c683449a-0fb3-4297-8e4a-36d20036a9cb' AND "jogoId" = '0708653c-3faf-4224-b767-d099815de3bc';
UPDATE "Palpite" SET "golsCasa" = 3, "golsFora" = 0 WHERE "usuarioId" = 'c683449a-0fb3-4297-8e4a-36d20036a9cb' AND "jogoId" = '39e190ec-fbe7-456f-a73d-d7bdc9f12d4f';
UPDATE "Palpite" SET "golsCasa" = 3, "golsFora" = 3 WHERE "usuarioId" = 'c683449a-0fb3-4297-8e4a-36d20036a9cb' AND "jogoId" = 'bc5abe8a-811b-475f-b5af-6a760f1c077b';
UPDATE "Palpite" SET "golsCasa" = 0, "golsFora" = 0 WHERE "usuarioId" = 'c683449a-0fb3-4297-8e4a-36d20036a9cb' AND "jogoId" = 'c94a2145-ebe1-454b-85ff-326b804db1c8';
UPDATE "Palpite" SET "golsCasa" = 3, "golsFora" = 3 WHERE "usuarioId" = 'c683449a-0fb3-4297-8e4a-36d20036a9cb' AND "jogoId" = '363d1e0f-659b-4ba5-8e25-1657125330a7';

-- João Silva: acerta 4 em cheio (vai subir)
UPDATE "Palpite" SET "golsCasa" = 3, "golsFora" = 2 WHERE "usuarioId" = '569e53ac-58b0-4a53-adc0-e03310c97c58' AND "jogoId" = '0708653c-3faf-4224-b767-d099815de3bc';
UPDATE "Palpite" SET "golsCasa" = 0, "golsFora" = 3 WHERE "usuarioId" = '569e53ac-58b0-4a53-adc0-e03310c97c58' AND "jogoId" = '39e190ec-fbe7-456f-a73d-d7bdc9f12d4f';
UPDATE "Palpite" SET "golsCasa" = 1, "golsFora" = 2 WHERE "usuarioId" = '569e53ac-58b0-4a53-adc0-e03310c97c58' AND "jogoId" = 'bc5abe8a-811b-475f-b5af-6a760f1c077b';
UPDATE "Palpite" SET "golsCasa" = 1, "golsFora" = 0 WHERE "usuarioId" = '569e53ac-58b0-4a53-adc0-e03310c97c58' AND "jogoId" = '363d1e0f-659b-4ba5-8e25-1657125330a7';

-- Pedro Oliveira: erra tudo (vai descer)
UPDATE "Palpite" SET "golsCasa" = 3, "golsFora" = 3 WHERE "usuarioId" = 'ce1bc215-9792-4d2a-95b8-74ba07688632' AND "jogoId" = 'a93cb902-4479-4573-86ba-f6391a357e2f';
UPDATE "Palpite" SET "golsCasa" = 0, "golsFora" = 3 WHERE "usuarioId" = 'ce1bc215-9792-4d2a-95b8-74ba07688632' AND "jogoId" = '445ab5b6-e144-44ef-8463-29b43980af89';
UPDATE "Palpite" SET "golsCasa" = 3, "golsFora" = 3 WHERE "usuarioId" = 'ce1bc215-9792-4d2a-95b8-74ba07688632' AND "jogoId" = '2fd1478d-4ef0-4f77-bd5e-c1361a3559b2';
UPDATE "Palpite" SET "golsCasa" = 0, "golsFora" = 0 WHERE "usuarioId" = 'ce1bc215-9792-4d2a-95b8-74ba07688632' AND "jogoId" = '0708653c-3faf-4224-b767-d099815de3bc';
UPDATE "Palpite" SET "golsCasa" = 3, "golsFora" = 0 WHERE "usuarioId" = 'ce1bc215-9792-4d2a-95b8-74ba07688632' AND "jogoId" = '39e190ec-fbe7-456f-a73d-d7bdc9f12d4f';
UPDATE "Palpite" SET "golsCasa" = 3, "golsFora" = 0 WHERE "usuarioId" = 'ce1bc215-9792-4d2a-95b8-74ba07688632' AND "jogoId" = 'bc5abe8a-811b-475f-b5af-6a760f1c077b';
UPDATE "Palpite" SET "golsCasa" = 0, "golsFora" = 0 WHERE "usuarioId" = 'ce1bc215-9792-4d2a-95b8-74ba07688632' AND "jogoId" = 'c94a2145-ebe1-454b-85ff-326b804db1c8';
UPDATE "Palpite" SET "golsCasa" = 0, "golsFora" = 3 WHERE "usuarioId" = 'ce1bc215-9792-4d2a-95b8-74ba07688632' AND "jogoId" = '363d1e0f-659b-4ba5-8e25-1657125330a7';

-- Bruno Almeida: acerta 3 em cheio
UPDATE "Palpite" SET "golsCasa" = 1, "golsFora" = 1 WHERE "usuarioId" = 'd112abc1-ec0d-4af4-b91a-7ffbbd6f179d' AND "jogoId" = 'a93cb902-4479-4573-86ba-f6391a357e2f';
UPDATE "Palpite" SET "golsCasa" = 2, "golsFora" = 1 WHERE "usuarioId" = 'd112abc1-ec0d-4af4-b91a-7ffbbd6f179d' AND "jogoId" = 'c94a2145-ebe1-454b-85ff-326b804db1c8';
UPDATE "Palpite" SET "golsCasa" = 1, "golsFora" = 0 WHERE "usuarioId" = 'd112abc1-ec0d-4af4-b91a-7ffbbd6f179d' AND "jogoId" = '363d1e0f-659b-4ba5-8e25-1657125330a7';
