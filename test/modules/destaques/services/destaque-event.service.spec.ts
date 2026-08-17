import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DestaqueEventService } from '../../../../src/modules/destaques/services/destaque-event.service';
import { DestaqueGeneratorService } from '../../../../src/modules/destaques/services/destaque-generator.service';
import { DestaqueNotificacaoService } from '../../../../src/modules/destaques/services/destaque-notificacao.service';
import type { JogoRepository } from '../../../../src/modules/jogos/repositories/jogo.repository.interface';
import type { FaseRepository } from '../../../../src/modules/jogos/repositories/fase.repository.interface';
import type { GrupoRepository } from '../../../../src/modules/grupos/repositories/grupo.repository.interface';
import type { GrupoUsuarioRepository } from '../../../../src/modules/grupo-usuario/repositories/grupo-usuario.repository.interface';

describe('DestaqueEventService', () => {
  let service: DestaqueEventService;
  let generatorService: DestaqueGeneratorService;
  let notificacaoService: DestaqueNotificacaoService;
  let jogoRepo: { buscarPorId: ReturnType<typeof vi.fn> };
  let faseRepo: { buscarPorId: ReturnType<typeof vi.fn> };
  let grupoRepo: { buscarPorTemporadaId: ReturnType<typeof vi.fn> };
  let grupoUsuarioRepo: { listarPorGrupoComUsuario: ReturnType<typeof vi.fn> };

  const jogoFinalizado = {
    id: 'jogo-1',
    faseId: 'fase-1',
    rodada: 5,
    status: 'FINALIZADO',
    golsCasa: 2,
    golsFora: 1,
    timeCasaId: 'tc',
    timeForaId: 'tf',
    dataHora: new Date(),
    timeCasa: { id: 'tc', nome: 'Palmeiras', sigla: 'PAL', escudo: null },
    timeFora: { id: 'tf', nome: 'Corinthians', sigla: 'COR', escudo: null },
  };

  const grupo = {
    id: 'grupo-1',
    nome: 'Bolão da Firma',
    temporadaId: 'temp-1',
    permitirPalpiteDobrado: false,
  };

  const membros = [
    {
      usuarioId: 'user-1',
      grupoId: 'grupo-1',
      usuario: { id: 'user-1', nome: 'João' },
    },
  ];

  beforeEach(() => {
    jogoRepo = { buscarPorId: vi.fn().mockResolvedValue(jogoFinalizado) };
    faseRepo = {
      buscarPorId: vi.fn().mockResolvedValue({ temporadaId: 'temp-1' }),
    };
    grupoRepo = { buscarPorTemporadaId: vi.fn().mockResolvedValue([grupo]) };
    grupoUsuarioRepo = {
      listarPorGrupoComUsuario: vi.fn().mockResolvedValue(membros),
    };

    generatorService = {
      gerarDestaquesParaGrupo: vi.fn().mockResolvedValue(3),
    } as unknown as DestaqueGeneratorService;

    notificacaoService = {
      notificarNovosDestaques: vi.fn().mockResolvedValue(undefined),
    } as unknown as DestaqueNotificacaoService;

    service = new DestaqueEventService(
      generatorService,
      notificacaoService,
      jogoRepo as unknown as JogoRepository,
      faseRepo as unknown as FaseRepository,
      grupoRepo as unknown as GrupoRepository,
      grupoUsuarioRepo as unknown as GrupoUsuarioRepository,
    );
  });

  it('deve retornar sem erro quando jogo não é encontrado', async () => {
    jogoRepo.buscarPorId.mockResolvedValue(null);

    await expect(
      service.processarJogoFinalizado('inexistente'),
    ).resolves.toBeUndefined();
    expect(generatorService.gerarDestaquesParaGrupo).not.toHaveBeenCalled();
  });

  it('deve retornar sem chamar generator quando jogo não está finalizado', async () => {
    jogoRepo.buscarPorId.mockResolvedValue({
      ...jogoFinalizado,
      status: 'EM_ANDAMENTO',
    });

    await service.processarJogoFinalizado('jogo-1');

    expect(generatorService.gerarDestaquesParaGrupo).not.toHaveBeenCalled();
  });

  it('deve chamar generator e notificacao para cada grupo da temporada', async () => {
    const grupo2 = { ...grupo, id: 'grupo-2', nome: 'Outro Bolão' };
    grupoRepo.buscarPorTemporadaId.mockResolvedValue([grupo, grupo2]);
    grupoUsuarioRepo.listarPorGrupoComUsuario.mockResolvedValue(membros);

    await service.processarJogoFinalizado('jogo-1');

    expect(generatorService.gerarDestaquesParaGrupo).toHaveBeenCalledTimes(2);
    expect(notificacaoService.notificarNovosDestaques).toHaveBeenCalledTimes(2);
  });

  it('deve continuar processando outros grupos quando um falha', async () => {
    const grupo2 = { ...grupo, id: 'grupo-2', nome: 'Outro Bolão' };
    grupoRepo.buscarPorTemporadaId.mockResolvedValue([grupo, grupo2]);

    let callCount = 0;
    grupoUsuarioRepo.listarPorGrupoComUsuario.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.reject(new Error('Erro simulado'));
      return Promise.resolve(membros);
    });

    await service.processarJogoFinalizado('jogo-1');

    // O segundo grupo deve ter sido processado apesar do erro no primeiro
    expect(generatorService.gerarDestaquesParaGrupo).toHaveBeenCalledTimes(1);
  });

  it('não deve chamar notificação quando nenhum destaque gerado', async () => {
    (generatorService.gerarDestaquesParaGrupo as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    await service.processarJogoFinalizado('jogo-1');

    expect(notificacaoService.notificarNovosDestaques).not.toHaveBeenCalled();
  });

  it('deve retornar sem erro quando fase não tem temporadaId', async () => {
    faseRepo.buscarPorId.mockResolvedValue(null);

    await service.processarJogoFinalizado('jogo-1');

    expect(grupoRepo.buscarPorTemporadaId).not.toHaveBeenCalled();
  });

  it('não deve processar grupos quando membros está vazio', async () => {
    grupoUsuarioRepo.listarPorGrupoComUsuario.mockResolvedValue([]);

    await service.processarJogoFinalizado('jogo-1');

    expect(generatorService.gerarDestaquesParaGrupo).not.toHaveBeenCalled();
  });
});
