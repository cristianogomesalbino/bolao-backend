import { DESTAQUES } from '../destaques.constants';
import { pickTituloPanelinha } from '../destaques.titulos';

interface DestaqueSelecao {
  id: string;
  tipo: string;
  usuarioId: string;
  jogoId: string;
  rodada: number | null;
  criadoEm: Date;
  titulo: string;
  dados: Record<string, unknown>;
  usuario?: { id: string; nome?: string };
}

interface JogoEsquecidoListagem {
  jogoId: string;
  timeCasa: { nome: string; sigla: string; escudo: string | null };
  timeFora: { nome: string; sigla: string; escudo: string | null };
  golsCasa: number | null;
  golsFora: number | null;
}

/**
 * Remove NAO_PALPITOU sem jogo esquecido e atualiza a lista com o estado atual.
 */
export async function sincronizarNaoPalpitouNaListagem<
  T extends DestaqueSelecao,
>(
  destaques: T[],
  listarEsquecidos: (
    usuarioId: string,
    rodada: number,
  ) => Promise<JogoEsquecidoListagem[]>,
): Promise<T[]> {
  const saida: T[] = [];

  for (const item of destaques) {
    if (item.tipo !== 'NAO_PALPITOU' || item.rodada == null) {
      saida.push(item);
      continue;
    }

    const pessoaId = item.usuario?.id || item.usuarioId;
    const esquecidos = await listarEsquecidos(pessoaId, item.rodada);
    if (esquecidos.length === 0) continue;

    saida.push({
      ...item,
      dados: {
        ...item.dados,
        jogosEsquecidos: esquecidos,
        totalJogosRodada: esquecidos.length,
        rodada: item.rodada,
      },
    });
  }

  return saida;
}

/** Um card por pessoa/rodada para tipos que não devem repetir no feed. */
export function manterUmPorPessoaNaRodada<T extends DestaqueSelecao>(
  destaques: T[],
  tipo: string,
): T[] {
  const vistos = new Set<string>();
  const saida: T[] = [];

  for (const item of destaques) {
    if (item.tipo !== tipo || item.rodada == null) {
      saida.push(item);
      continue;
    }
    const pessoaId = item.usuario?.id || item.usuarioId;
    const chave = `${pessoaId}:${item.rodada}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(item);
  }

  return saida;
}

/**
 * 3+ pessoas no mesmo placar viram um único card de panelinha.
 * 1–2 cravadas no jogo continuam como cards individuais.
 */
export function consolidarAcertosPanelinha<T extends DestaqueSelecao>(
  destaques: T[],
): T[] {
  const minimo = DESTAQUES.LIMITES.ACERTOU_PANELINHA_MINIMO;
  const porJogo = new Map<string, T[]>();
  const outros: T[] = [];

  for (const item of destaques) {
    if (item.tipo !== 'ACERTOU_EM_CHEIO') {
      outros.push(item);
      continue;
    }
    const lista = porJogo.get(item.jogoId) ?? [];
    lista.push(item);
    porJogo.set(item.jogoId, lista);
  }

  const acertos: T[] = [];
  for (const grupo of porJogo.values()) {
    if (grupo.length < minimo) {
      acertos.push(...grupo);
      continue;
    }

    const base = [...grupo].sort(
      (a, b) => a.criadoEm.getTime() - b.criadoEm.getTime(),
    )[0];
    const participantes = grupo.map((item) => ({
      usuarioId: item.usuario?.id || item.usuarioId,
      nome: item.usuario?.nome?.trim() || 'Participante',
    }));
    const titulo = pickTituloPanelinha();

    acertos.push({
      ...base,
      titulo: titulo.title,
      usuario: {
        id: base.usuario?.id || base.usuarioId,
        nome: 'Panelinha',
      },
      dados: {
        ...base.dados,
        participantes,
      },
    });
  }

  return [...outros, ...acertos];
}

/**
 * Round-robin por prioridade de tipo, para nenhum tipo monopolizar o limite
 * (ex.: NAO_PALPITOU empurrando SUBIU_RANKING para fora).
 */
export function selecionarDestaquesDiversos<T extends DestaqueSelecao>(
  destaques: T[],
  limite: number,
  prioridades: Record<string, number>,
): T[] {
  if (destaques.length <= limite) return destaques;

  const porTipo = new Map<string, T[]>();
  for (const item of destaques) {
    const lista = porTipo.get(item.tipo) ?? [];
    lista.push(item);
    porTipo.set(item.tipo, lista);
  }
  for (const lista of porTipo.values()) {
    lista.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
  }

  const tipos = [...porTipo.keys()].sort(
    (a, b) => (prioridades[a] ?? 99) - (prioridades[b] ?? 99),
  );

  const saida: T[] = [];
  let aindaTem = true;
  while (saida.length < limite && aindaTem) {
    aindaTem = false;
    for (const tipo of tipos) {
      if (saida.length >= limite) break;
      const proximo = porTipo.get(tipo)?.shift();
      if (!proximo) continue;
      saida.push(proximo);
      aindaTem = true;
    }
  }
  return saida;
}
