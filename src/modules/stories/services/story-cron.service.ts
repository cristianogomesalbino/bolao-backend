import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { STORIES } from '../stories.constants';
import type { StoryRepository } from '../repositories/story.repository.interface';

@Injectable()
export class StoryCronService {
  private readonly logger = new Logger(StoryCronService.name);

  constructor(
    @Inject(STORIES.STORY_REPOSITORY_TOKEN)
    private readonly storyRepo: StoryRepository,
  ) {}

  @Cron(STORIES.CRON.LIMPEZA_DIARIA)
  async limparStoriesAntigos(): Promise<void> {
    try {
      const removidos = await this.storyRepo.removerAntigos(
        STORIES.LIMITES.EXPIRACAO_DIAS,
      );

      if (removidos > 0) {
        this.logger.log(
          `[STORIES-CRON] Limpeza: ${removidos} stories removidos (> ${STORIES.LIMITES.EXPIRACAO_DIAS} dias)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[STORIES-CRON] Erro na limpeza: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
