import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { JogoService } from './jogo.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { JOGOS, SYNC, CAMPEONATO_CONFIGS } from '../jogos.constants';
import type {
  LogSincronizacaoRepository,
  StatusSincronizacao,
} from '../repositories/log-sincronizacao.repository.interface';

interface FaseParaSync {
  faseId: string;
  faseSlug: string;
  campeonatoSlug: string;
  totalPendentes: number;
}

export interface EstadoSincronizacao {
  temJogosEmAndamento: boolean;
  proximoJogoEm: number | null;
  ultimaSincronizacao: number;
}

@Injectable()
export class SincronizacaoAutomaticaService implements OnModuleInit {
  private readonly logger = new Logger(SincronizacaoAutomaticaService.name);
  private readonly habilitada: boolean;
  private readonly campeonatosPermitidos: string[];
  private estado: EstadoSincronizacao = {
    temJogosEmAndamento: false,
    proximoJogoEm: null,
    ultimaSincronizacao: 0,
  };
  private sincronizando = false;

  constructor(
    private readonly jogoService: JogoService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly prisma: PrismaService,
    @Inject(JOGOS.LOG_SINCRONIZACAO_REPOSITORY_TOKEN)
    private readonly logRepo: LogSincronizacaoRepository,
  ) {
    this.habilitada =
      this.configService.get<string>('SYNC_AUTOMATICA_HABILITADA') === 'true';
    const campeonatos = this.configService.get<string>('SYNC_CAMPEONATOS') ?? '';
    this.campeonatosPermitidos = campeonatos
      ? campeonatos.split(',').map((s) => s.trim())
      : Object.keys(CAMPEONATO_CONFIGS);
  }

  onModuleInit() {
    if (!this.habilitada) {
      this.logger.warn(
        'Sincronização automática DESABILITADA (SYNC_AUTOMATICA_HABILITADA != true)',
      );
      return;
    }

    this.logger.log(
      `Sincronização automática HABILITADA para: ${this.campeonatosPermitidos.join(', ')}`,
    );

    const interval = setInterval(
      () => this.verificarEExecutar(),
      60 * 1000,
    );
    this.schedulerRegistry.addInterval('sync-automatica-verificacao', interval);

    // Verificação inicial após 10s para o app estabilizar
    setTimeout(() => this.verificarEExecutar(), 10 * 1000);
  }

  private async verificarEExecutar(): Promise<void> {
    if (this.sincronizando) return;

    try {
      const agora = Date.now();
      const intervaloNecessario = this.calcularIntervalo();
      const tempoDesdeUltimaSync = agora - this.estado.ultimaSincronizacao;

      if (tempoDesdeUltimaSync < intervaloNecessario) {
        return;
      }

      await this.executarSincronizacao();
    } catch (error) {
      this.logger.error('[SYNC-AUTO] Erro na verificação', error);
    }
  }

  private calcularIntervalo(): number {
    // Jogos em andamento → 2 minutos
    if (this.estado.temJogosEmAndamento) {
      return SYNC.INTERVALO_COM_JOGOS_AO_VIVO_MS;
    }

    // Próximo jogo em menos de 5 minutos → 2 minutos (pré-início)
    if (
      this.estado.proximoJogoEm !== null &&
      this.estado.proximoJogoEm <= SYNC.ANTECEDENCIA_INICIO_MS
    ) {
      return SYNC.INTERVALO_COM_JOGOS_AO_VIVO_MS;
    }

    // Há próximo jogo no dia → 5 minutos
    if (this.estado.proximoJogoEm !== null) {
      return SYNC.INTERVALO_PROXIMO_JOGO_MS;
    }

    // Sem jogos próximos → 15 minutos
    return SYNC.INTERVALO_SEM_JOGOS_MS;
  }

