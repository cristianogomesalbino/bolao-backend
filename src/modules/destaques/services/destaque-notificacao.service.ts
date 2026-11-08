import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICACOES } from '../../notificacoes/notificacoes.constants';
import { USUARIOS } from '../../usuarios/usuarios.constants';
import { DESTAQUES } from '../destaques.constants';
import type { NotificacaoRepository } from '../../notificacoes/repositories/notificacao.repository.interface';
import type { UsuarioRepository } from '../../usuarios/repositories/usuario.repository.interface';
import { PreferenciaService } from '../../notificacoes/services/preferencia.service';
import { PushService } from '../../notificacoes/services/push.service';
import type { GrupoBasico, MembroComUsuario } from '../types/destaque.types';

@Injectable()
export class DestaqueNotificacaoService {
  private readonly logger = new Logger(DestaqueNotificacaoService.name);

  constructor(
    @Inject(NOTIFICACOES.NOTIFICACAO_REPOSITORY_TOKEN)
    private readonly notificacaoRepo: NotificacaoRepository,
    @Inject(USUARIOS.REPOSITORY_TOKEN)
    private readonly usuarioRepo: UsuarioRepository,
    private readonly preferenciaService: PreferenciaService,
    private readonly pushService: PushService,
  ) {}

  /**
   * Grava e envia push quando novos destaques são gerados.
   * Dedupe por grupo+rodada (um push por lote de finalizações da rodada).
   */
  async notificarNovosDestaques(
    grupo: GrupoBasico,
    rodada: number | null,
    quantidade: number,
    membros: MembroComUsuario[],
  ): Promise<void> {
    try {
      const chaveRodada = rodada ?? 0;
      const jaNotificou = await this.notificacaoRepo.existeNotificacao({
        tipo: 'DESTAQUES_GRUPO',
        grupoId: grupo.id,
        rodada: chaveRodada,
      });
      if (jaNotificou || membros.length === 0) return;

      const habilitados =
        await this.preferenciaService.filtrarUsuariosHabilitados(
          membros.map((membro) => membro.usuarioId),
          'DESTAQUES_GRUPO',
        );
      if (habilitados.length === 0) return;

      const titulo = DESTAQUES.TEMPLATES.NOVOS_DESTAQUES.titulo;
      const mensagem = DESTAQUES.TEMPLATES.NOVOS_DESTAQUES.mensagem(
        grupo.nome,
        quantidade,
      );
      const habilitadosSet = new Set(habilitados);

      await this.notificacaoRepo.criarVarios(
        membros
          .filter((membro) => habilitadosSet.has(membro.usuarioId))
          .map((membro) => ({
            tipo: 'DESTAQUES_GRUPO' as const,
            titulo,
            mensagem,
            usuarioId: membro.usuarioId,
            grupoId: grupo.id,
            rodada: chaveRodada,
          })),
      );

      await this.pushService.enviarParaUsuarios(habilitados, {
        titulo,
        mensagem,
        tipo: 'DESTAQUES_GRUPO',
        url: `/grupos/${grupo.id}`,
        dedupeId: `destaques:${grupo.id}:rodada:${chaveRodada}`,
      });

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
   * Avisa o autor do destaque. O primeiro F leva o nome de quem mandou.
   * Enquanto o aviso seguir não lido, os próximos viram "N pessoas mandaram um F".
   */
  async notificarRecebeuF(
    destinatarioId: string,
    remetenteId: string,
    grupoId: string,
  ): Promise<void> {
    try {
      const habilitado = await this.preferenciaService.estaHabilitado(
        destinatarioId,
        'RECEBEU_F',
      );
      if (!habilitado) return;

      const aviso = await this.montarAvisoRecebeuF(
        destinatarioId,
        remetenteId,
        grupoId,
      );

      await this.pushService.enviarParaUsuario(destinatarioId, {
        titulo: aviso.titulo,
        mensagem: aviso.mensagem,
        tipo: 'RECEBEU_F',
        url: `/grupos/${grupoId}`,
        dedupeId: `recebeu-f:${grupoId}`,
      });
    } catch (error) {
      this.logger.error(
        `Erro ao notificar F para ${destinatarioId}: ${(error as Error).message}`,
      );
    }
  }

  private async montarAvisoRecebeuF(
    destinatarioId: string,
    remetenteId: string,
    grupoId: string,
  ): Promise<{ titulo: string; mensagem: string }> {
    const existente = await this.notificacaoRepo.buscarNaoLida({
      tipo: 'RECEBEU_F',
      usuarioId: destinatarioId,
      grupoId,
    });

    if (existente) {
      const quantidade = proximaQuantidadeFs(existente.mensagem);
      const titulo = DESTAQUES.TEMPLATES.RECEBEU_F_AGRUPADO.titulo;
      const mensagem =
        DESTAQUES.TEMPLATES.RECEBEU_F_AGRUPADO.mensagem(quantidade);
      await this.notificacaoRepo.atualizarMensagem(
        existente.id,
        titulo,
        mensagem,
      );
      return { titulo, mensagem };
    }

    const remetente = await this.usuarioRepo.buscarPorId(remetenteId);
    const nome = remetente?.nome?.trim() || 'Alguém';
    const titulo = DESTAQUES.TEMPLATES.RECEBEU_F.titulo;
    const mensagem = DESTAQUES.TEMPLATES.RECEBEU_F.mensagem(nome);

    await this.notificacaoRepo.criar({
      tipo: 'RECEBEU_F',
      titulo,
      mensagem,
      usuarioId: destinatarioId,
      grupoId,
    });

    return { titulo, mensagem };
  }
}

function proximaQuantidadeFs(mensagem: string): number {
  const agrupada = mensagem.match(/^(\d+) pessoas mandaram um F/);
  if (!agrupada) return 2;
  return Number(agrupada[1]) + 1;
}
