import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICACOES } from '../notificacoes.constants';
import { JOGOS } from '../../jogos/jogos.constants';
import { GRUPO_USUARIO } from '../../grupo-usuario/grupo-usuario.constants';
import { GRUPOS } from '../../grupos/grupos.constants';
import { NotificacaoService } from './notificacao.service';
import { PushService } from './push.service';
import { PreferenciaService } from './preferencia.service';
import type {
  NotificacaoRepository,
  CriarNotificacaoData,
} from '../repositories/notificacao.repository.interface';
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import type { GrupoUsuarioRepository } from '../../grupo-usuario/repositories/grupo-usuario.repository.interface';
import type { GrupoRepository } from '../../grupos/repositories/grupo.repository.interface';
import type {
  JogoNotif,
  FaseNotif,
  GrupoNotif,
  MembroNotif,
} from '../types/notificacao.types';

@Injectable()
export class NotificacaoRodadaService {
  private readonly logger = new Logger(NotificacaoRodadaService.name);

  /** Serializa verificação por fase+rodada (evita N pushes iguais no sync em lote). */
  private readonly filasRodada = new Map<string, Promise<void>>();

  constructor(
    private readonly notificacaoService: NotificacaoService,
    private readonly pushService: PushService,
    private readonly preferenciaService: PreferenciaService,
    @Inject(NOTIFICACOES.NOTIFICACAO_REPOSITORY_TOKEN)
    private readonly notificacaoRepo: NotificacaoRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
    private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
  ) {}

  async verificarRodadaEncerrada(
    jogo: JogoNotif,
    fase: FaseNotif,
  ): Promise<void> {
    if (jogo.rodada == null) return;
    if (fase.tipo === 'MATA_MATA') return;

    const chave = `${fase.id}:${String(jogo.rodada)}`;
    const anterior = this.filasRodada.get(chave) ?? Promise.resolve();

    let liberar!: () => void;
    const porta = new Promise<void>((resolve) => {
      liberar = resolve;
    });
    const fila = anterior.then(() => porta);
    this.filasRodada.set(chave, fila);

    await anterior;
    try {
      await this.executarVerificacaoRodadaEncerrada(jogo, fase);
    } finally {
      liberar();
      if (this.filasRodada.get(chave) === fila) {
        this.filasRodada.delete(chave);
      }
    }
  }

  private async executarVerificacaoRodadaEncerrada(
    jogo: JogoNotif,
    fase: FaseNotif,
  ): Promise<void> {
    const rodada = jogo.rodada;
    if (rodada == null) return;

    const jaDuplicada = await this.notificacaoRepo.existeNotificacao({
      tipo: 'RODADA_ENCERRADA',
      faseId: fase.id,
      rodada,
    });
    if (jaDuplicada) return;

    const jogosDaRodada = (await this.jogoRepo.buscarPorFase(
      fase.id,
      rodada,
    )) as JogoNotif[];
    const todosEncerrados = jogosDaRodada.every(
      (j) =>
        j.status === 'FINALIZADO' ||
        j.status === 'CANCELADO' ||
        j.status === 'ADIADO',
    );
    const temFinalizado = jogosDaRodada.some((j) => j.status === 'FINALIZADO');

    if (!todosEncerrados || !temFinalizado) return;

    const grupos = (await this.grupoRepo.buscarPorTemporadaId(
      fase.temporadaId,
    )) as GrupoNotif[];

    const usuariosUnicos = new Set<string>();
    for (const grupo of grupos) {
      const membros = (await this.grupoUsuarioRepo.listarPorGrupoComUsuario(
        grupo.id,
      )) as MembroNotif[];
      for (const m of membros) {
        usuariosUnicos.add(m.usuarioId);
      }
    }

    const habilitados =
      await this.preferenciaService.filtrarUsuariosHabilitados(
        [...usuariosUnicos],
        'RODADA_ENCERRADA',
      );

    const mensagem = NOTIFICACOES.TEMPLATES.RODADA_ENCERRADA.mensagem(
      rodada,
      fase.temporada?.campeonato?.nome ?? fase.nome,
    );

    const notificacoes: CriarNotificacaoData[] = habilitados.map((uid) => ({
      tipo: 'RODADA_ENCERRADA',
      titulo: NOTIFICACOES.TEMPLATES.RODADA_ENCERRADA.titulo,
      mensagem,
      usuarioId: uid,
      faseId: fase.id,
      rodada,
    }));

    await this.notificacaoService.criarLote(notificacoes);
    await this.pushService.enviarParaUsuarios(habilitados, {
      titulo: NOTIFICACOES.TEMPLATES.RODADA_ENCERRADA.titulo,
      mensagem,
      tipo: 'RODADA_ENCERRADA',
    });

    this.logger.log(
      `[NOTIF] RODADA_ENCERRADA: rodada ${String(rodada)} — ${String(habilitados.length)} notificados`,
    );
  }
}
