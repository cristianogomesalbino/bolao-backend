import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DestaqueReactionService } from '../../../../src/modules/destaques/services/destaque-reaction.service';
import { DestaqueNotificacaoService } from '../../../../src/modules/destaques/services/destaque-notificacao.service';
import { InMemoryDestaqueRepository } from '../../../../src/modules/destaques/repositories/in-memory-destaque.repository';
import {
  DestaqueNaoEncontradoError,
  DestaqueForaDoEscopoError,
  ReacaoApenasNaoPalpitouError,
  NaoPodeEnviarFParaSiMesmoError,
  UsuarioJaEnviouFError,
} from '../../../../src/common/errors/domain-errors';

describe('DestaqueReactionService', () => {
  let service: DestaqueReactionService;
  let destaqueRepo: InMemoryDestaqueRepository;
  let notificacaoService: DestaqueNotificacaoService;

  const rodadasVisiveis = [5, 4];

  beforeEach(async () => {
    destaqueRepo = new InMemoryDestaqueRepository();
    notificacaoService = {
      notificarRecebeuF: vi.fn().mockResolvedValue(undefined),
    } as unknown as DestaqueNotificacaoService;

    service = new DestaqueReactionService(destaqueRepo, notificacaoService);

    // Criar destaque NAO_PALPITOU do user-2
    await destaqueRepo.criar({
      grupoId: 'grupo-1',
      usuarioId: 'user-2',
      jogoId: 'jogo-1',
      rodada: 5,
      tipo: 'NAO_PALPITOU',
      dados: {},
      titulo: 'Dormiu no ponto',
    });
  });

  it('deve registrar F com sucesso e retornar contador incrementado', async () => {
    const destaqueId = destaqueRepo.destaques[0].id;

    const contadorFs = await service.mandarF(
      destaqueId,
      'user-1',
      'grupo-1',
      rodadasVisiveis,
    );

    expect(contadorFs).toBe(1);
    expect(destaqueRepo.reacoes).toHaveLength(1);
    expect(destaqueRepo.destaques[0].contadorFs).toBe(1);
  });

  it('deve lançar DestaqueNaoEncontradoError se destaque não existe', async () => {
    await expect(
      service.mandarF('inexistente', 'user-1', 'grupo-1', rodadasVisiveis),
    ).rejects.toThrow(DestaqueNaoEncontradoError);
  });

  it('deve lançar DestaqueNaoEncontradoError se destaque de outro grupo', async () => {
    const destaqueId = destaqueRepo.destaques[0].id;

    await expect(
      service.mandarF(destaqueId, 'user-1', 'outro-grupo', rodadasVisiveis),
    ).rejects.toThrow(DestaqueNaoEncontradoError);
  });

  it('deve lançar DestaqueForaDoEscopoError se destaque de rodada não-visível', async () => {
    const destaqueId = destaqueRepo.destaques[0].id;

    await expect(
      service.mandarF(destaqueId, 'user-1', 'grupo-1', [10, 9]),
    ).rejects.toThrow(DestaqueForaDoEscopoError);
  });

  it('deve lançar ReacaoApenasNaoPalpitouError se destaque não é NAO_PALPITOU', async () => {
    await destaqueRepo.criar({
      grupoId: 'grupo-1',
      usuarioId: 'user-2',
      jogoId: 'jogo-2',
      rodada: 5,
      tipo: 'ACERTOU_EM_CHEIO',
      dados: {},
      titulo: 'Cravou!',
    });
    const destaqueId = destaqueRepo.destaques[1].id;

    await expect(
      service.mandarF(destaqueId, 'user-1', 'grupo-1', rodadasVisiveis),
    ).rejects.toThrow(ReacaoApenasNaoPalpitouError);
  });

  it('deve lançar NaoPodeEnviarFParaSiMesmoError se remetente é o autor', async () => {
    const destaqueId = destaqueRepo.destaques[0].id;

    await expect(
      service.mandarF(destaqueId, 'user-2', 'grupo-1', rodadasVisiveis),
    ).rejects.toThrow(NaoPodeEnviarFParaSiMesmoError);
  });

  it('deve lançar UsuarioJaEnviouFError na segunda tentativa', async () => {
    const destaqueId = destaqueRepo.destaques[0].id;

    await service.mandarF(destaqueId, 'user-1', 'grupo-1', rodadasVisiveis);

    await expect(
      service.mandarF(destaqueId, 'user-1', 'grupo-1', rodadasVisiveis),
    ).rejects.toThrow(UsuarioJaEnviouFError);
  });

  it('deve disparar notificação após envio com sucesso', async () => {
    const destaqueId = destaqueRepo.destaques[0].id;

    await service.mandarF(destaqueId, 'user-1', 'grupo-1', rodadasVisiveis);

    // Aguardar fire-and-forget
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(notificacaoService.notificarRecebeuF).toHaveBeenCalledWith(
      'user-2',
      'user-1',
      'grupo-1',
    );
  });
});
