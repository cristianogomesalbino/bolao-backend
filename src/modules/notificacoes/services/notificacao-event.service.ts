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
import { RankingService } from '../../ranking/services/ranking.service';
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

@Injectable()
export class NotificacaoEventService {
  private readonly logger = new Logger(NotificacaoEventService.name);

  constructor(
    private readonly notificacaoService: NotificacaoService,
    private readonly pushService: PushService,
    private readonly preferenciaService: PreferenciaService,
    private readonly pontuacaoService: PontuacaoService,
    private readonly rankingService: RankingService,
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

  async processarJogoFinalizado(jogoId: string): Promise<void> {
    try {
      const jogo = await this.jogoRepo.buscarPorId(jogoId);
      if (!jogo) return;

      const fase = await this.faseRepo.buscarPorId(jogo.faseId);
      if (!fase) return;

      await this.verificarAcertosEmCheio(jogo, fase);
      await this.verificarRodadaEncerrada(jogo, fase);
      await this.verificarMudancasPosicao(jogo, fase);
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

    const jogos = await this.jogoRepo.buscarAgendadosEntre(agora, fimDoDia);
    if (jogos.length === 0) return;

    this.logger.log(`[NOTIF] ${jogos.length} jogos hoje — agendando lembretes`);

    for (const jogo of jogos) {
      const dataJogo = new Date(jogo.dataHora);
      const msAteNotificacao =
        dataJogo.getTime() -
        agora.getTime() -
        NOTIFICACOES.CRON.JOGO_PROXIMO_MINUTOS * 60 * 1000;

      if (msAteNotificacao <= 0) {
        this.notificarJogoProximo(jogo).catch((err) =>
          this.logger.error(
            `Erro ao notificar jogo ${jogo.id}: ${err.message}`,
          ),
        );
      } else {
        setTimeout(() => {
          this.notificarJogoProximo(jogo).catch((err) =>
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

    const jogos = await this.jogoRepo.buscarAgendadosEntre(agora, limite);

    for (const jogo of jogos) {
      try {
        await this.notificarJogoProximo(jogo);
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

    const jogos = await this.jogoRepo.buscarAgendadosEntre(agora, limite);
    if (jogos.length === 0) return;

    const fasesRodadas = this.extrairFasesRodadasUnicas(jogos);

    for (const { faseId, rodada } of fasesRodadas) {
      try {
        await this.notificarPalpitesPendentes(faseId, rodada, jogos);
      } catch (error) {
        this.logger.error(
          `Erro ao notificar palpites pendentes fase ${faseId} rodada ${rodada}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async verificarAcertosEmCheio(jogo: any, fase: any): Promise<void> {
    const grupos = await this.grupoRepo.buscarPorTemporadaId(fase.temporadaId);
    if (grupos.length === 0) return;

    // Buscar todos os membros de todos os grupos (deduplicando por usuário)
    const todosUsuarioIds = new Set<string>();
    for (const grupo of grupos) {
      const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(
        grupo.id,
      );
      for (const m of membros) {
        todosUsuarioIds.add((m as any).usuarioId);
      }
    }

    const usuarioIds = [...todosUsuarioIds];
    const palpites = await this.palpiteRepo.listarPorJogoEUsuarios(
      jogo.id,
      usuarioIds,
    );

    // Deduplicação em batch: verificar se já existe qualquer notificação ACERTO_EM_CHEIO para este jogo
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

      // Usar grupo favorito do usuário (se pertence à temporada)
      const grupoFavorito = await this.obterGrupoFavoritoNaTemporada(
        palpite.usuarioId,
        grupos,
      );

      const pontos = this.calcularPontosAcerto(
        palpite,
        jogo,
        grupoFavorito ?? grupos[0],
      );

      notificacoes.push({
        tipo: 'ACERTO_EM_CHEIO',
        titulo: NOTIFICACOES.TEMPLATES.ACERTO_EM_CHEIO.titulo,
        mensagem: NOTIFICACOES.TEMPLATES.ACERTO_EM_CHEIO.mensagem(
          jogo.timeCasa?.nome ?? 'Casa',
          jogo.golsCasa,
          jogo.golsFora,
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

    // Enviar push com mensagem individual por usuário (contém times + placar)
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
  }

  private async obterGrupoFavoritoNaTemporada(
    usuarioId: string,
    gruposDaTemporada: any[],
  ): Promise<any> {
    const grupoIds = new Set(gruposDaTemporada.map((g: any) => g.id as string));
    const membros = await this.grupoUsuarioRepo.listarPorUsuario(usuarioId);
    const grupoFavoritoMembro = membros.find((m: any) =>
      grupoIds.has(m.grupoId),
    );

    // Se o usuário tem um grupo favorito que pertence à temporada, usar esse
    // Por simplicidade, retorna o primeiro grupo que participa na temporada
    return grupoFavoritoMembro
      ? (gruposDaTemporada.find(
          (g: any) => g.id === grupoFavoritoMembro.grupoId,
        ) ?? null)
      : null;
  }

  private async verificarRodadaEncerrada(jogo: any, fase: any): Promise<void> {
    if (jogo.rodada == null) return;
    // Não gerar notificação de rodada encerrada para fases mata-mata
    if (fase.tipo === 'MATA_MATA') return;

    const jaDuplicada = await this.notificacaoRepo.existeNotificacao({
      tipo: 'RODADA_ENCERRADA',
      faseId: fase.id,
      rodada: jogo.rodada,
    });
    if (jaDuplicada) return;

    const jogosDaRodada = await this.jogoRepo.buscarPorFase(
      fase.id,
      jogo.rodada,
    );
    const todosEncerrados = jogosDaRodada.every(
      (j: any) =>
        j.status === 'FINALIZADO' ||
        j.status === 'CANCELADO' ||
        j.status === 'ADIADO',
    );
    const temFinalizado = jogosDaRodada.some(
      (j: any) => j.status === 'FINALIZADO',
    );

    if (!todosEncerrados || !temFinalizado) return;

    const grupos = await this.grupoRepo.buscarPorTemporadaId(fase.temporadaId);

    // Coletar todos os usuários únicos de todos os grupos da temporada
    const usuariosUnicos = new Set<string>();
    for (const grupo of grupos) {
      const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(
        grupo.id,
      );
      for (const m of membros) {
        usuariosUnicos.add((m as any).usuarioId);
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
      rodada: jogo.rodada,
    }));

    await this.notificacaoService.criarLote(notificacoes);
    await this.pushService.enviarParaUsuarios(habilitados, {
      titulo: NOTIFICACOES.TEMPLATES.RODADA_ENCERRADA.titulo,
      mensagem,
      tipo: 'RODADA_ENCERRADA',
    });
  }

  private async verificarMudancasPosicao(jogo: any, fase: any): Promise<void> {
    const grupos = await this.grupoRepo.buscarPorTemporadaId(fase.temporadaId);

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

  private async processarMudancaPosicaoGrupo(
    jogo: any,
    grupo: any,
  ): Promise<void> {
    // Invalidar cache ANTES de buscar ranking atual (jogo acabou de ser finalizado)
    this.rankingService.invalidarCache(grupo.id);

    const rankingAtual = await this.rankingService.obterRankingGeral(grupo.id);
    if (rankingAtual.length === 0) return;

    const rankingAnterior = await this.calcularRankingExcluindoJogo(
      grupo,
      jogo.id,
    );
    if (rankingAnterior.length === 0) return;

    const posicaoAnteriorMap = new Map(
      rankingAnterior.map((r: any) => [r.usuarioId, r.posicao]),
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
  }

  private async classificarMudancaPosicao(
    entrada: any,
    posicaoAnteriorMap: Map<string, number>,
    jogo: any,
    grupo: any,
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

  private async enviarNotificacoesMudancaPosicao(
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

  private async calcularRankingExcluindoJogo(
    grupo: any,
    jogoId: string,
  ): Promise<any[]> {
    // O ranking geral já inclui o jogo finalizado. Para simular "antes",
    // recalculamos excluindo esse jogo específico.
    const fases = await this.faseRepo.buscarPorTemporada(grupo.temporadaId);
    const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(
      grupo.id,
    );

    if (membros.length === 0) return [];

    const usuarioIds = membros.map((m: any) => m.usuarioId);
    const todosJogosFinalizados: any[] = [];

    for (const fase of fases) {
      const jogos = await this.jogoRepo.buscarPorFase(fase.id);
      const finalizados = jogos.filter(
        (j: any) => j.status === 'FINALIZADO' && j.id !== jogoId,
      );
      todosJogosFinalizados.push(...finalizados);
    }

    if (todosJogosFinalizados.length === 0) return [];

    const jogoIds = todosJogosFinalizados.map((j: any) => j.id);
    const palpites = await this.palpiteRepo.listarPorJogosEUsuarios(
      jogoIds,
      usuarioIds,
    );
    const dobrados = grupo.permitirPalpiteDobrado
      ? await this.palpiteDobradoRepo.listarPorJogosEGrupo(jogoIds, grupo.id)
      : [];

    const palpiteMap = new Map(
      palpites.map((p: any) => [`${p.usuarioId}:${p.jogoId}`, p]),
    );
    const dobradoSet = new Set(
      dobrados.map((d: any) => `${d.usuarioId}:${d.jogoId}`),
    );

    const entries = membros.map((membro: any) => {
      let pontuacaoTotal = 0;

      for (const jogo of todosJogosFinalizados) {
        const palpite = palpiteMap.get(`${membro.usuarioId}:${jogo.id}`);
        const resultado = this.pontuacaoService.calcular(
          palpite
            ? { golsCasa: palpite.golsCasa, golsFora: palpite.golsFora }
            : null,
          { golsCasa: jogo.golsCasa, golsFora: jogo.golsFora },
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
      (a: any, b: any) => b.pontuacaoTotal - a.pontuacaoTotal,
    );
    return sorted.map((entry: any, i: number) => ({
      ...entry,
      posicao: i + 1,
    }));
  }

  private async notificarJogoProximo(jogo: any): Promise<void> {
    const jaDuplicada = await this.notificacaoRepo.existeNotificacao({
      tipo: 'JOGO_PROXIMO',
      jogoId: jogo.id,
    });
    if (jaDuplicada) return;

    const fase = await this.faseRepo.buscarPorId(jogo.faseId);
    if (!fase) return;

    const grupos = await this.grupoRepo.buscarPorTemporadaId(fase.temporadaId);

    // Coletar todos os usuários únicos
    const usuariosUnicos = new Set<string>();
    for (const grupo of grupos) {
      const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(
        grupo.id,
      );
      for (const m of membros) {
        usuariosUnicos.add((m as any).usuarioId);
      }
    }

    const todosUsuarios = [...usuariosUnicos];

    // Filtrar: só notifica quem NÃO palpitou neste jogo
    const palpites = await this.palpiteRepo.listarPorJogoEUsuarios(
      jogo.id,
      todosUsuarios,
    );
    const quemJaPalpitou = new Set(palpites.map((p: any) => p.usuarioId));
    const semPalpite = todosUsuarios.filter((uid) => !quemJaPalpitou.has(uid));

    if (semPalpite.length === 0) return;

    const habilitados =
      await this.preferenciaService.filtrarUsuariosHabilitados(
        semPalpite,
        'JOGO_PROXIMO',
      );

    if (habilitados.length === 0) return;

    const mensagem = NOTIFICACOES.TEMPLATES.JOGO_PROXIMO.mensagem(
      jogo.timeCasa?.nome ?? 'Casa',
      jogo.timeFora?.nome ?? 'Fora',
    );

    const notificacoes: CriarNotificacaoData[] = habilitados.map((uid) => ({
      tipo: 'JOGO_PROXIMO',
      titulo: NOTIFICACOES.TEMPLATES.JOGO_PROXIMO.titulo,
      mensagem,
      usuarioId: uid,
      jogoId: jogo.id,
    }));

    await this.notificacaoService.criarLote(notificacoes);
    await this.pushService.enviarParaUsuarios(habilitados, {
      titulo: NOTIFICACOES.TEMPLATES.JOGO_PROXIMO.titulo,
      mensagem,
      tipo: 'JOGO_PROXIMO',
    });
  }

  private async notificarPalpitesPendentes(
    faseId: string,
    rodada: number,
    jogos: any[],
  ): Promise<void> {
    const fase = await this.faseRepo.buscarPorId(faseId);
    if (!fase) return;

    const jogosDaRodada = jogos.filter(
      (j: any) => j.faseId === faseId && j.rodada === rodada,
    );
    if (jogosDaRodada.length === 0) return;

    const grupos = await this.grupoRepo.buscarPorTemporadaId(fase.temporadaId);

    for (const grupo of grupos) {
      const jaDuplicada = await this.notificacaoRepo.existeNotificacao({
        tipo: 'PALPITES_PENDENTES',
        faseId,
        rodada,
        grupoId: grupo.id,
      });
      if (jaDuplicada) continue;

      const membros = await this.grupoUsuarioRepo.listarPorGrupoComUsuario(
        grupo.id,
      );
      const usuarioIds = membros.map((m: any) => m.usuarioId);
      const jogoIds = jogosDaRodada.map((j: any) => j.id);

      const palpites = await this.palpiteRepo.listarPorJogosEUsuarios(
        jogoIds,
        usuarioIds,
      );
      const palpitesPorUsuario = new Map<string, number>();
      for (const p of palpites) {
        palpitesPorUsuario.set(
          p.usuarioId,
          (palpitesPorUsuario.get(p.usuarioId) ?? 0) + 1,
        );
      }

      const notificacoes: CriarNotificacaoData[] = [];
      const usuariosParaPush: string[] = [];

      for (const uid of usuarioIds) {
        const feitos = palpitesPorUsuario.get(uid) ?? 0;
        const pendentes = jogosDaRodada.length - feitos;
        if (pendentes <= 0) continue;

        notificacoes.push({
          tipo: 'PALPITES_PENDENTES',
          titulo: NOTIFICACOES.TEMPLATES.PALPITES_PENDENTES.titulo,
          mensagem: NOTIFICACOES.TEMPLATES.PALPITES_PENDENTES.mensagem(
            pendentes,
            rodada,
          ),
          usuarioId: uid,
          faseId,
          rodada,
          grupoId: grupo.id,
        });
        usuariosParaPush.push(uid);
      }

      if (notificacoes.length === 0) continue;

      const habilitados =
        await this.preferenciaService.filtrarUsuariosHabilitados(
          usuariosParaPush,
          'PALPITES_PENDENTES',
        );
      const notificacoesFiltradas = notificacoes.filter((n) =>
        habilitados.includes(n.usuarioId),
      );

      await this.notificacaoService.criarLote(notificacoesFiltradas);
      await this.pushService.enviarParaUsuarios(habilitados, {
        titulo: NOTIFICACOES.TEMPLATES.PALPITES_PENDENTES.titulo,
        mensagem: `Você tem palpites pendentes para a rodada ${rodada}!`,
        tipo: 'PALPITES_PENDENTES',
      });
    }
  }

  private calcularPontosAcerto(palpite: any, jogo: any, grupo: any): number {
    const resultado = this.pontuacaoService.calcular(
      { golsCasa: palpite.golsCasa, golsFora: palpite.golsFora },
      { golsCasa: jogo.golsCasa, golsFora: jogo.golsFora },
    );
    const multiplicador = grupo.permitirPalpiteDobrado ? 2 : 1;
    return (resultado.pontosBase ?? 0) * multiplicador;
  }

  private extrairFasesRodadasUnicas(
    jogos: any[],
  ): { faseId: string; rodada: number }[] {
    const set = new Set<string>();
    const resultado: { faseId: string; rodada: number }[] = [];

    for (const jogo of jogos) {
      if (jogo.rodada == null) continue;
      const chave = `${jogo.faseId}:${jogo.rodada}`;
      if (set.has(chave)) continue;
      set.add(chave);
      resultado.push({ faseId: jogo.faseId, rodada: jogo.rodada });
    }

    return resultado;
  }
}
