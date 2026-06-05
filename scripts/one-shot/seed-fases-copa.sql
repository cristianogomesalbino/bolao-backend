-- Criar fases da Copa do Mundo 2026
-- Temporada ID: 5f7ab440-3cc4-43fb-8bfb-67042839a710

INSERT INTO "Fase" (id, nome, tipo, ordem, "idaVolta", "temporadaId", "dataCriacao", "atualizadoEm") VALUES
(gen_random_uuid(), 'Grupo A', 'PONTOS_CORRIDOS', 1, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Grupo B', 'PONTOS_CORRIDOS', 2, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Grupo C', 'PONTOS_CORRIDOS', 3, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Grupo D', 'PONTOS_CORRIDOS', 4, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Grupo E', 'PONTOS_CORRIDOS', 5, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Grupo F', 'PONTOS_CORRIDOS', 6, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Grupo G', 'PONTOS_CORRIDOS', 7, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Grupo H', 'PONTOS_CORRIDOS', 8, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Grupo I', 'PONTOS_CORRIDOS', 9, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Grupo J', 'PONTOS_CORRIDOS', 10, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Grupo K', 'PONTOS_CORRIDOS', 11, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Grupo L', 'PONTOS_CORRIDOS', 12, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), '32 Avos de Final', 'MATA_MATA', 13, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Oitavas de Final', 'MATA_MATA', 14, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Quartas de Final', 'MATA_MATA', 15, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Semifinais', 'MATA_MATA', 16, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Disputa 3º Lugar', 'MATA_MATA', 17, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW()),
(gen_random_uuid(), 'Final', 'MATA_MATA', 18, false, '5f7ab440-3cc4-43fb-8bfb-67042839a710', NOW(), NOW());
