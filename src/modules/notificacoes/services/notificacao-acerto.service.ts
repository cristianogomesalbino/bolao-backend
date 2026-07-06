import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICACOES } from '../notificacoes.constants';
import { PALPITES } from '../../palpites/palpites.constants';
import { GRUPO_USUARIO } from '../../grupo-usuario/grupo-usuario.constants';
import { GRUPOS } from '../../grupos/grupos.constants';
import { NotificacaoService } from './notificacao.service';
import { PushService } from './push.service';
import { PreferenciaService } from './preferencia.service';
import { PontuacaoService } from '../../ranking/services/pontuacao.service';
import type {
  NotificacaoRepository,
  CriarNotificacaoData,
} from '../repositories/notificacao.repository.interface';
import type { PalpiteRepository } from '../../palpites/repositories/palpite.repository.interface';
import type { GrupoUsuarioRepository } from '../../grupo-usuario/repositories/grupo-usuario.repository.interface';
import type { GrupoRepository } from '../../grupos/repositories/grupo.repository.interface';
import type {
  JogoNotif,
  FaseNotif,
  GrupoNotif,
  PalpiteNotif,
  MembroNotif,
} from '../types/notificacao.types';

@Injectable()
export class NotificacaoAcertoService {
  private readonly logger = new Logger(NotificacaoAcertoService.name);

  constructor(
    private readonly notificacaoService: NotificacaoService,
    private readonly pushService: PushService,
    private readonly preferenciaService: PreferenciaService,
    private readonly pontuacaoService: PontuacaoService,
    @Inject(NOTIFICACOES.NOTIFICACAO_REPOSITORY_TOKEN)
    private readonly notificacaoRepo: NotificacaoRepository,
    @Inject(PALPITES.PALPITE_REPOSITORY_TOKEN)
    private readonly palpiteRepo: PalpiteRepository,
    @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
    private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
  ) {}

  async verificarAcertosEmCheio(
    jogo: JogoNotif,
    fase: FaseNotif,
  ): Promise<void> {
    const grupos = (await this.grupoRepo.buscarPorTemporadaId(
      fase.temporadaId,
    )) as GrupoNotif[];
    if (grupos.length === 0) return;

    const todosUsuarioIds = new Set<string>();
    for (const grupo of grupos) {
      const membros = (await this.grupoUsuarioRepo.listarPorGrupoComUsuario(
        grupo.id,
      )) as MembroNotif[];
      for (const m of membros) {
        todosUsuarioIds.add(m.usuarioId);
      }
    }

    const usuarioIds = [...todosUsuarioIds];
    const palpites = (await this.palpiteRepo.listarPorJogoEUsuarios(
      jogo.id,
      usuarioIds,
    )) as PalpiteNotif[];

    const jaNotificado = await this.notificacaoRepo.existeNotificacao({
      tipo: 'ACERTO_EM_CHEIO',
      jogoId: jogo.id,
    });
    if (jaNotificado) return;

    const notificacoes: CriarNotificacaoData[] = [];
    const usuariosParaPush: string[] = [];

    for (const palpite of palpites) {
      const acertou =
        palpite.golsCasa === jogo.golsCasa &&
        palpite.golsFora === jogo.golsFora;
      if (!acertou) continue;

      const grupoFavorito = await this.obterGrupoFavoritoNaTemporada(
        palpite.usuarioId,
        grupos,
      );

      const pontos = this.calcularPontosAcerto(palpite, jogo);

      notificacoes.push({
        tipo: 'ACERTO_EM_CHEIO',
        titulo: NOTIFICACOES.TEMPLATES.ACERTO_EM_CHEIO.titulo,
        mensagem: NOTIFICACOES.TEMPLATES.ACERTO_EM_CHEIO.mensagem(
          jogo.timeCasa?.nome ?? 'Casa',
          jogo.golsCasa as number,
          jogo.golsFora as number,
          jogo.timeFora?.nome ?? 'Fora',
          pontos,
        ),
        usuarioId: palpite.usuarioId,
        jogoId: jogo.id,
        grupoId:
          grupos.length === 1 ? grupos[0].id : (grupoFavorito?.id ?? null),
      });
      usuariosParaPush.push(palpite.usuarioId);
    }

    if (notificacoes.length === 0) return;

    const habilitados =
      await this.preferenciaService.filtrarUsuariosHabilitados(
        usuariosParaPush,
        'ACERTO_EM_CHEIO',
      );
    const notificacoesFiltradas = notificacoes.filter((n) =>
      habilitados.includes(n.usuarioId),
    );

    await this.notificacaoService.criarLote(notificacoesFiltradas);

    for (const notif of notificacoesFiltradas) {
      if (habilitados.includes(notif.usuarioId)) {
        await this.pushService.enviarParaUsuario(notif.usuarioId, {
          titulo: notif.titulo,
          mensagem: notif.mensagem,
          tipo: 'ACERTO_EM_CHEIO',
          url: '/notificacoes',
        });
      }
    }

    this.logger.log(
      `[NOTIF] ACERTO_EM_CHEIO: ${jogo.timeCasa?.nome ?? '?'} ${String(jogo.golsCasa)}×${String(jogo.golsFora)} ${jogo.timeFora?.nome ?? '?'} — ${String(notificacoesFiltradas.length)} acertos`,
    );
  }

  async obterGrupoFavoritoNaTemporada(
    usuarioId: string,
    gruposDaTemporada: GrupoNotif[],
  ): Promise<GrupoNotif | null> {
    const grupoIds = new Set(gruposDaTemporada.map((g) => g.id));
    const membros = (await this.grupoUsuarioRepo.listarPorUsuario(
      usuarioId,
    )) as MembroNotif[];
    const grupoFavoritoMembro = membros.find((m) => grupoIds.has(m.grupoId));

    return grupoFavoritoMembro
      ? (gruposDaTemporada.find((g) => g.id === grupoFavoritoMembro.grupoId) ??
          null)
      : null;
  }

  calcularPontosAcerto(palpite: PalpiteNotif, jogo: JogoNotif): number {
    const resultado = this.pontuacaoService.calcular(
      { golsCasa: palpite.golsCasa, golsFora: palpite.golsFora },
      {
        golsCasa: jogo.golsCasa as number,
        golsFora: jogo.golsFora as number,
      },
    );
    return resultado.pontosBase ?? 0;
  }
}
