import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DESTAQUES } from '../destaques.constants';
import type { DestaqueRepository } from '../repositories/destaque.repository.interface';

@Injectable()
export class DestaqueCronService {
  private readonly logger = new Logger(DestaqueCronService.name);

  constructor(
    @Inject(DESTAQUES.DESTAQUE_REPOSITORY_TOKEN)
    private readonly destaqueRepo: DestaqueRepository,
  ) {}

  @Cron(DESTAQUES.CRON.LIMPEZA_DIARIA)
  async limparDestaquesAntigos(): Promise<void> {
    try {
      const removidos = await this.destaqueRepo.removerAntigos(
        DESTAQUES.LIMITES.EXPIRACAO_DIAS,
      );

      if (removidos > 0) {
        this.logger.log(
          `[DESTAQUES-CRON] Limpeza: ${removidos} destaques removidos (> ${DESTAQUES.LIMITES.EXPIRACAO_DIAS} dias)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[DESTAQUES-CRON] Erro na limpeza: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }
}
