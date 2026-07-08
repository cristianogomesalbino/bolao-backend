import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICACOES } from '../notificacoes.constants';
import { JOGOS } from '../../jogos/jogos.constants';
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
import type { JogoRepository } from '../../jogos/repositories/jogo.repository.interface';
import type { FaseRepository } from '../../jogos/repositories/fase.repository.interface';
import type { PalpiteRepository } from '../../palpites/repositories/palpite.repository.interface';
import type { PalpiteDobradoRepository } from '../../palpites/repositories/palpite-dobrado.repository.interface';
import type { GrupoUsuarioRepository } from '../../grupo-usuario/repositories/grupo-usuario.repository.interface';
import type { GrupoRepository } from '../../grupos/repositories/grupo.repository.interface';
import type {
  JogoNotif,
  FaseNotif,
  GrupoNotif,
  PalpiteNotif,
  MembroNotif,
  RankingEntry,
} from '../types/notificacao.types';

@Injectable()
export class NotificacaoRankingService {
  private readonly logger = new Logger(NotificacaoRankingService.name);

  constructor(
    private readonly notificacaoService: NotificacaoService,
    private readonly pushService: PushService,
    private readonly preferenciaService: PreferenciaService,
    private readonly pontuacaoService: PontuacaoService,
    @Inject(NOTIFICACOES.NOTIFICACAO_REPOSITORY_TOKEN)
    private readonly notificacaoRepo: NotificacaoRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    @Inject(PALPITES.PALPITE_REPOSITORY_TOKEN)
    private readonly palpiteRepo: PalpiteRepository,
    @Inject(PALPITES.PALPITE_DOBRADO_REPOSITORY_TOKEN)
    private readonly palpiteDobradoRepo: PalpiteDobradoRepository,
    @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
    private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
  ) {}

