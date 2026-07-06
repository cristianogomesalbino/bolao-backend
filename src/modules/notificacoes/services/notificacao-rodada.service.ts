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

    const jaDuplicada = await this.notificacaoRepo.existeNotificacao({
      tipo: 'RODADA_ENCERRADA',
      faseId: fase.id,
      rodada: jogo.rodada,
    });
    if (jaDuplicada) return;

    const jogosDaRodada = (await this.jogoRepo.buscarPorFase(
      fase.id,
      jogo.rodada,
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

    const todosUsuarios = [...usuariosUnicos];
    const habilitados =
      await this.preferenciaService.filtrarUsuariosHabilitados(
        todosUsuarios,
        'RODADA_ENCERRADA',
      );

    const mensagem = NOTIFICACOES.TEMPLATES.RODADA_ENCERRADA.mensagem(
      jogo.rodada,
      fase.temporada?.campeonato?.nome ?? fase.nome,
    );

    const notificacoes: CriarNotificacaoData[] = habilitados.map((uid) => ({
      tipo: 'RODADA_ENCERRADA',
      titulo: NOTIFICACOES.TEMPLATES.RODADA_ENCERRADA.titulo,
      mensagem,
      usuarioId: uid,
      faseId: fase.id,
      rodada: jogo.rodada as number,
    }));

    await this.notificacaoService.criarLote(notificacoes);
    await this.pushService.enviarParaUsuarios(habilitados, {
      titulo: NOTIFICACOES.TEMPLATES.RODADA_ENCERRADA.titulo,
      mensagem,
      tipo: 'RODADA_ENCERRADA',
    });
  }
}
