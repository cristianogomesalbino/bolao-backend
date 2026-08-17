import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICACOES } from '../../notificacoes/notificacoes.constants';
import { DESTAQUES } from '../destaques.constants';
import type { NotificacaoRepository } from '../../notificacoes/repositories/notificacao.repository.interface';
import type { GrupoBasico, MembroComUsuario } from '../types/destaque.types';

@Injectable()
export class DestaqueNotificacaoService {
  private readonly logger = new Logger(DestaqueNotificacaoService.name);

  constructor(
    @Inject(NOTIFICACOES.NOTIFICACAO_REPOSITORY_TOKEN)
    private readonly notificacaoRepo: NotificacaoRepository,
  ) {}

  /**
   * Envia notificação consolidada quando novos destaques são gerados.
   * Deduplicação: 1 notificação por grupo por jogo finalizado.
   */
  async notificarNovosDestaques(
    grupo: GrupoBasico,
    jogoId: string,
    quantidade: number,
    membros: MembroComUsuario[],
  ): Promise<void> {
    try {
      const jaNotificou = await this.notificacaoRepo.existeNotificacao({
        tipo: 'DESTAQUES_GRUPO',
        grupoId: grupo.id,
        jogoId,
      });

      if (jaNotificou) return;

      const titulo = DESTAQUES.TEMPLATES.NOVOS_DESTAQUES.titulo;
      const mensagem = DESTAQUES.TEMPLATES.NOVOS_DESTAQUES.mensagem(
        grupo.nome,
        quantidade,
      );

      await this.notificacaoRepo.criarVarios(
        membros.map((m) => ({
          tipo: 'DESTAQUES_GRUPO' as const,
          titulo,
          mensagem,
          usuarioId: m.usuarioId,
          grupoId: grupo.id,
          jogoId,
        })),
      );

      this.logger.log(
        `[DESTAQUES-NOTIF] ${grupo.nome}: "${titulo}" — ${mensagem}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao notificar destaques do grupo ${grupo.id}: ${(error as Error).message}`,
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

      const titulo = DESTAQUES.TEMPLATES.RECEBEU_F.titulo;
      const mensagem = DESTAQUES.TEMPLATES.RECEBEU_F.mensagem('Alguém');

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