  async verificarMudancasPosicao(
    jogo: JogoNotif,
    fase: FaseNotif,
  ): Promise<void> {
    const grupos = (await this.grupoRepo.buscarPorTemporadaId(
      fase.temporadaId,
    )) as GrupoNotif[];

    for (const grupo of grupos) {
      try {
        await this.processarMudancaPosicaoGrupo(jogo, grupo);
      } catch (error) {
        this.logger.error(
          `Erro ao verificar mudança de posição grupo ${grupo.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  async processarMudancaPosicaoGrupo(
    jogo: JogoNotif,
    grupo: GrupoNotif,
  ): Promise<void> {
    const rankingAnterior = await this.calcularRankingSemCache(grupo, jogo.id);
    if (rankingAnterior.length === 0) return;

    const rankingAtual = await this.calcularRankingComJogoExtra(grupo, jogo);
    if (rankingAtual.length === 0) return;

    this.logRankingComparacao(grupo, rankingAtual, rankingAnterior);

    const posicaoAnteriorMap: Map<string, number> = new Map(
      rankingAnterior.map((r) => [r.usuarioId, r.posicao]),
    );

    const notificacoes: CriarNotificacaoData[] = [];
    const usuariosSubiram: string[] = [];
    const usuariosDesceram: string[] = [];

    for (const entrada of rankingAtual) {
      await this.classificarMudancaPosicao(
        entrada,
        posicaoAnteriorMap,
        jogo,
        grupo,
        notificacoes,
        usuariosSubiram,
        usuariosDesceram,
      );
    }

    if (notificacoes.length === 0) return;

    await this.enviarNotificacoesMudancaPosicao(
      notificacoes,
      usuariosSubiram,
      usuariosDesceram,
    );

    this.logger.log(
      `[NOTIF] RANKING: ${grupo.nome} — ${String(usuariosSubiram.length)} subiram, ${String(usuariosDesceram.length)} desceram`,
    );
  }

  async classificarMudancaPosicao(
    entrada: RankingEntry,
    posicaoAnteriorMap: Map<string, number>,
    jogo: JogoNotif,
    grupo: GrupoNotif,
    notificacoes: CriarNotificacaoData[],
    usuariosSubiram: string[],
    usuariosDesceram: string[],
  ): Promise<void> {
    const posAnterior = posicaoAnteriorMap.get(entrada.usuarioId);
    if (posAnterior == null) return;
    if (entrada.posicao === posAnterior) return;

    const subiu = entrada.posicao < posAnterior;
    const tipo = subiu ? 'SUBIU_POSICAO' : 'DESCEU_POSICAO';

    const jaDuplicada = await this.notificacaoRepo.existeNotificacao({
      tipo,
      jogoId: jogo.id,
      grupoId: grupo.id,
      usuarioId: entrada.usuarioId,
    });
    if (jaDuplicada) return;

    const template = subiu
      ? NOTIFICACOES.TEMPLATES.SUBIU_POSICAO
      : NOTIFICACOES.TEMPLATES.DESCEU_POSICAO;

    notificacoes.push({
      tipo,
      titulo: template.titulo,
      mensagem: template.mensagem(entrada.posicao, grupo.nome),
      usuarioId: entrada.usuarioId,
      jogoId: jogo.id,
      grupoId: grupo.id,
    });

    if (subiu) {
      usuariosSubiram.push(entrada.usuarioId);
    } else {
      usuariosDesceram.push(entrada.usuarioId);
    }
  }

  async enviarNotificacoesMudancaPosicao(
    notificacoes: CriarNotificacaoData[],
    usuariosSubiram: string[],
    usuariosDesceram: string[],
  ): Promise<void> {
    const habilitadosSubiu =
      await this.preferenciaService.filtrarUsuariosHabilitados(
        usuariosSubiram,
        'SUBIU_POSICAO',
      );
    const habilitadosDesceu =
      await this.preferenciaService.filtrarUsuariosHabilitados(
        usuariosDesceram,
        'DESCEU_POSICAO',
      );
    const habilitados = new Set([...habilitadosSubiu, ...habilitadosDesceu]);

    const notificacoesFiltradas = notificacoes.filter((n) =>
      habilitados.has(n.usuarioId),
    );
    await this.notificacaoService.criarLote(notificacoesFiltradas);

    if (habilitadosSubiu.length > 0) {
      await this.pushService.enviarParaUsuarios(habilitadosSubiu, {
        titulo: NOTIFICACOES.TEMPLATES.SUBIU_POSICAO.titulo,
        mensagem: 'Você subiu no ranking! Confira sua nova posição.',
        tipo: 'SUBIU_POSICAO',
      });
    }
    if (habilitadosDesceu.length > 0) {
      await this.pushService.enviarParaUsuarios(habilitadosDesceu, {
        titulo: NOTIFICACOES.TEMPLATES.DESCEU_POSICAO.titulo,
        mensagem: 'Sua posição no ranking mudou. Confira.',
        tipo: 'DESCEU_POSICAO',
      });
    }
  }

  async calcularRankingSemCache(
    grupo: GrupoNotif,
    jogoIdExcluir: string | null,
  ): Promise<RankingEntry[]> {
    const fases = (await this.faseRepo.buscarPorTemporada(
      grupo.temporadaId,
    )) as FaseNotif[];
    const membros = (await this.grupoUsuarioRepo.listarPorGrupoComUsuario(
      grupo.id,
    )) as MembroNotif[];

    if (membros.length === 0) return [];

    const usuarioIds = membros.map((m) => m.usuarioId);
    const todosJogosFinalizados: JogoNotif[] = [];

    for (const fase of fases) {
      const jogos = (await this.jogoRepo.buscarPorFase(fase.id)) as JogoNotif[];
      const finalizados = jogos.filter(
        (j) =>
          j.status === 'FINALIZADO' &&
          (jogoIdExcluir === null || j.id !== jogoIdExcluir),
      );
      todosJogosFinalizados.push(...finalizados);
    }

    if (todosJogosFinalizados.length === 0) return [];

    const jogoIds = todosJogosFinalizados.map((j) => j.id);
    const palpites = (await this.palpiteRepo.listarPorJogosEUsuarios(
      jogoIds,
      usuarioIds,
    )) as PalpiteNotif[];
    const dobrados: { usuarioId: string; jogoId: string }[] =
      grupo.permitirPalpiteDobrado
        ? ((await this.palpiteDobradoRepo.listarPorJogosEGrupo(
            jogoIds,
            grupo.id,
          )) as { usuarioId: string; jogoId: string }[])
        : [];

    const palpiteMap: Map<string, PalpiteNotif> = new Map(
      palpites.map((p) => [`${p.usuarioId}:${p.jogoId}`, p]),
    );
    const dobradoSet = new Set(
      dobrados.map((d) => `${d.usuarioId}:${d.jogoId}`),
    );

    const entries = membros.map((membro) => {
      let pontuacaoTotal = 0;

      for (const jogo of todosJogosFinalizados) {
        const palpite = palpiteMap.get(`${membro.usuarioId}:${jogo.id}`);
        const resultado = this.pontuacaoService.calcular(
          palpite
            ? { golsCasa: palpite.golsCasa, golsFora: palpite.golsFora }
            : null,
          {
            golsCasa: jogo.golsCasa as number,
            golsFora: jogo.golsFora as number,
          },
        );

        const multiplicador =
          grupo.permitirPalpiteDobrado &&
          dobradoSet.has(`${membro.usuarioId}:${jogo.id}`)
            ? 2
            : 1;

        pontuacaoTotal += (resultado.pontosBase ?? 0) * multiplicador;
      }

      return { usuarioId: membro.usuarioId, pontuacaoTotal };
    });

    const sorted = [...entries].sort(
      (a, b) => b.pontuacaoTotal - a.pontuacaoTotal,
    );
    return sorted.map((entry, i) => ({
      ...entry,
      posicao: i + 1,
    }));
  }

  /**
   * Calcula ranking incluindo um jogo que pode não estar visível no banco
   * (race condition com PgBouncer). Pega o ranking "anterior" e soma os pontos
   * do jogo extra manualmente.
   */
  async calcularRankingComJogoExtra(
    grupo: GrupoNotif,
    jogoExtra: JogoNotif,
  ): Promise<RankingEntry[]> {
    const membros = (await this.grupoUsuarioRepo.listarPorGrupoComUsuario(
      grupo.id,
    )) as MembroNotif[];
    if (membros.length === 0) return [];

    const usuarioIds = membros.map((m) => m.usuarioId);

    const rankingBase = await this.calcularRankingSemCache(grupo, jogoExtra.id);

    const palpites = (await this.palpiteRepo.listarPorJogoEUsuarios(
      jogoExtra.id,
      usuarioIds,
    )) as PalpiteNotif[];
    const palpiteMap: Map<string, PalpiteNotif> = new Map(
      palpites.map((p) => [p.usuarioId, p]),
    );

    const entries = rankingBase.map((entry) => {
      const palpite = palpiteMap.get(entry.usuarioId);
      const resultado = this.pontuacaoService.calcular(
        palpite
          ? { golsCasa: palpite.golsCasa, golsFora: palpite.golsFora }
          : null,
        {
          golsCasa: jogoExtra.golsCasa as number,
          golsFora: jogoExtra.golsFora as number,
        },
      );
      const pontosExtra = resultado.pontosBase ?? 0;
      return {
        ...entry,
        pontuacaoTotal: entry.pontuacaoTotal + pontosExtra,
      };
    });

    const sorted = [...entries].sort(
      (a, b) => b.pontuacaoTotal - a.pontuacaoTotal,
    );
    return sorted.map((e, i) => ({ ...e, posicao: i + 1 }));
  }

  private logRankingComparacao(
    grupo: GrupoNotif,
    rankingAtual: RankingEntry[],
    rankingAnterior: RankingEntry[],
  ): void {
    const atualTop = rankingAtual
      .slice(0, 3)
      .map(
        (r) =>
          `${r.usuarioId.slice(0, 8)}:pos${r.posicao}:${r.pontuacaoTotal}pts`,
      )
      .join(',');
    const anteriorTop = rankingAnterior
      .slice(0, 3)
      .map(
        (r) =>
          `${r.usuarioId.slice(0, 8)}:pos${r.posicao}:${r.pontuacaoTotal}pts`,
      )
      .join(',');
    this.logger.log(
      `[RANKING] Grupo ${grupo.nome} | Atual: ${atualTop} | Anterior: ${anteriorTop}`,
    );
  }
}
