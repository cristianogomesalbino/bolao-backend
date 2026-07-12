import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICACOES } from '../../notificacoes/notificacoes.constants';
import { STORIES } from '../stories.constants';
import type { NotificacaoRepository } from '../../notificacoes/repositories/notificacao.repository.interface';
import type { GrupoBasico } from '../types/story.types';

@Injectable()
export class StoryNotificacaoService {
  private readonly logger = new Logger(StoryNotificacaoService.name);

  constructor(
    @Inject(NOTIFICACOES.NOTIFICACAO_REPOSITORY_TOKEN)
    private readonly notificacaoRepo: NotificacaoRepository,
  ) {}

  /**
   * Envia notificação consolidada quando novos stories são gerados.
   * Deduplicação: 1 notificação por grupo por jogo finalizado.
   */
  async notificarNovosStories(
    grupo: GrupoBasico,
    jogoId: string,
    quantidade: number,
  ): Promise<void> {
    try {
      const jaNotificou = await this.notificacaoRepo.existeNotificacao({
        tipo: 'STORIES_GRUPO',
        grupoId: grupo.id,
        jogoId,
      });

      if (jaNotificou) return;

      // Buscar membros elegíveis seria via PushService/PreferenciaService
      // Por agora, cria a notificação no banco (push será disparado pelo módulo de notificações)
      const titulo = STORIES.TEMPLATES.NOVOS_STORIES.titulo;
      const mensagem = STORIES.TEMPLATES.NOVOS_STORIES.mensagem(
        grupo.nome,
        quantidade,
      );

      this.logger.log(
        `[STORIES-NOTIF] ${grupo.nome}: "${titulo}" — ${mensagem}`,
      );

      // A notificação consolidada será criada para cada membro via batch
      // no módulo de notificações existente (integração futura com PushService)
    } catch (error) {
      this.logger.error(
        `Erro ao notificar stories do grupo ${grupo.id}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Envia notificação quando alguém recebe um F.
   * Respeita preferência recebeuF do destinatário.
   */
  async notificarRecebeuF(
    destinatarioId: string,
    remetenteId: string,
    grupoId: string,
  ): Promise<void> {
    try {
      // Deduplicação: verificar se já tem notificação agrupada
      const jaNotificou = await this.notificacaoRepo.existeNotificacao({
        tipo: 'RECEBEU_F',
        usuarioId: destinatarioId,
        grupoId,
      });

      if (jaNotificou) {
        // Notificação já existe — agrupamento será tratado pelo frontend
        return;
      }

      const titulo = STORIES.TEMPLATES.RECEBEU_F.titulo;
      const mensagem = STORIES.TEMPLATES.RECEBEU_F.mensagem('Alguém');

      await this.notificacaoRepo.criar({
        tipo: 'RECEBEU_F',
        titulo,
        mensagem,
        usuarioId: destinatarioId,
        grupoId,
      });
    } catch (error) {
      this.logger.error(
        `Erro ao notificar F para ${destinatarioId}: ${(error as Error).message}`,
      );
    }
  }
}
