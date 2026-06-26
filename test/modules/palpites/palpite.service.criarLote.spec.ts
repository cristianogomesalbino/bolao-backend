import { describe, it, expect, beforeEach } from 'vitest';
import { PalpiteService } from '@src/modules/palpites/services/palpite.service';
import { InMemoryPalpiteRepository } from '@src/modules/palpites/repositories/in-memory-palpite.repository';
import { InMemoryJogoRepository } from '@src/modules/jogos/repositories/in-memory-jogo.repository';
import { InMemoryFaseRepository } from '@src/modules/jogos/repositories/in-memory-fase.repository';
import { InMemoryGrupoRepository } from '@src/modules/grupos/repositories/in-memory-grupo.repository';
import { InMemoryGrupoUsuarioRepository } from '@src/modules/grupo-usuario/repositories/in-memory-grupo-usuario.repository';

describe('PalpiteService — criarLote', () => {
  let service: PalpiteService;
  let palpiteRepo: InMemoryPalpiteRepository;
  let jogoRepo: InMemoryJogoRepository;
  let faseRepo: InMemoryFaseRepository;
  let grupoRepo: InMemoryGrupoRepository;
  let grupoUsuarioRepo: InMemoryGrupoUsuarioRepository;

  const userId = 'user-1';

  const jogoAgendado1 = {
    id: 'jogo-1',
    faseId: 'fase-1',
    timeCasaId: 'time-a',
    timeForaId: 'time-b',
    dataHora: new Date('2026-04-01T16:00:00.000Z'),
    status: 'AGENDADO',
  };

  const jogoAgendado2 = {
    id: 'jogo-2',
    faseId: 'fase-1',
    timeCasaId: 'time-c',
    timeForaId: 'time-d',
    dataHora: new Date('2026-04-01T18:00:00.000Z'),
    status: 'AGENDADO',
  };

  const jogoAgendado3 = {
    id: 'jogo-3',
    faseId: 'fase-1',
    timeCasaId: 'time-e',
    timeForaId: 'time-f',
    dataHora: new Date('2026-04-01T20:00:00.000Z'),
    status: 'AGENDADO',
  };

  const jogoEmAndamento = {
    id: 'jogo-4',
    faseId: 'fase-1',
    timeCasaId: 'time-g',
    timeForaId: 'time-h',
    dataHora: new Date('2026-04-01T14:00:00.000Z'),
    status: 'EM_ANDAMENTO',
  };

  beforeEach(() => {
    palpiteRepo = new InMemoryPalpiteRepository();
    jogoRepo = new InMemoryJogoRepository();
    faseRepo = new InMemoryFaseRepository();
    grupoRepo = new InMemoryGrupoRepository();
    grupoUsuarioRepo = new InMemoryGrupoUsuarioRepository();
    jogoRepo.items = [
      { ...jogoAgendado1 },
      { ...jogoAgendado2 },
      { ...jogoAgendado3 },
      { ...jogoEmAndamento },
    ];

    faseRepo.items = [
      {
        id: 'fase-1',
        temporadaId: 'temporada-1',
        nome: 'Fase 1',
        tipo: 'PONTOS_CORRIDOS',
        ordem: 1,
      },
    ];

    service = new PalpiteService(
      palpiteRepo,
      jogoRepo,
      grupoUsuarioRepo,
      faseRepo,
      grupoRepo,
    );
  });

  it('deve criar múltiplos palpites com sucesso', async () => {
    const palpites = [
      { jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
      { jogoId: 'jogo-2', golsCasa: 0, golsFora: 0 },
      { jogoId: 'jogo-3', golsCasa: 3, golsFora: 2 },
    ];

    const result = await service.criarLote(palpites, userId);

    expect(result).toHaveLength(3);
    expect(result.every((r) => r.sucesso)).toBe(true);
    expect(palpiteRepo.items).toHaveLength(3);
  });

  it('deve retornar erro parcial sem travar os demais', async () => {
    // Criar palpite existente pro jogo-1
    await palpiteRepo.criar({
      usuarioId: userId,
      jogoId: 'jogo-1',
      golsCasa: 1,
      golsFora: 0,
    });

    const palpites = [
      { jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 }, // vai falhar — já existe
      { jogoId: 'jogo-2', golsCasa: 0, golsFora: 0 }, // vai funcionar
      { jogoId: 'jogo-4', golsCasa: 1, golsFora: 1 }, // vai falhar — EM_ANDAMENTO
    ];

    const result = await service.criarLote(palpites, userId);

    expect(result).toHaveLength(3);
    expect(result[0].sucesso).toBe(false);
    expect(result[0].erro).toContain('Já existe');
    expect(result[1].sucesso).toBe(true);
    expect(result[2].sucesso).toBe(false);
    expect(result[2].erro).toContain('não aceita');
  });

  it('deve retornar erro para jogo inexistente', async () => {
    const palpites = [{ jogoId: 'inexistente', golsCasa: 1, golsFora: 0 }];

    const result = await service.criarLote(palpites, userId);

    expect(result[0].sucesso).toBe(false);
    expect(result[0].erro).toContain('não encontrado');
  });

  it('deve retornar array vazio para lote vazio', async () => {
    const result = await service.criarLote([], userId);

    expect(result).toHaveLength(0);
  });

  it('deve criar palpites independentes — falha de um não afeta outro', async () => {
    const palpites = [
      { jogoId: 'jogo-1', golsCasa: 2, golsFora: 1 },
      { jogoId: 'inexistente', golsCasa: 0, golsFora: 0 },
      { jogoId: 'jogo-3', golsCasa: 1, golsFora: 1 },
    ];

    const result = await service.criarLote(palpites, userId);

    const sucessos = result.filter((r) => r.sucesso);
    expect(sucessos).toHaveLength(2);
    expect(palpiteRepo.items).toHaveLength(2);
  });
});
