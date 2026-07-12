import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StoryReactionService } from '../../../../src/modules/stories/services/story-reaction.service';
import { StoryNotificacaoService } from '../../../../src/modules/stories/services/story-notificacao.service';
import { InMemoryStoryRepository } from '../../../../src/modules/stories/repositories/in-memory-story.repository';
import {
  StoryNaoEncontradoError,
  StoryForaDoEscopoError,
  ReacaoApenasNaoPalpitouError,
  NaoPodeEnviarFParaSiMesmoError,
  UsuarioJaEnviouFError,
} from '../../../../src/common/errors/domain-errors';

describe('StoryReactionService', () => {
  let service: StoryReactionService;
  let storyRepo: InMemoryStoryRepository;
  let notificacaoService: StoryNotificacaoService;

  const rodadasVisiveis = [5, 4];

  beforeEach(async () => {
    storyRepo = new InMemoryStoryRepository();
    notificacaoService = {
      notificarRecebeuF: vi.fn().mockResolvedValue(undefined),
    } as unknown as StoryNotificacaoService;

    service = new StoryReactionService(storyRepo, notificacaoService);

    // Criar story NAO_PALPITOU do user-2
    await storyRepo.criar({
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
    const storyId = storyRepo.stories[0].id;

    const contadorFs = await service.mandarF(
      storyId,
      'user-1',
      'grupo-1',
      rodadasVisiveis,
    );

    expect(contadorFs).toBe(1);
    expect(storyRepo.reacoes).toHaveLength(1);
    expect(storyRepo.stories[0].contadorFs).toBe(1);
  });

  it('deve lançar StoryNaoEncontradoError se story não existe', async () => {
    await expect(
      service.mandarF('inexistente', 'user-1', 'grupo-1', rodadasVisiveis),
    ).rejects.toThrow(StoryNaoEncontradoError);
  });

  it('deve lançar StoryNaoEncontradoError se story de outro grupo', async () => {
    const storyId = storyRepo.stories[0].id;

    await expect(
      service.mandarF(storyId, 'user-1', 'outro-grupo', rodadasVisiveis),
    ).rejects.toThrow(StoryNaoEncontradoError);
  });

  it('deve lançar StoryForaDoEscopoError se story de rodada não-visível', async () => {
    const storyId = storyRepo.stories[0].id;

    await expect(
      service.mandarF(storyId, 'user-1', 'grupo-1', [10, 9]),
    ).rejects.toThrow(StoryForaDoEscopoError);
  });

  it('deve lançar ReacaoApenasNaoPalpitouError se story não é NAO_PALPITOU', async () => {
    await storyRepo.criar({
      grupoId: 'grupo-1',
      usuarioId: 'user-2',
      jogoId: 'jogo-2',
      rodada: 5,
      tipo: 'ACERTOU_EM_CHEIO',
      dados: {},
      titulo: 'Cravou!',
    });
    const storyId = storyRepo.stories[1].id;

    await expect(
      service.mandarF(storyId, 'user-1', 'grupo-1', rodadasVisiveis),
    ).rejects.toThrow(ReacaoApenasNaoPalpitouError);
  });

  it('deve lançar NaoPodeEnviarFParaSiMesmoError se remetente é o autor', async () => {
    const storyId = storyRepo.stories[0].id;

    await expect(
      service.mandarF(storyId, 'user-2', 'grupo-1', rodadasVisiveis),
    ).rejects.toThrow(NaoPodeEnviarFParaSiMesmoError);
  });

  it('deve lançar UsuarioJaEnviouFError na segunda tentativa', async () => {
    const storyId = storyRepo.stories[0].id;

    await service.mandarF(storyId, 'user-1', 'grupo-1', rodadasVisiveis);

    await expect(
      service.mandarF(storyId, 'user-1', 'grupo-1', rodadasVisiveis),
    ).rejects.toThrow(UsuarioJaEnviouFError);
  });

  it('deve disparar notificação após envio com sucesso', async () => {
    const storyId = storyRepo.stories[0].id;

    await service.mandarF(storyId, 'user-1', 'grupo-1', rodadasVisiveis);

    // Aguardar fire-and-forget
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(notificacaoService.notificarRecebeuF).toHaveBeenCalledWith(
      'user-2',
      'user-1',
      'grupo-1',
    );
  });
});
