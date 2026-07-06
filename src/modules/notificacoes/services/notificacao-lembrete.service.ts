import { Inject, Injectable, Logger } from '@nestjs/common';
import { NOTIFICACOES } from '../notificacoes.constants';
import { JOGOS } from '../../jogos/jogos.constants';
import { PALPITES } from '../../palpites/palpites.constants';
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
import type { FaseRepository } from '../../jogos/repositories/fase.repository.interface';
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
export class NotificacaoLembreteService {
  private readonly logger = new Logger(NotificacaoLembreteService.name);

  constructor(
    private readonly notificacaoService: NotificacaoService,
    private readonly pushService: PushService,
    private readonly preferenciaService: PreferenciaService,
    @Inject(NOTIFICACOES.NOTIFICACAO_REPOSITORY_TOKEN)
    private readonly notificacaoRepo: NotificacaoRepository,
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    @Inject(PALPITES.PALPITE_REPOSITORY_TOKEN)
    private readonly palpiteRepo: PalpiteRepository,
    @Inject(GRUPO_USUARIO.REPOSITORY_TOKEN)
    private readonly grupoUsuarioRepo: GrupoUsuarioRepository,
    @Inject(GRUPOS.REPOSITORY_TOKEN)
    private readonly grupoRepo: GrupoRepository,
  ) {}

  async notificarJogoProximo(jogo: JogoNotif): Promise<void> {
    const jaDuplicada = await this.notificacaoRepo.existeNotificacao({
      tipo: 'JOGO_PROXIMO',
      jogoId: jogo.id,
    });
    if (jaDuplicada) return;

    const fase = (await this.faseRepo.buscarPorId(
      jogo.faseId,
    )) as FaseNotif | null;
    if (!fase) return;

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

    const palpites = (await this.palpiteRepo.listarPorJogoEUsuarios(
      jogo.id,
      todosUsuarios,
    )) as PalpiteNotif[];
    const quemJaPalpitou = new Set(palpites.map((p) => p.usuarioId));
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

  async notificarPalpitesPendentes(
    faseId: string,
    rodada: number,
    jogos: JogoNotif[],
  ): Promise<void> {
    const fase = (await this.faseRepo.buscarPorId(faseId)) as FaseNotif | null;
    if (!fase) return;

    const jogosDaRodada = jogos.filter(
      (j) => j.faseId === faseId && j.rodada === rodada,
    );
    if (jogosDaRodada.length === 0) return;

    const jaDuplicada = await this.notificacaoRepo.existeNotificacao({
      tipo: 'PALPITES_PENDENTES',
      faseId,
      rodada,
    });
    if (jaDuplicada) return;

    const usuarioIds = await this.obterUsuariosDaTemporada(fase.temporadaId);
    if (usuarioIds.length === 0) return;

    const palpitesPorUsuario = await this.mapearPalpitesPorUsuario(
      jogosDaRodada,
      usuarioIds,
    );

    const isMataMata = fase.tipo === 'MATA_MATA';
    const { notificacoes, usuariosParaPush } = this.montarNotificacoesPendentes(
      usuarioIds,
      jogosDaRodada,
      palpitesPorUsuario,
      isMataMata,
      faseId,
      rodada,
    );

    if (notificacoes.length === 0) return;

    const habilitados =
      await this.preferenciaService.filtrarUsuariosHabilitados(
        usuariosParaPush,
        'PALPITES_PENDENTES',
      );
    const notificacoesFiltradas = notificacoes.filter((n) =>
      habilitados.includes(n.usuarioId),
    );

    await this.notificacaoService.criarLote(notificacoesFiltradas);

    // Push individual por usuário com mensagem personalizada (lista os jogos pendentes)
    for (const notif of notificacoesFiltradas) {
      await this.pushService.enviarParaUsuario(notif.usuarioId, {
        titulo: notif.titulo,
        mensagem: notif.mensagem,
        tipo: 'PALPITES_PENDENTES',
      });
    }
  }

  async obterUsuariosDaTemporada(temporadaId: string): Promise<string[]> {
    const grupos = (await this.grupoRepo.buscarPorTemporadaId(
      temporadaId,
    )) as GrupoNotif[];
    const usuarioIdsSet = new Set<string>();

    for (const grupo of grupos) {
      const membros = (await this.grupoUsuarioRepo.listarPorGrupoComUsuario(
        grupo.id,
      )) as MembroNotif[];
      for (const m of membros) {
        usuarioIdsSet.add(m.usuarioId);
      }
    }

    return [...usuarioIdsSet];
  }

  async mapearPalpitesPorUsuario(
    jogosDaRodada: JogoNotif[],
    usuarioIds: string[],
  ): Promise<Map<string, Set<string>>> {
    const jogoIds = jogosDaRodada.map((j) => j.id);
    const palpites = (await this.palpiteRepo.listarPorJogosEUsuarios(
      jogoIds,
      usuarioIds,
    )) as PalpiteNotif[];

    const mapa = new Map<string, Set<string>>();
    for (const p of palpites) {
      if (!mapa.has(p.usuarioId)) {
        mapa.set(p.usuarioId, new Set());
      }
      mapa.get(p.usuarioId)!.add(p.jogoId);
    }
    return mapa;
  }

  montarNotificacoesPendentes(
    usuarioIds: string[],
    jogosDaRodada: JogoNotif[],
    palpitesPorUsuario: Map<string, Set<string>>,
    isMataMata: boolean,
    faseId: string,
    rodada: number,
  ): { notificacoes: CriarNotificacaoData[]; usuariosParaPush: string[] } {
    const notificacoes: CriarNotificacaoData[] = [];
    const usuariosParaPush: string[] = [];

    for (const uid of usuarioIds) {
      const jogosPalpitados = palpitesPorUsuario.get(uid) ?? new Set();
      const jogosPendentes = jogosDaRodada.filter(
        (j) => !jogosPalpitados.has(j.id),
      );
      if (jogosPendentes.length === 0) continue;

      const mensagem = isMataMata
        ? NOTIFICACOES.TEMPLATES.PALPITES_PENDENTES.mensagemMataMata(
            jogosPendentes.map(
              (j) =>
                `${j.timeCasa?.nome ?? 'Casa'} × ${j.timeFora?.nome ?? 'Fora'}`,
            ),
          )
        : NOTIFICACOES.TEMPLATES.PALPITES_PENDENTES.mensagem(
            jogosPendentes.length,
            rodada,
          );

      notificacoes.push({
        tipo: 'PALPITES_PENDENTES',
        titulo: NOTIFICACOES.TEMPLATES.PALPITES_PENDENTES.titulo,
        mensagem,
        usuarioId: uid,
        faseId,
        rodada,
      });
      usuariosParaPush.push(uid);
    }

    return { notificacoes, usuariosParaPush };
  }

  extrairFasesRodadasUnicas(
    jogos: JogoNotif[],
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