  private async executarSincronizacao(): Promise<void> {
    this.sincronizando = true;
    const inicio = Date.now();

    try {
      this.logger.log('[SYNC-AUTO] Iniciando ciclo de sincronização');

      // Detectar estado atual dos jogos
      const { jogosEmAndamento, proximoJogo } = await this.detectarEstadoJogos();
      const temJogosEmAndamento = jogosEmAndamento > 0;

      let proximoJogoEm: number | null = null;
      if (proximoJogo?.dataHora) {
        proximoJogoEm = new Date(proximoJogo.dataHora).getTime() - Date.now();
      }

      // Sincronizar se há jogos em andamento (inclui "atrasados" que já passaram do horário),
      // ou se há próximo jogo dentro da antecedência
      const deveSincronizar =
        temJogosEmAndamento ||
        (proximoJogoEm !== null && proximoJogoEm <= SYNC.ANTECEDENCIA_INICIO_MS);

      if (!deveSincronizar) {
        // Verificar se há jogos adiados que precisam de checagem periódica
        const temAdiados = await this.prisma.jogo.count({
          where: {
            status: 'ADIADO',
            fonteResultado: 'API_EXTERNA',
            externoId: { not: null },
          },
        });

        const tempoDesdeUltimaSync = Date.now() - this.estado.ultimaSincronizacao;
        const deveVerificarAdiados =
          temAdiados > 0 && tempoDesdeUltimaSync >= SYNC.INTERVALO_SEM_JOGOS_MS;

        if (!deveVerificarAdiados) {
          this.estado = {
            temJogosEmAndamento: false,
            proximoJogoEm,
            ultimaSincronizacao: Date.now(),
          };

          this.logger.log(
            `[SYNC-AUTO] Sem jogos para sincronizar | próximo jogo em ${proximoJogoEm ? Math.round(proximoJogoEm / 60000) + 'min' : 'indefinido'}`,
          );
          return;
        }

        this.logger.log(
          `[SYNC-AUTO] Verificando ${temAdiados} jogo(s) adiado(s) para possível remarcação`,
        );
      }

      // Buscar fases com jogos que precisam de sync
      const fasesParaSync = await this.buscarFasesParaSincronizar();

      if (fasesParaSync.length === 0) {
        this.estado = {
          temJogosEmAndamento,
          proximoJogoEm,
          ultimaSincronizacao: Date.now(),
        };
        return;
      }

      // Agrupar por campeonato para evitar requests duplicados
      const porCampeonato = this.agruparPorCampeonato(fasesParaSync);

      for (const [campeonatoSlug, fases] of Object.entries(porCampeonato)) {
        await this.sincronizarFasesDoCampeonato(campeonatoSlug, fases);
      }

      // Recalcular estado após sincronização
      const estadoPosSync = await this.detectarEstadoJogos();
      this.estado = {
        temJogosEmAndamento: estadoPosSync.jogosEmAndamento > 0,
        proximoJogoEm: estadoPosSync.proximoJogo?.dataHora
          ? new Date(estadoPosSync.proximoJogo.dataHora).getTime() - Date.now()
          : null,
        ultimaSincronizacao: Date.now(),
      };

      const duracao = Date.now() - inicio;
      this.logger.log(
        `[SYNC-AUTO] Ciclo completo em ${duracao}ms | emAndamento=${this.estado.temJogosEmAndamento} | proximoJogoEm=${this.estado.proximoJogoEm ? Math.round(this.estado.proximoJogoEm / 60000) + 'min' : 'nenhum'}`,
      );
    } catch (error) {
      this.logger.error('[SYNC-AUTO] Erro no ciclo de sincronização', error);
      this.estado.ultimaSincronizacao = Date.now();
    } finally {
      this.sincronizando = false;
    }
  }

  private async detectarEstadoJogos(): Promise<{
    jogosEmAndamento: number;
    proximoJogo: { dataHora: Date } | null;
  }> {
    const [emAndamento, jogosAtrasados, proximoJogo] = await Promise.all([
      this.prisma.jogo.count({
        where: {
          status: 'EM_ANDAMENTO',
          fonteResultado: 'API_EXTERNA',
        },
      }),
      // Jogos que já passaram do horário mas ainda estão AGENDADO no banco
      // (provavelmente já começaram mas a API ainda não foi consultada)
      this.prisma.jogo.count({
        where: {
          status: 'AGENDADO',
          fonteResultado: 'API_EXTERNA',
          dataHora: { not: null, lte: new Date() },
        },
      }),
      this.prisma.jogo.findFirst({
        where: {
          status: 'AGENDADO',
          fonteResultado: 'API_EXTERNA',
          dataHora: { not: null, gt: new Date() },
        },
        orderBy: { dataHora: 'asc' },
        select: { dataHora: true },
      }),
    ]);

    return {
      jogosEmAndamento: emAndamento + jogosAtrasados,
      proximoJogo: proximoJogo?.dataHora ? { dataHora: proximoJogo.dataHora } : null,
    };
  }

