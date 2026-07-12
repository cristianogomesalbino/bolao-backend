import { Inject, Injectable, Logger } from '@nestjs/common';
import { STORIES } from '../stories.constants';
import type { StoryRepository } from '../repositories/story.repository.interface';
import {
  StoryNaoEncontradoError,
  StoryForaDoEscopoError,
  ReacaoApenasNaoPalpitouError,
  NaoPodeEnviarFParaSiMesmoError,
  UsuarioJaEnviouFError,
} from '../../../common/errors/domain-errors';
import { StoryNotificacaoService } from './story-notificacao.service';

@Injectable()
export class StoryReactionService {
  private readonly logger = new Logger(StoryReactionService.name);

  constructor(
    @Inject(STORIES.STORY_REPOSITORY_TOKEN)
    private readonly storyRepo: StoryRepository,
    private readonly notificacaoService: StoryNotificacaoService,
  ) {}

  async mandarF(
    storyId: string,
    remetenteId: string,
    grupoId: string,
    rodadasVisiveis: number[],
  ): Promise<number> {
    const story = await this.storyRepo.buscarPorId(storyId);

    if (!story) {
      throw new StoryNaoEncontradoError();
    }

    if (story.grupoId !== grupoId) {
      throw new StoryNaoEncontradoError();
    }

    const storyVisivelNaRodada =
      story.rodada !== null && rodadasVisiveis.includes(story.rodada);
    if (!storyVisivelNaRodada) {
      throw new StoryForaDoEscopoError();
    }

    if (story.tipo !== 'NAO_PALPITOU') {
      throw new ReacaoApenasNaoPalpitouError();
    }

    if (story.usuarioId === remetenteId) {
      throw new NaoPodeEnviarFParaSiMesmoError();
    }

    const jaEnviou = await this.storyRepo.existeReacao(remetenteId, storyId);
    if (jaEnviou) {
      throw new UsuarioJaEnviouFError();
    }

    await this.storyRepo.criarReacao({ storyId, remetenteId });
    const novoContador = await this.storyRepo.incrementarContadorFs(storyId);

    // Notificação fire-and-forget
    this.notificacaoService
      .notificarRecebeuF(story.usuarioId, remetenteId, grupoId)
      .catch((err) =>
        this.logger.error(
          `Erro ao notificar F para ${story.usuarioId}: ${(err as Error).message}`,
        ),
      );

    return novoContador;
  }
}
