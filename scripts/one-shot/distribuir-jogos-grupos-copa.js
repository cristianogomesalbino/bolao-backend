const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const TEMPORADA_COPA = '5f7ab440-3cc4-43fb-8bfb-67042839a710';
const FASE_GRUPO_A = 'cbc24a71-ba52-49d5-bf8c-4bba61a76864'; // onde todos estão agora

async function run() {
  // Buscar fases de grupos (ordem 1-12)
  const fasesGrupos = await p.fase.findMany({
    where: { temporadaId: TEMPORADA_COPA, tipo: 'PONTOS_CORRIDOS' },
    orderBy: { ordem: 'asc' },
  });

  if (fasesGrupos.length !== 12) {
    console.log('Esperado 12 fases de grupos, encontrado ' + fasesGrupos.length);
    return;
  }

  // Buscar jogos da rodada 1 ordenados por data (para determinar grupos)
  const jogosR1 = await p.jogo.findMany({
    where: { faseId: FASE_GRUPO_A, rodada: 1 },
    orderBy: { dataHora: 'asc' },
  });

  console.log('Jogos rodada 1: ' + jogosR1.length); // deve ser 24

  // Cada par de jogos consecutivos = um grupo
  // Grupo A = jogos[0,1], Grupo B = jogos[2,3], etc.
  const gruposPorTime = new Map(); // timeId -> faseId do grupo

  for (let i = 0; i < jogosR1.length; i += 2) {
    const grupoIdx = Math.floor(i / 2);
    const faseGrupo = fasesGrupos[grupoIdx];
    
    const jogo1 = jogosR1[i];
    const jogo2 = jogosR1[i + 1];

    // Marcar os 4 times deste grupo
    gruposPorTime.set(jogo1.timeCasaId, faseGrupo.id);
    gruposPorTime.set(jogo1.timeForaId, faseGrupo.id);
    if (jogo2) {
      gruposPorTime.set(jogo2.timeCasaId, faseGrupo.id);
      gruposPorTime.set(jogo2.timeForaId, faseGrupo.id);
    }

    console.log(`${faseGrupo.nome}: ${gruposPorTime.size} times mapeados`);
  }

  // Buscar TODOS os jogos (rodadas 1, 2 e 3) e redistribuir
  const todosJogos = await p.jogo.findMany({
    where: { faseId: FASE_GRUPO_A },
  });

  console.log('Total jogos para distribuir: ' + todosJogos.length);

  let movidos = 0;
  for (const jogo of todosJogos) {
    const faseDestino = gruposPorTime.get(jogo.timeCasaId);
    if (faseDestino && faseDestino !== FASE_GRUPO_A) {
      await p.jogo.update({
        where: { id: jogo.id },
        data: { faseId: faseDestino },
      });
      movidos++;
    }
  }

  console.log(`✅ ${movidos} jogos redistribuídos pelos grupos`);
  
  // Verificar resultado
  for (const fase of fasesGrupos) {
    const count = await p.jogo.count({ where: { faseId: fase.id } });
    console.log(`${fase.nome}: ${count} jogos`);
  }
}

run().catch(console.error).finally(() => p.$disconnect());
