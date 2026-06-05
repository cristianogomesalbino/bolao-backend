const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

// Fase Única do Brasileirão onde os jogos da Copa foram parar
const FASE_BRASILEIRAO = '82411617-91d1-415b-92fc-6fa41da22892';
// Temporada da Copa do Mundo
const TEMPORADA_COPA = '5f7ab440-3cc4-43fb-8bfb-67042839a710';

// Times de clubes brasileiros (Brasileirão Série A 2025)
const CLUBES_BRASILEIROS = [
  'Flamengo', 'Palmeiras', 'Corinthians', 'São Paulo', 'Fluminense',
  'Atlético-MG', 'Internacional', 'Grêmio', 'Botafogo', 'Vasco',
  'Cruzeiro', 'Fortaleza', 'Bahia', 'Santos', 'Athletico-PR',
  'Sport', 'Ceará', 'Mirassol', 'Vitória', 'Juventude',
  // Variações
  'Atlético Mineiro', 'Atlético', 'Red Bull Bragantino', 'Bragantino',
  'Cuiabá', 'Goiás', 'América-MG', 'América Mineiro', 'Coritiba',
];

async function run() {
  // Buscar fases da Copa no banco
  const fasesCopa = await p.fase.findMany({
    where: { temporadaId: TEMPORADA_COPA },
    orderBy: { ordem: 'asc' },
  });
  
  if (fasesCopa.length === 0) {
    console.log('Nenhuma fase da Copa encontrada. Rode o seed primeiro.');
    return;
  }

  // Primeira fase (Grupo A) será o destino padrão para os jogos da Copa
  // (depois pode distribuir por grupo real)
  const faseGrupoA = fasesCopa[0];
  
  console.log(`Fases da Copa: ${fasesCopa.length}`);
  console.log(`Destino padrão: ${faseGrupoA.nome} (${faseGrupoA.id})`);

  // Buscar jogos das rodadas 1-3 na fase do Brasileirão
  const jogosRodadas123 = await p.jogo.findMany({
    where: {
      faseId: FASE_BRASILEIRAO,
      rodada: { in: [1, 2, 3] },
    },
    include: {
      timeCasa: true,
      timeFora: true,
    },
  });

  console.log(`Total jogos rodadas 1-3: ${jogosRodadas123.length}`);

  // Identificar jogos da Copa (times que NÃO são clubes brasileiros)
  const jogosCopa = jogosRodadas123.filter((j) => {
    const casaEhClube = CLUBES_BRASILEIROS.some((c) => 
      j.timeCasa.nome.toLowerCase().includes(c.toLowerCase())
    );
    const foraEhClube = CLUBES_BRASILEIROS.some((c) => 
      j.timeFora.nome.toLowerCase().includes(c.toLowerCase())
    );
    return !casaEhClube && !foraEhClube;
  });

  console.log(`Jogos da Copa identificados: ${jogosCopa.length}`);

  if (jogosCopa.length === 0) {
    console.log('Nenhum jogo da Copa encontrado para mover.');
    return;
  }

  // Mover todos para a fase Grupo A (destino padrão)
  const ids = jogosCopa.map((j) => j.id);
  const result = await p.jogo.updateMany({
    where: { id: { in: ids } },
    data: { faseId: faseGrupoA.id },
  });

  console.log(`✅ ${result.count} jogos movidos para ${faseGrupoA.nome}`);
}

run().catch(console.error).finally(() => p.$disconnect());
