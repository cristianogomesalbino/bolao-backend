import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const temporadaId = '5f7ab440-3cc4-43fb-8bfb-67042839a710';

  // Verificar se já existem fases
  const existentes = await prisma.fase.findMany({ where: { temporadaId } });
  if (existentes.length > 0) {
    console.log(`Já existem ${existentes.length} fases para esta temporada. Abortando.`);
    return;
  }

  const fases = [
    { nome: 'Grupo A', tipo: 'PONTOS_CORRIDOS' as const, ordem: 1 },
    { nome: 'Grupo B', tipo: 'PONTOS_CORRIDOS' as const, ordem: 2 },
    { nome: 'Grupo C', tipo: 'PONTOS_CORRIDOS' as const, ordem: 3 },
    { nome: 'Grupo D', tipo: 'PONTOS_CORRIDOS' as const, ordem: 4 },
    { nome: 'Grupo E', tipo: 'PONTOS_CORRIDOS' as const, ordem: 5 },
    { nome: 'Grupo F', tipo: 'PONTOS_CORRIDOS' as const, ordem: 6 },
    { nome: 'Grupo G', tipo: 'PONTOS_CORRIDOS' as const, ordem: 7 },
    { nome: 'Grupo H', tipo: 'PONTOS_CORRIDOS' as const, ordem: 8 },
    { nome: 'Grupo I', tipo: 'PONTOS_CORRIDOS' as const, ordem: 9 },
    { nome: 'Grupo J', tipo: 'PONTOS_CORRIDOS' as const, ordem: 10 },
    { nome: 'Grupo K', tipo: 'PONTOS_CORRIDOS' as const, ordem: 11 },
    { nome: 'Grupo L', tipo: 'PONTOS_CORRIDOS' as const, ordem: 12 },
    { nome: '32 Avos de Final', tipo: 'MATA_MATA' as const, ordem: 13 },
    { nome: 'Oitavas de Final', tipo: 'MATA_MATA' as const, ordem: 14 },
    { nome: 'Quartas de Final', tipo: 'MATA_MATA' as const, ordem: 15 },
    { nome: 'Semifinais', tipo: 'MATA_MATA' as const, ordem: 16 },
    { nome: 'Disputa 3º Lugar', tipo: 'MATA_MATA' as const, ordem: 17 },
    { nome: 'Final', tipo: 'MATA_MATA' as const, ordem: 18 },
  ];

  const criadas = await prisma.fase.createMany({
    data: fases.map((f) => ({
      ...f,
      idaVolta: false,
      temporadaId,
    })),
  });

  console.log(`✅ ${criadas.count} fases da Copa do Mundo 2026 criadas com sucesso!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
