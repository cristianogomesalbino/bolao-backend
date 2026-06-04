const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const TEMPORADA_COPA = '5f7ab440-3cc4-43fb-8bfb-67042839a710';

// Union-Find para agrupar times
class UnionFind {
  constructor() { this.parent = new Map(); }
  find(x) {
    if (!this.parent.has(x)) this.parent.set(x, x);
    if (this.parent.get(x) !== x) this.parent.set(x, this.find(this.parent.get(x)));
    return this.parent.get(x);
  }
  union(a, b) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent.set(ra, rb);
  }
}

async function run() {
  // Buscar fases de grupos (ordem 1-12)
  const fasesGrupos = await p.fase.findMany({
    where: { temporadaId: TEMPORADA_COPA, tipo: 'PONTOS_CORRIDOS' },
    orderBy: { ordem: 'asc' },
  });

  if (fasesGrupos.length !== 12) {
    console.log('Esperado 12 fases, encontrado ' + fasesGrupos.length);
    return;
  }

  // Buscar TODOS os jogos da Copa (em qualquer fase de grupo)
  const faseIds = fasesGrupos.map((f) => f.id);
  const todosJogos = await p.jogo.findMany({
    where: { faseId: { in: faseIds } },
  });

  console.log('Total jogos: ' + todosJogos.length);

  // Usar Union-Find para agrupar times que jogam entre si
  const uf = new UnionFind();
  for (const jogo of todosJogos) {
    uf.union(jogo.timeCasaId, jogo.timeForaId);
  }

  // Coletar grupos (cada grupo = set de times com mesmo root)
  const gruposPorRoot = new Map();
  const allTimeIds = new Set();
  for (const jogo of todosJogos) {
    allTimeIds.add(jogo.timeCasaId);
    allTimeIds.add(jogo.timeForaId);
  }

  for (const timeId of allTimeIds) {
    const root = uf.find(timeId);
    if (!gruposPorRoot.has(root)) gruposPorRoot.set(root, new Set());
    gruposPorRoot.get(root).add(timeId);
  }

  const grupos = [...gruposPorRoot.values()];
  console.log('Grupos identificados: ' + grupos.length);

  if (grupos.length !== 12) {
    console.log('ERRO: esperado 12 grupos, encontrado ' + grupos.length);
    for (const g of grupos) {
      console.log('  Grupo com ' + g.size + ' times');
    }
    return;
  }

  // Ordenar grupos pela data do primeiro jogo da rodada 1 (para manter A, B, C... em ordem cronológica)
  const gruposComData = grupos.map((timesSet) => {
    const jogosDoGrupo = todosJogos.filter(
      (j) => timesSet.has(j.timeCasaId) && timesSet.has(j.timeForaId) && j.rodada === 1
    );
    const primeiroJogo = jogosDoGrupo.sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())[0];
    return { times: timesSet, primeiraData: primeiroJogo ? new Date(primeiroJogo.dataHora).getTime() : Infinity };
  });

  gruposComData.sort((a, b) => a.primeiraData - b.primeiraData);

  // Mapear timeId → faseId
  const timeParaFase = new Map();
  for (let i = 0; i < 12; i++) {
    const faseGrupo = fasesGrupos[i];
    for (const timeId of gruposComData[i].times) {
      timeParaFase.set(timeId, faseGrupo.id);
    }
  }

  // Redistribuir todos os jogos
  let movidos = 0;
  for (const jogo of todosJogos) {
    const faseCorreta = timeParaFase.get(jogo.timeCasaId);
    if (faseCorreta && faseCorreta !== jogo.faseId) {
      await p.jogo.update({
        where: { id: jogo.id },
        data: { faseId: faseCorreta },
      });
      movidos++;
    }
  }

  console.log(`✅ ${movidos} jogos redistribuídos`);

  // Verificar resultado com nomes dos times
  for (let i = 0; i < 12; i++) {
    const fase = fasesGrupos[i];
    const jogos = await p.jogo.findMany({
      where: { faseId: fase.id, rodada: 1 },
      include: { timeCasa: true, timeFora: true },
    });
    const times = new Set();
    for (const j of jogos) {
      times.add(j.timeCasa.nome);
      times.add(j.timeFora.nome);
    }
    console.log(`${fase.nome}: ${[...times].join(', ')}`);
  }
}

run().catch(console.error).finally(() => p.$disconnect());
