import { describe, expect, it, vi } from 'vitest';
import { manterMelhorSequenciaPorPessoa } from '../../../../src/modules/destaques/services/sequencia-listagem';

describe('manterMelhorSequenciaPorPessoa', () => {
  it('deixa um card de sequência por pessoa na rodada', async () => {
    const calcular = vi
      .fn()
      .mockResolvedValueOnce({
        quantidade: 5,
        pontos: 9,
        rodadaInicio: 33,
        rodadaFim: 34,
        ultimosJogos: [],
      })
      .mockResolvedValueOnce({
        quantidade: 2,
        pontos: 6,
        rodadaInicio: 34,
        rodadaFim: 34,
        ultimosJogos: [],
      });

    const resultado = await manterMelhorSequenciaPorPessoa(
      [
        card('seq-1', 'user-1', 34),
        card('acerto', 'user-1', 34, 'ACERTOU_EM_CHEIO'),
        card('seq-2', 'user-1', 34),
        card('seq-3', 'user-2', 34),
      ],
      calcular,
      4,
    );

    const sequencias = resultado.filter(
      (item) => item.tipo === 'SEQUENCIA_RESULTADO',
    );
    expect(sequencias.map((item) => item.id)).toEqual(['seq-1']);
    expect(sequencias[0].dados.pontos).toBe(9);
    expect(calcular).toHaveBeenCalledTimes(2);
  });
});

function card(
  id: string,
  usuarioId: string,
  rodada: number,
  tipo = 'SEQUENCIA_RESULTADO',
) {
  return {
    id,
    tipo,
    usuarioId,
    rodada,
    dados: { pontos: 3 },
    usuario: { id: usuarioId },
  };
}