  private async buscarFasesParaSincronizar(): Promise<FaseParaSync[]> {
    // Buscar fases que têm jogos EM_ANDAMENTO ou AGENDADO prestes a começar
    const agora = new Date();
    const limiteAntecedencia = new Date(
      agora.getTime() + SYNC.ANTECEDENCIA_INICIO_MS,
    );

    const fasesComJogosPendentes = await this.prisma.jogo.groupBy({
      by: ['faseId'],
      where: {
        fonteResultado: 'API_EXTERNA',
        externoId: { not: null },
        OR: [
          { status: 'EM_ANDAMENTO' },
          {
            status: 'AGENDADO',
            dataHora: { lte: limiteAntecedencia },
          },
          { status: 'ADIADO' },
        ],
      },
      _count: { id: true },
    });

    if (fasesComJogosPendentes.length === 0) return [];

    // Buscar informação das fases para mapear ao campeonato
    const fasesIds = fasesComJogosPendentes.map((f) => f.faseId);
    const fases = await this.prisma.fase.findMany({
      where: { id: { in: fasesIds } },
      include: {
        temporada: {
          include: { campeonato: true },
        },
      },
    });

    const resultado: FaseParaSync[] = [];

    for (const fase of fases) {
      const campeonatoSlug = this.resolverCampeonatoSlug(fase.temporada?.campeonato?.nome);
      if (!campeonatoSlug || !this.campeonatosPermitidos.includes(campeonatoSlug)) {
        continue;
      }

      const faseSlug = this.resolverFaseSlug(campeonatoSlug, fase);
      if (!faseSlug) continue;

      const grupo = fasesComJogosPendentes.find((f) => f.faseId === fase.id);
      resultado.push({
        faseId: fase.id,
        faseSlug,
        campeonatoSlug,
        totalPendentes: grupo?._count?.id ?? 0,
      });
    }

    return resultado;
  }

  private resolverCampeonatoSlug(nomeCampeonato?: string | null): string | null {
    if (!nomeCampeonato) return null;

    const nomeLower = nomeCampeonato.toLowerCase();

    if (nomeLower.includes('brasileiro') || nomeLower.includes('brasileirão')) {
      return 'brasileirao';
    }
    if (nomeLower.includes('copa do mundo')) {
      return 'copa-do-mundo-2026';
    }

    return null;
  }

  private resolverFaseSlug(
    campeonatoSlug: string,
    fase: { nome: string; tipo: string },
  ): string | null {
    const config = CAMPEONATO_CONFIGS[campeonatoSlug];
    if (!config) return null;

    if (config.fases.length === 1) {
      return config.fases[0].slug;
    }

    if (campeonatoSlug === 'brasileirao') {
      const faseAtual = config.fases.find((f) => f.tipo === 'PONTOS_CORRIDOS');
      return faseAtual?.slug ?? config.fases[0].slug;
    }

    if (campeonatoSlug === 'copa-do-mundo-2026') {
      return this.resolverFaseSlugCopa(config, fase);
    }

    return config.fases[0]?.slug ?? null;
  }

  private resolverFaseSlugCopa(
    config: typeof CAMPEONATO_CONFIGS[string],
    fase: { nome: string; tipo: string },
  ): string | null {
    if (fase.tipo === 'PONTOS_CORRIDOS') {
      return config.fases.find((f) => f.tipo === 'PONTOS_CORRIDOS')?.slug ?? null;
    }

    const nomeLower = fase.nome.toLowerCase();
    const mapeamento: [string, string][] = [
      ['32avos', '32'],
      ['32avos', 'trinta e dois'],
      ['oitavas', 'oitavas'],
      ['quartas', 'quartas'],
      ['semifinais', 'semi'],
      ['terceiro', 'terceiro'],
    ];

    for (const [slugParte, termo] of mapeamento) {
      if (nomeLower.includes(termo)) {
        return config.fases.find((f) => f.slug.includes(slugParte))?.slug ?? null;
      }
    }

    if (nomeLower.includes('final') && !nomeLower.includes('semi')) {
      return config.fases.find((f) => f.slug === 'final-copa-do-mundo-2026')?.slug ?? null;
    }

    return null;
  }

  private agruparPorCampeonato(
    fases: FaseParaSync[],
  ): Record<string, FaseParaSync[]> {
    const agrupado: Record<string, FaseParaSync[]> = {};

    for (const fase of fases) {
      if (!agrupado[fase.campeonatoSlug]) {
        agrupado[fase.campeonatoSlug] = [];
      }
      agrupado[fase.campeonatoSlug].push(fase);
    }

    return agrupado;
  }

