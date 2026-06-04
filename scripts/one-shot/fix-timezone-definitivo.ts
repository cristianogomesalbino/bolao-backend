/**
 * Fix DEFINITIVO de timezone.
 * Busca o horário correto da API do ge.globo.com para cada rodada
 * e atualiza o banco com o valor correto em UTC.
 * Idempotente — pode rodar quantas vezes quiser.
 *
 * Rodar: docker compose exec app-dev npx ts-node scripts/fix-timezone-definitivo.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FASE_ID = '82411617-91d1-415b-92fc-6fa41da22892';
const GE_BASE_URL = 'https://api.globoesporte.globo.com/tabela';
const BRASILEIRAO_ID = 'd1a37fa4-e948-43a6-ba53-ab24ab3a45b1';

async function buscarRodadaApi(rodada: number): Promise<any[]> {
  const fase = `fase-unica-campeonato-brasileiro-2026`;
  const url = `${GE_BASE_URL}/${BRASILEIRAO_ID}/fase/${fase}/rodada/${rodada}/jogos/`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function converterBrtParaUtc(dataRealizacao: string): Date {
  return new Date(`${dataRealizacao}-03:00`);
}

async function main() {
  console.log('=== Fix DEFINITIVO: Recalcular horários a partir da API ===\n');

  let totalCorrigidos = 0;
  let totalVerificados = 0;

  for (let rodada = 1; rodada <= 38; rodada++) {
    const jogosApi = await buscarRodadaApi(rodada);
    if (jogosApi.length === 0) {
      console.log(`  Rodada ${rodada}: API sem dados, pulando`);
      continue;
    }

    for (const jogoApi of jogosApi) {
      const externoId = String(jogoApi.id);
      const dataHoraCorreta = converterBrtParaUtc(jogoApi.data_realizacao);

      const jogo = await prisma.jogo.findFirst({
        where: { externoId, faseId: FASE_ID },
        select: { id: true, dataHora: true },
      });

      if (!jogo) continue;
      totalVerificados++;

      if (!jogo.dataHora) {
        await prisma.jogo.update({
          where: { id: jogo.id },
          data: { dataHora: dataHoraCorreta },
        });
        totalCorrigidos++;
        continue;
      }

      const diff = Math.abs(jogo.dataHora.getTime() - dataHoraCorreta.getTime());
      if (diff > 60000) {
        await prisma.jogo.update({
          where: { id: jogo.id },
          data: { dataHora: dataHoraCorreta },
        });
        totalCorrigidos++;
      }
    }

    console.log(`  Rodada ${rodada}: ${jogosApi.length} jogos verificados`);
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`\n=== Resultado ===`);
  console.log(`Jogos verificados: ${totalVerificados}`);
  console.log(`Jogos corrigidos: ${totalCorrigidos}`);

  // Remover jogos com data epoch (jogos adiados importados sem data)
  const epochFix = await prisma.jogo.deleteMany({
    where: { faseId: FASE_ID, dataHora: { lt: new Date('2000-01-01') } },
  });
  if (epochFix.count > 0) {
    console.log(`Jogos com data inválida (epoch) removidos: ${epochFix.count}`);
  }

  // Validação
  const amostra = await prisma.$queryRaw<any[]>`
    SELECT j."dataHora", j.rodada, j."externoId", t.nome as time_casa
    FROM "Jogo" j
    JOIN "Time" t ON j."timeCasaId" = t.id
    WHERE j."faseId" = ${FASE_ID} AND j.rodada = 2
    ORDER BY j."dataHora"
    LIMIT 3
  `;
  console.log('\nValidação rodada 2 (Flamengo deve ser 22:00Z = 19:00 BRT):');
  amostra.forEach((j: any) => console.log(`  ${j.time_casa}: ${j.dataHora.toISOString()}`));
}

main()
  .catch((e) => {
    console.error('Erro:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
