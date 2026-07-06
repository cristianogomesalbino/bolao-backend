import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICACOES } from '../notificacoes.constants';
import { JOGOS } from '../../jogos/jogos.constants';
import { NotificacaoAcertoService } from './notificacao-acerto.service';
import { NotificacaoRodadaService } from './notificacao-rodada.service';
import { NotificacaoRankingService } from './notificacao-ranking.service';
import { NotificacaoLembreteService } from './notificacao-lembrete.service';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import type { FaseRepository } from '../../jogos/repositories/fase.repository.interface';
import type { JogoNotif, FaseNotif } from '../types/notificacao.types';

@Injectable()
export class NotificacaoEventService {
  private readonly logger = new Logger(NotificacaoEventService.name);

  constructor(
    private readonly acertoService: NotificacaoAcertoService,
    private readonly rodadaService: NotificacaoRodadaService,
    private readonly rankingService: NotificacaoRankingService,
    private readonly lembreteService: NotificacaoLembreteService,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
  ) {}

  async processarJogoFinalizado(jogoId: string): Promise<void> {
    try {
      const jogo = (await this.jogoRepo.buscarPorId(
        jogoId,
      )) as JogoNotif | null;
      if (!jogo) return;

      const fase = (await this.faseRepo.buscarPorId(
        jogo.faseId,
      )) as FaseNotif | null;
      if (!fase) return;

      await this.acertoService.verificarAcertosEmCheio(jogo, fase);
      await this.rodadaService.verificarRodadaEncerrada(jogo, fase);
      await this.rankingService.verificarMudancasPosicao(jogo, fase);
    } catch (error) {
      this.logger.error(
        `Erro ao processar notificações do jogo ${jogoId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
    }
  }

  async agendarJogosDoDia(): Promise<void> {
    const agora = new Date();
    const fimDoDia = new Date(agora);
    fimDoDia.setHours(23, 59, 59, 999);

    const jogos = (await this.jogoRepo.buscarAgendadosEntre(
      agora,
      fimDoDia,
    )) as JogoNotif[];
    if (jogos.length === 0) return;

    this.logger.log(`[NOTIF] ${jogos.length} jogos hoje — agendando lembretes`);

    for (const jogo of jogos) {
      const dataJogo = new Date(jogo.dataHora as string | Date);
      const msAteNotificacao =
        dataJogo.getTime() -
        agora.getTime() -
        NOTIFICACOES.CRON.JOGO_PROXIMO_MINUTOS * 60 * 1000;

      if (msAteNotificacao <= 0) {
        this.lembreteService
          .notificarJogoProximo(jogo)
          .catch((err: Error) =>
            this.logger.error(
              `Erro ao notificar jogo ${jogo.id}: ${err.message}`,
            ),
          );
      } else {
        setTimeout(() => {
          this.lembreteService
            .notificarJogoProximo(jogo)
            .catch((err: Error) =>
              this.logger.error(
                `Erro ao notificar jogo ${jogo.id}: ${err.message}`,
              ),
            );
        }, msAteNotificacao);
      }
    }
  }

  async verificarJogosIminentes(): Promise<void> {
    const agora = new Date();
    const limite = new Date(
      agora.getTime() + NOTIFICACOES.CRON.JOGO_PROXIMO_MINUTOS * 60 * 1000,
    );

    const jogos = (await this.jogoRepo.buscarAgendadosEntre(
      agora,
      limite,
    )) as JogoNotif[];

    for (const jogo of jogos) {
      try {
        await this.lembreteService.notificarJogoProximo(jogo);
      } catch (error) {
        this.logger.error(
          `Erro fallback jogo próximo ${jogo.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  async processarPalpitesPendentes(): Promise<void> {
    const agora = new Date();
    const limite = new Date(
      agora.getTime() +
        NOTIFICACOES.CRON.PALPITES_PENDENTES_HORAS * 60 * 60 * 1000,
    );

    const jogos = (await this.jogoRepo.buscarAgendadosEntre(
      agora,
      limite,
    )) as JogoNotif[];
    if (jogos.length === 0) return;

    const fasesRodadas = this.lembreteService.extrairFasesRodadasUnicas(jogos);

    for (const { faseId, rodada } of fasesRodadas) {
      try {
        await this.lembreteService.notificarPalpitesPendentes(
          faseId,
          rodada,
          jogos,
        );
      } catch (error) {
        this.logger.error(
          `Erro ao notificar palpites pendentes fase ${faseId} rodada ${rodada}: ${(error as Error).message}`,
        );
      }
    }
  }
}
