import { describe, it, expect, beforeEach } from 'vitest';
import { PainelRodadaService } from '@src/modules/palpites/services/painel-rodada.service';
import { InMemoryPalpiteRepository } from '@src/modules/palpites/repositories/in-memory-palpite.repository';
import { InMemoryPalpiteDobradoRepository } from '@src/modules/palpites/repositories/in-memory-palpite-dobrado.repository';
import { InMemoryTokenDobroRepository } from '@src/modules/palpites/repositories/in-memory-token-dobro.repository';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';
import { GrupoNaoEncontradoError } from '@src/common/errors/domain-errors/grupos.errors';
import { FaseNaoEncontradaError } from '@src/common/errors/domain-errors/jogos.errors';

describe('PainelRodadaService', () => {
  let service: PainelRodadaService;
  let palpiteRepo: InMemoryPalpiteRepository;
  let palpiteDobradoRepo: InMemoryPalpiteDobradoRepository;
  let tokenDobroRepo: InMemoryTokenDobroRepository;
  let jogoRepo: InMemoryJogoRepository;
  let faseRepo: InMemoryFaseRepository;
  let grupoRepo: any;

  const userId = 'user-1';
  const grupoId = 'grupo-1';
  const faseId = 'fase-1';

  const grupo = {
    id: grupoId,
    nome: 'Bolão QA',
    permitirPalpiteDobrado: true,
    temporadaId: 'temp-1',
  };

  const fase = {
    id: faseId,
    nome: 'Brasileirão 2026',
    tipo: 'PONTOS_CORRIDOS',
    ordem: 1,
    idaVolta: false,
    temporadaId: 'temp-1',
    dataCriacao: new Date(),
  };

  const jogoRodada1 = {
    id: 'jogo-1',
    faseId,
    timeCasaId: 'time-a',
    timeForaId: 'time-b',
    dataHora: new Date('2026-04-01T16:00:00.000Z'),
    status: 'AGENDADO',
    golsCasa: null,
    golsFora: null,
    rodada: 1,
  };

  const jogoRodada1b = {
    id: 'jogo-2',
    faseId,
    timeCasaId: 'time-c',
    timeForaId: 'time-d',
    dataHora: new Date('2026-04-01T18:00:00.000Z'),
    status: 'AGENDADO',
    golsCasa: null,
    golsFora: null,
    rodada: 1,
  };

  const jogoRodada2 = {
    id: 'jogo-3',
    faseId,
    timeCasaId: 'time-e',
    timeForaId: 'time-f',
    dataHora: new Date('2026-04-08T16:00:00.000Z'),
    status: 'AGENDADO',
    golsCasa: null,
    golsFora: null,
    rodada: 2,
  };

  beforeEach(() => {
    palpiteRepo = new InMemoryPalpiteRepository();
    palpiteDobradoRepo = new InMemoryPalpiteDobradoRepository();
    tokenDobroRepo = new InMemoryTokenDobroRepository();
    jogoRepo = new InMemoryJogoRepository();
    faseRepo = new InMemoryFaseRepository();
    faseRepo.items = [{ ...fase }];
    jogoRepo.items = [{ ...jogoRodada1 }, { ...jogoRodada1b }, { ...jogoRodada2 }];

    grupoRepo = {
      buscarPorId: async (id: string) => (id === grupoId ? { ...grupo } : null),
    };

    service = new PainelRodadaService(
      palpiteRepo,
      palpiteDobradoRepo,
      tokenDobroRepo,
      jogoRepo,
      faseRepo,
      grupoRepo,
    );
  });

  it('deve retornar painel completo sem filtro de rodada', async () => {
    const result = await service.obterPainelRodada(grupoId, faseId, userId);

    expect(result.fase.id).toBe(faseId);
    expect(result.fase.tipo).toBe('PONTOS_CORRIDOS');
    expect(result.saldoTokensDobro).toBe(0);
    expect(result.permitirPalpiteDobrado).toBe(true);
    expect(result.jogos).toHaveLength(3);
  });

  it('deve filtrar jogos por rodada', async () => {
    const result = await service.obterPainelRodada(grupoId, faseId, userId, 1);

    expect(result.jogos).toHaveLength(2);
    expect(result.jogos.every((j) => j.rodada === 1)).toBe(true);
  });

  it('deve incluir meuPalpite quando existe', async () => {
    await palpiteRepo.criar({ usuarioId: userId, jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 });

    const result = await service.obterPainelRodada(grupoId, faseId, userId, 1);

    const jogo1 = result.jogos.find((j) => j.id === 'jogo-1');
    expect(jogo1?.meuPalpite).not.toBeNull();
    expect(jogo1?.meuPalpite?.golsCasa).toBe(2);
    expect(jogo1?.meuPalpite?.golsFora).toBe(1);

    const jogo2 = result.jogos.find((j) => j.id === 'jogo-2');
    expect(jogo2?.meuPalpite).toBeNull();
  });

  it('deve marcar dobrado=true quando palpite dobrado existe', async () => {
    await palpiteDobradoRepo.criar({ usuarioId: userId, jogoId: 'jogo-1', grupoId });

    const result = await service.obterPainelRodada(grupoId, faseId, userId, 1);

    const jogo1 = result.jogos.find((j) => j.id === 'jogo-1');
    expect(jogo1?.dobrado).toBe(true);

    const jogo2 = result.jogos.find((j) => j.id === 'jogo-2');
    expect(jogo2?.dobrado).toBe(false);
  });

  it('deve calcular saldo de tokens corretamente', async () => {
    await tokenDobroRepo.criar({
      usuarioId: userId,
      grupoId,
      tipo: 'CONCESSAO',
      motivo: 'ACERTO_EM_CHEIO',
      referenciaId: 'jogo-x',
    });
    await tokenDobroRepo.criar({
      usuarioId: userId,
      grupoId,
      tipo: 'CONCESSAO',
      motivo: 'PRIMEIRO_RANKING',
      referenciaId: 'fase-x',
    });

    const result = await service.obterPainelRodada(grupoId, faseId, userId);

    expect(result.saldoTokensDobro).toBe(2);
  });

  it('deve não incluir dobros de outro grupo', async () => {
    await palpiteDobradoRepo.criar({ usuarioId: userId, jogoId: 'jogo-1', grupoId: 'outro-grupo' });

    const result = await service.obterPainelRodada(grupoId, faseId, userId, 1);

    const jogo1 = result.jogos.find((j) => j.id === 'jogo-1');
    expect(jogo1?.dobrado).toBe(false);
  });

  it('deve lançar GrupoNaoEncontradoError se grupo inexistente', async () => {
    await expect(
      service.obterPainelRodada('inexistente', faseId, userId),
    ).rejects.toThrow(GrupoNaoEncontradoError);
  });

  it('deve lançar FaseNaoEncontradaError se fase inexistente', async () => {
    await expect(
      service.obterPainelRodada(grupoId, 'inexistente', userId),
    ).rejects.toThrow(FaseNaoEncontradaError);
  });
});
