import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICACOES } from '../notificacoes.constants';
import { JOGOS } from '../../jogos/jogos.constants';
import { GRUPO_USUARIO } from '../../grupo-usuario/grupo-usuario.constants';
import { GRUPOS } from '../../grupos/grupos.constants';
import { NotificacaoService } from './notificacao.service';
import { PushService } from './push.service';
import { PreferenciaService } from './preferencia.service';
import { NotificacaoRankingService } from './notificacao-ranking.service';
import type {
  NotificacaoRepository,
  CriarNotificacaoData,
} from '../repositories/notificacao.repository.interface';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import type { FaseRepository } from '../../jogos/repositories/fase.repository.interface';
import type { GrupoUsuarioRepository } from '../../grupo-usuario/repositories/grupo-usuario.repository.interface';
import type { GrupoRepository } from '../../grupos/repositories/grupo.repository.interface';
import type {
  JogoNotif,
  FaseNotif,
  GrupoNotif,
  MembroNotif,
} from '../types/notificacao.types';

interface MembroComNome extends MembroNotif {
  usuario?: { id: string; nome: string };
}

@Injectable()
export class NotificacaoVencedorService {
  private readonly logger = new Logger(NotificacaoVencedorService.name);

  constructor(
    private readonly notificacaoService: NotificacaoService,
    private readonly pushService: PushService,
    private readonly preferenciaService: PreferenciaService,
    private readonly rankingService: NotificacaoRankingService,
    @Inject(NOTIFICACOES.NOTIFICACAO_REPOSITORY_TOKEN)
    private readonly notificacaoRepo: NotificacaoRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
    private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
  ) {}

  /**
   * Verifica se a temporada encerrou (todos jogos finalizados/cancelados)
   * e notifica todos os membros sobre o vencedor de cada grupo.
   */
  async verificarTemporadaEncerrada(fase: FaseNotif): Promise<void> {
    const temporadaEncerrada = await this.verificarTodosJogosEncerrados(
      fase.temporadaId,
    );
    if (!temporadaEncerrada) return;

    const grupos = (await this.grupoRepo.buscarPorTemporadaId(
      fase.temporadaId,
    )) as GrupoNotif[];

    for (const grupo of grupos) {
      try {
        await this.notificarVencedorGrupo(grupo);
      } catch (error) {
        this.logger.error(
          `Erro ao notificar vencedor do grupo ${grupo.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async verificarTodosJogosEncerrados(
    temporadaId: string,
  ): Promise<boolean> {
    const fases = (await this.faseRepo.buscarPorTemporada(
      temporadaId,
    )) as FaseNotif[];

    if (fases.length === 0) return false;

    const jogosPorFase = await Promise.all(
      fases.map((fase) => this.jogoRepo.buscarPorFase(fase.id)),
    );

    for (const jogos of jogosPorFase) {
      const jogosCast = jogos as JogoNotif[];
      if (jogosCast.length === 0) continue;

      const todosEncerrados = jogosCast.every(
        (j) => j.status === 'FINALIZADO' || j.status === 'CANCELADO',
      );
      if (!todosEncerrados) return false;
    }

    return true;
  }

  private async notificarVencedorGrupo(grupo: GrupoNotif): Promise<void> {
    const jaDuplicada = await this.notificacaoRepo.existeNotificacao({
      tipo: 'VENCEDOR_BOLAO',
      grupoId: grupo.id,
    });
    if (jaDuplicada) return;

    const membros = (await this.grupoUsuarioRepo.listarPorGrupoComUsuario(
      grupo.id,
    )) as MembroComNome[];

    if (membros.length === 0) return;

    // Reutiliza o cálculo de ranking do NotificacaoRankingService (sem cache)
    const ranking = await this.rankingService.calcularRankingSemCache(
      grupo,
      null,
    );
    if (ranking.length === 0) return;

    const vencedor = ranking[0];
    const nomeVencedor =
      membros.find((m) => m.usuarioId === vencedor.usuarioId)?.usuario?.nome ??
      'Jogador';

    await this.enviarNotificacoes(grupo, membros, vencedor, nomeVencedor);

    this.logger.log(
      `[NOTIF] VENCEDOR: ${nomeVencedor} venceu o bolão "${grupo.nome}" com ${vencedor.pontuacaoTotal} pontos`,
    );
  }

  private async enviarNotificacoes(
    grupo: GrupoNotif,
    membros: MembroComNome[],
    vencedor: { usuarioId: string; pontuacaoTotal: number },
    nomeVencedor: string,
  ): Promise<void> {
    const todosUsuarios = membros.map((m) => m.usuarioId);
    const habilitados =
      await this.preferenciaService.filtrarUsuariosHabilitados(
        todosUsuarios,
        'VENCEDOR_BOLAO',
      );

    const template = NOTIFICACOES.TEMPLATES.VENCEDOR_BOLAO;

    const notificacoes: CriarNotificacaoData[] = habilitados.map((uid) => ({
      tipo: 'VENCEDOR_BOLAO' as const,
      titulo: template.titulo,
      mensagem:
        uid === vencedor.usuarioId
          ? template.mensagemVencedor(grupo.nome, vencedor.pontuacaoTotal)
          : template.mensagemMembros(
              nomeVencedor,
              grupo.nome,
              vencedor.pontuacaoTotal,
            ),
      usuarioId: uid,
      grupoId: grupo.id,
    }));

    await this.notificacaoService.criarLote(notificacoes);

    await this.pushService.enviarParaUsuarios(habilitados, {
      titulo: template.titulo,
      mensagem: template.mensagemMembros(
        nomeVencedor,
        grupo.nome,
        vencedor.pontuacaoTotal,
      ),
      tipo: 'VENCEDOR_BOLAO',
    });
  }
}