  private async sincronizarFasesDoCampeonato(
    campeonatoSlug: string,
    fases: FaseParaSync[],
  ): Promise<void> {
    const inicio = Date.now();
    let totalSincronizados = 0;
    let totalJogos = 0;
    let totalErros = 0;
    const fasesIds: string[] = [];
    const detalhes: any[] = [];

    // Deduplicar faseSlug (múltiplas fases do banco podem apontar para o mesmo slug da API)
    const faseSlugsProcessados = new Set<string>();

    for (const fase of fases) {
      // Evitar sincronizar o mesmo slug 2x (ex: 12 grupos da Copa, todos apontam para o mesmo slug)
      if (faseSlugsProcessados.has(fase.faseSlug)) {
        fasesIds.push(fase.faseId);
        totalJogos += fase.totalPendentes;
        continue;
      }
      faseSlugsProcessados.add(fase.faseSlug);
      fasesIds.push(fase.faseId);
      totalJogos += fase.totalPendentes;

      try {
        const resultado = await this.jogoService.sincronizarPlacares(
          fase.faseId,
          campeonatoSlug,
          fase.faseSlug,
        );

        totalSincronizados += resultado.sincronizados;

        if (resultado.jogosAtualizados && resultado.jogosAtualizados.length > 0) {
          detalhes.push({
            faseId: fase.faseId,
            faseSlug: fase.faseSlug,
            sincronizados: resultado.sincronizados,
            jogos: resultado.jogosAtualizados.map((j: any) => ({
              timeCasa: j.timeCasa,
              timeFora: j.timeFora,
              status: j.status,
              golsCasa: j.golsCasa,
              golsFora: j.golsFora,
            })),
          });
        }
      } catch (error: any) {
        totalErros++;
        this.logger.warn(
          `[SYNC-AUTO] Erro fase ${fase.faseId} (${fase.faseSlug}): ${error?.message}`,
        );
        detalhes.push({
          faseId: fase.faseId,
          faseSlug: fase.faseSlug,
          erro: error?.message ?? 'Erro desconhecido',
        });
      }
    }

    const status: StatusSincronizacao = this.determinarStatusSync(
      totalErros,
      totalSincronizados,
    );

    await this.registrarLog({
      campeonatoSlug,
      fasesIds,
      totalJogos,
      sincronizados: totalSincronizados,
      erros: totalErros,
      status,
      mensagem:
        totalSincronizados > 0
          ? `${totalSincronizados} jogo(s) atualizado(s)`
          : 'Nenhuma atualização necessária',
      duracaoMs: Date.now() - inicio,
      detalhes: detalhes.length > 0 ? detalhes : undefined,
    });

    this.logger.log(
      `[SYNC-AUTO] ${campeonatoSlug}: ${totalSincronizados}/${totalJogos} sincronizados, ${totalErros} erros, ${Date.now() - inicio}ms`,
    );
  }

  private async registrarLog(data: {
    campeonatoSlug: string;
    fasesIds: string[];
    totalJogos: number;
    sincronizados: number;
    erros?: number;
    status: StatusSincronizacao;
    mensagem?: string;
    duracaoMs: number;
    detalhes?: any;
  }): Promise<void> {
    try {
      await this.logRepo.criar(data);
    } catch (error) {
      this.logger.error('[SYNC-AUTO] Erro ao registrar log', error);
    }
  }

  // --- Métodos públicos para consulta (usado pelo controller/admin) ---

  async obterStatus(): Promise<{
    habilitada: boolean;
    campeonatos: string[];
    estado: EstadoSincronizacao;
    sincronizando: boolean;
  }> {
    return {
      habilitada: this.habilitada,
      campeonatos: this.campeonatosPermitidos,
      estado: this.estado,
      sincronizando: this.sincronizando,
    };
  }

  async obterLogsRecentes(limite?: number) {
    return this.logRepo.buscarRecentes(limite);
  }

  async obterLogsPorCampeonato(campeonatoSlug: string, limite?: number) {
    return this.logRepo.buscarPorCampeonato(campeonatoSlug, limite);
  }

  // Forçar execução manual (para admin)
  async forcarSincronizacao(): Promise<void> {
    this.estado.ultimaSincronizacao = 0;
    await this.executarSincronizacao();
  }

  private determinarStatusSync(
    totalErros: number,
    totalSincronizados: number,
  ): StatusSincronizacao {
    if (totalErros > 0 && totalSincronizados === 0) return 'ERRO';
    if (totalErros > 0) return 'PARCIAL';
    return 'SUCESSO';
  }
}
