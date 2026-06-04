const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const tid = '5f7ab440-3cc4-43fb-8bfb-67042839a710';

async function run() {
  const fases = await p.fase.findMany({
    where: { temporadaId: tid },
    orderBy: [{ ordem: 'asc' }, { dataCriacao: 'asc' }],
  });
  const vistos = new Set();
  const aDeletar = [];
  for (const f of fases) {
    if (vistos.has(f.ordem)) {
      aDeletar.push(f.id);
    } else {
      vistos.add(f.ordem);
    }
  }
  if (aDeletar.length > 0) {
    await p.fase.deleteMany({ where: { id: { in: aDeletar } } });
  }
  console.log(`${aDeletar.length} removidas, ${vistos.size} mantidas`);
}

run().catch(console.error).finally(() => p.$disconnect());
