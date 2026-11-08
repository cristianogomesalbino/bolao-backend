import { describe, it, expect } from 'vitest';
import { PontuacaoService } from '../../../../src/modules/ranking/services/pontuacao.service';
import {
  calcularRodadasParaConsulta,
  extrairCravadas,
  extrairEsquecidos,
  filtrarFinalizadosOrdenados,
  montarCargaSequencia,
  timeInfoSequencia,
  type JogoInternoSequencia,
  type PalpiteInternoSequencia,
} from '../../../../src/modules/destaques/services/sequencia-jogos.helper';

describe('sequencia-jogos.helper', () => {
  const pontuacao = new PontuacaoService();

  const jogo = (
    id: string,
    overrides: Partial<JogoInternoSequencia> = {},
  ): JogoInternoSequencia => ({
    id,
    faseId: 'fase-1',
    rodada: 5,
    status: 'FINALIZADO',
    golsCasa: 1,
    golsFora: 0,
    timeCasaId: 'tc',
    timeForaId: 'tf',
    dataHora: '2026-11-01T12:00:00Z',
    timeCasa: { nome: 'Flamengo', sigla: 'FLA', escudo: null },
    timeFora: { nome: 'Palmeiras', sigla: 'PAL', escudo: null },
    ...overrides,
  });

  it('filtra finalizados e ordena por data', () => {
    const lista = filtrarFinalizadosOrdenados([
      jogo('b', { dataHora: '2026-11-02T12:00:00Z' }),
      jogo('a', { dataHora: '2026-11-01T12:00:00Z', status: 'AGENDADO' }),
      jogo('c', { dataHora: '2026-11-01T18:00:00Z' }),
    ]);

    expect(lista.map((j) => j.id)).toEqual(['c', 'b']);
  });

  it('calcula rodadas da consulta a partir da atual', () => {
    expect(calcularRodadasParaConsulta(5)).toEqual([5, 4]);
    expect(calcularRodadasParaConsulta(1)).toEqual([1]);
  });

  it('monta TimeInfo com fallback de id e sigla', () => {
    expect(timeInfoSequencia(null, 'time-x')).toEqual({
      nome: 'time-x',
      sigla: 'TIM',
      escudo: null,
    });
    expect(
      timeInfoSequencia({ nome: 'Corinthians', escudo: 'c.png' }, 'tc'),
    ).toEqual({
      nome: 'Corinthians',
      sigla: 'COR',
      escudo: 'c.png',
    });
  });

  it('extrai cravadas e ignora palpite sem cheio', () => {
    const jogos = [jogo('j1'), jogo('j2', { golsCasa: 2, golsFora: 1 })];
    const palpites = new Map<string, PalpiteInternoSequencia>([
      ['j1', { usuarioId: 'u1', jogoId: 'j1', golsCasa: 1, golsFora: 0 }],
      ['j2', { usuarioId: 'u1', jogoId: 'j2', golsCasa: 0, golsFora: 0 }],
    ]);

    const cravadas = extrairCravadas(jogos, palpites, pontuacao);
    expect(cravadas).toHaveLength(1);
    expect(cravadas[0].jogoId).toBe('j1');
  });

  it('extrai esquecidos quando não há palpite', () => {
    const jogos = [jogo('j1'), jogo('j2')];
    const palpites = new Map<string, PalpiteInternoSequencia>([
      ['j1', { usuarioId: 'u1', jogoId: 'j1', golsCasa: 1, golsFora: 0 }],
    ]);

    expect(extrairEsquecidos(jogos, palpites).map((j) => j.jogoId)).toEqual([
      'j2',
    ]);
  });

  it('montarCargaSequencia retorna null com menos de 2 finalizados', () => {
    expect(montarCargaSequencia([jogo('j1')], new Map(), pontuacao)).toBeNull();
  });

  it('montarCargaSequencia calcula pontos por jogo', () => {
    const jogos = [
      jogo('j1', { dataHora: '2026-11-01T10:00:00Z' }),
      jogo('j2', {
        dataHora: '2026-11-01T18:00:00Z',
        golsCasa: 2,
        golsFora: 0,
      }),
    ];
    const palpites = new Map<string, PalpiteInternoSequencia>([
      ['j1', { usuarioId: 'u1', jogoId: 'j1', golsCasa: 1, golsFora: 0 }],
      ['j2', { usuarioId: 'u1', jogoId: 'j2', golsCasa: 1, golsFora: 0 }],
    ]);

    const carga = montarCargaSequencia(jogos, palpites, pontuacao);
    expect(carga).not.toBeNull();
    expect(carga!.pontosDe('j1')).toBe(3);
    expect(carga!.pontosDe('j2')).toBe(1);
    expect(carga!.pontosDe('inexistente')).toBeNull();
  });
});
