import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PainelRodadaController } from '@src/modules/palpites/controllers/painel-rodada.controller';

describe('PainelRodadaController', () => {
  let controller: PainelRodadaController;
  const mockPainelRodadaService = {
    obterPainelRodada: vi.fn(),
  };

  const painelData = {
    fase: {
      id: 'fase-1',
      nome: 'Brasileirão',
      tipo: 'PONTOS_CORRIDOS',
      ordem: 1,
    },
    saldoTokensDobro: 2,
    permitirPalpiteDobrado: true,
    jogos: [
      {
        id: 'jogo-1',
        timeCasaId: 'time-a',
        timeForaId: 'time-b',
        dataHora: new Date('2026-04-01T16:00:00.000Z'),
        status: 'AGENDADO',
        golsCasa: null,
        golsFora: null,
        rodada: 1,
        meuPalpite: { id: 'p-1', golsCasa: 2, golsFora: 1 },
        dobrado: true,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new PainelRodadaController(mockPainelRodadaService as any);
  });

  it('deve chamar service.obterPainelRodada sem rodada', async () => {
    mockPainelRodadaService.obterPainelRodada.mockResolvedValue(painelData);

    const result = await controller.obterPainelRodada(
      'grupo-1',
      'fase-1',
      undefined,
      { id: 'user-1' },
    );

    expect(mockPainelRodadaService.obterPainelRodada).toHaveBeenCalledWith(
      'grupo-1',
      'fase-1',
      'user-1',
      undefined,
    );
    expect(result).toEqual(painelData);
  });

  it('deve passar rodada como número quando query param informado', async () => {
    mockPainelRodadaService.obterPainelRodada.mockResolvedValue(painelData);

    await controller.obterPainelRodada('grupo-1', 'fase-1', '5', {
      id: 'user-1',
    });

    expect(mockPainelRodadaService.obterPainelRodada).toHaveBeenCalledWith(
      'grupo-1',
      'fase-1',
      'user-1',
      5,
    );
  });
});
