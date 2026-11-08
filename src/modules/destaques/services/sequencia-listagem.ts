import { DESTAQUES } from '../destaques.constants';
import type { SequenciaCalculada } from './sequencia-resultado.calculo';

interface DestaqueSequencia {
  tipo: string;
  usuarioId: string;
  rodada: number | null;
  dados: Record<string, unknown>;
  usuario?: { id: string };
}

export async function manterMelhorSequenciaPorPessoa<
  T extends DestaqueSequencia,
>(
  destaques: T[],
  calcular: (
    usuarioId: string,
    rodada: number,
  ) => Promise<SequenciaCalculada | null>,
  pontosMinimos: number,
): Promise<T[]> {
  const vistos = new Set<string>();
  const saida: T[] = [];

  for (const item of destaques) {
    if (item.tipo !== 'SEQUENCIA_RESULTADO' || item.rodada == null) {
      saida.push(item);
      continue;
    }

    const pessoaId = item.usuario?.id || item.usuarioId;
    const chave = `${pessoaId}:${item.rodada}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    const melhor = await calcular(pessoaId, item.rodada);
    if (
      !melhor ||
      melhor.quantidade < DESTAQUES.LIMITES.SEQUENCIA_JOGOS_MINIMOS ||
      melhor.pontos < pontosMinimos
    )
      continue;

    saida.push({
      ...item,
      dados: {
        ...item.dados,
        quantidadeAcertos: melhor.quantidade,
        pontos: melhor.pontos,
        rodadaInicio: melhor.rodadaInicio,
        rodadaFim: melhor.rodadaFim,
        ultimosJogos: melhor.ultimosJogos,
      },
    });
  }

  return saida;
}
