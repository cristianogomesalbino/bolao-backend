import { describe, expect, it } from 'vitest';
import {
  consolidarAcertosPanelinha,
  manterUmPorPessoaNaRodada,
  selecionarDestaquesDiversos,
  sincronizarNaoPalpitouNaListagem,
} from '../../../../src/modules/destaques/services/destaque-selecao';

const PRIORIDADE = {
  NAO_PALPITOU: 2,
  SEQUENCIA_RESULTADO: 3,
  ACERTOU_EM_CHEIO: 4,
  SUBIU_RANKING: 5,
};

describe('destaque-selecao', () => {
  it('mantém um SUBIU_RANKING por pessoa na rodada', () => {
    const resultado = manterUmPorPessoaNaRodada(
      [
        card('s1', 'SUBIU_RANKING', 'user-1', 34),
        card('s2', 'SUBIU_RANKING', 'user-1', 34),
        card('s3', 'SUBIU_RANKING', 'user-2', 34),
        card('a1', 'ACERTOU_EM_CHEIO', 'user-1', 34),
      ],
      'SUBIU_RANKING',
    );

    expect(resultado.map((item) => item.id)).toEqual(['s1', 's3', 'a1']);
  });

  it('não deixa um tipo monopolizar o limite do feed', () => {
    const muitosNao = Array.from({ length: 17 }, (_, i) =>
      card(`n${i}`, 'NAO_PALPITOU', `u${i}`, 34, i),
    );
    const sequencias = [
      card('seq1', 'SEQUENCIA_RESULTADO', 'a', 34, 100),
      card('seq2', 'SEQUENCIA_RESULTADO', 'b', 34, 99),
    ];
    const subiu = [card('sub1', 'SUBIU_RANKING', 'c', 34, 50)];

    const resultado = selecionarDestaquesDiversos(
      [...muitosNao, ...sequencias, ...subiu],
      8,
      PRIORIDADE,
    );

    const tipos = resultado.map((item) => item.tipo);
    expect(tipos).toContain('SUBIU_RANKING');
    expect(tipos).toContain('SEQUENCIA_RESULTADO');
    expect(tipos).toContain('NAO_PALPITOU');
    expect(resultado).toHaveLength(8);
  });

  it('remove NAO_PALPITOU quando a pessoa não tem jogo esquecido', async () => {
    const resultado = await sincronizarNaoPalpitouNaListagem(
      [
        card('n1', 'NAO_PALPITOU', 'u1', 34, 1),
        card('n2', 'NAO_PALPITOU', 'u2', 34, 2),
        card('a1', 'ACERTOU_EM_CHEIO', 'u3', 34, 3),
      ],
      (usuarioId) =>
        Promise.resolve(
          usuarioId === 'u1'
            ? []
            : [
                {
                  jogoId: 'j1',
                  golsCasa: 1,
                  golsFora: 0,
                  timeCasa: { nome: 'A', sigla: 'A', escudo: null },
                  timeFora: { nome: 'B', sigla: 'B', escudo: null },
                },
              ],
        ),
    );

    expect(resultado.map((item) => item.id)).toEqual(['n2', 'a1']);
    expect(resultado[0].dados.jogosEsquecidos).toHaveLength(1);
  });

  it('junta 3+ acertos do mesmo placar em um card de panelinha', () => {
    const resultado = consolidarAcertosPanelinha([
      card('a1', 'ACERTOU_EM_CHEIO', 'u1', 34, 1, 'jogo-a', 'Ana'),
      card('a2', 'ACERTOU_EM_CHEIO', 'u2', 34, 2, 'jogo-a', 'Beto'),
      card('a3', 'ACERTOU_EM_CHEIO', 'u3', 34, 3, 'jogo-a', 'Cia'),
      card('b1', 'ACERTOU_EM_CHEIO', 'u4', 34, 4, 'jogo-b', 'Duda'),
      card('b2', 'ACERTOU_EM_CHEIO', 'u5', 34, 5, 'jogo-b', 'Eva'),
      card('n1', 'NAO_PALPITOU', 'u6', 34, 6),
    ]);

    const acertos = resultado.filter(
      (item) => item.tipo === 'ACERTOU_EM_CHEIO',
    );
    expect(acertos).toHaveLength(3);
    const panelinha = acertos.find((item) => item.jogoId === 'jogo-a');
    expect(panelinha?.usuario?.nome).toBe('Panelinha');
    expect(panelinha?.dados.participantes).toEqual([
      { usuarioId: 'u1', nome: 'Ana' },
      { usuarioId: 'u2', nome: 'Beto' },
      { usuarioId: 'u3', nome: 'Cia' },
    ]);
    expect(acertos.filter((item) => item.jogoId === 'jogo-b')).toHaveLength(2);
  });
});

function card(
  id: string,
  tipo: string,
  usuarioId: string,
  rodada: number,
  criadoOffset = 0,
  jogoId = `jogo-${id}`,
  nome = usuarioId,
) {
  return {
    id,
    tipo,
    usuarioId,
    jogoId,
    rodada,
    titulo: 'Cravou!',
    dados: { golsCasa: 2, golsFora: 1 },
    criadoEm: new Date(Date.UTC(2026, 10, 7, 12, 0, criadoOffset)),
    usuario: { id: usuarioId, nome },
  };
}
