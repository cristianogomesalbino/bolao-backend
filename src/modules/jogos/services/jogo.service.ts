import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  JOGOS,
  obterCampeonatoConfig,
  obterFaseConfig,
  validarRodada,
} from '../jogos.constants';
import { TIMES } from '../../times/time.constants';
import type { JogoRepository } from '../repositories/jogo.repository.interface';
import type { FaseRepository } from '../repositories/fase.repository.interface';
import type { TimeRepository } from '../../times/repositories/time.repository.interface';
import { FutebolApiService } from './futebol-api.service';
import { ErrorFactory } from '../../../common/errors/error.factory';
import { CriarJogoDto } from '../dto/criar-jogo.dto';
import { AtualizarJogoDto } from '../dto/atualizar-jogo.dto';
import { FinalizarJogoDto } from '../dto/finalizar-jogo.dto';
import { ImportarJogosDto } from '../dto/importar-jogos.dto';
import {
  FaseNaoEncontradaError,
  JogoNaoEncontradoError,
  TimesIguaisError,
  JogoFinalizadoError,
  JogoCanceladoError,
  PlacarInvalidoError,
  ProrrogacaoNaoPermitidaError,
  PenaltisNaoPermitidoError,
  PlacarPenaltisEmpatadoError,
  VencedorObrigatorioError,
  TransicaoStatusInvalidaError,
  IdaVoltaNaoPermitidaError,
  JogoIdaNaoEncontradoError,
  ApiExternaIndisponivelError,
} from '../../../common/errors/domain-errors';

const TRANSICOES_VALIDAS: Record<string, string[]> = {
  AGENDADO: ['EM_ANDAMENTO', 'ADIADO', 'CANCELADO'],
  ADIADO: ['AGENDADO', 'CANCELADO'],
  EM_ANDAMENTO: ['FINALIZADO', 'CANCELADO'],
};

@Injectable()
export class JogoService {
  private readonly logger = new Logger(JogoService.name);

  constructor(
    @Inject(JOGOS.JOGO_REPOSITORY_TOKEN)
    private readonly jogoRepo: JogoRepository,
    @Inject(JOGOS.FASE_REPOSITORY_TOKEN)
    private readonly faseRepo: FaseRepository,
    private readonly futebolApiService: FutebolApiService,
    @Inject(TIMES.REPOSITORY_TOKEN)
    private readonly timeRepo: TimeRepository,
  ) {}

  async criar(dto: CriarJogoDto & { faseId: string }, userId: string) {
    const fase = await this.faseRepo.buscarPorId(dto.faseId);
    if (!fase) {
      throw new FaseNaoEncontradaError();
    }

    if (dto.timeCasaId === dto.timeForaId) {
      throw new TimesIguaisError();
    }

    let grupoIdaVolta = dto.grupoIdaVolta ?? null;
    let ehJogoVolta = dto.ehJogoVolta ?? false;

    if (fase.tipo === 'PONTOS_CORRIDOS') {
      grupoIdaVolta = null;
      ehJogoVolta = false;
    }

    if (ehJogoVolta && !fase.idaVolta) {
      throw new IdaVoltaNaoPermitidaError();
    }

    if (ehJogoVolta && grupoIdaVolta) {
      const jogosDoGrupo =
        await this.jogoRepo.buscarPorGrupoIdaVolta(grupoIdaVolta);
      const jogoIda = jogosDoGrupo.find((j: any) => !j.ehJogoVolta);
      if (!jogoIda) {
        throw new JogoIdaNaoEncontradoError();
      }
    }

    const data: any = {
      faseId: dto.faseId,
      timeCasaId: dto.timeCasaId,
      timeForaId: dto.timeForaId,
      dataHora: new Date(dto.dataHora),
      rodada: dto.rodada ?? null,
      status: 'AGENDADO',
      temProrrogacao: false,
      temPenaltis: false,
      ehJogoVolta,
      grupoIdaVolta,
      fonteResultado: 'MANUAL',
      criadoPor: userId,
    };

    return this.jogoRepo.criar(data);
  }

  async atualizar(id: string, dto: AtualizarJogoDto) {
    const jogo = await this.jogoRepo.buscarPorId(id);
    if (!jogo) {
      throw new JogoNaoEncontradoError();
    }

    if (jogo.status === 'FINALIZADO') {
      throw new JogoFinalizadoError();
    }

    if (jogo.status === 'CANCELADO') {
      throw new JogoCanceladoError();
    }

    const timeCasa = dto.timeCasaId ?? jogo.timeCasaId;
    const timeFora = dto.timeForaId ?? jogo.timeForaId;
    if (timeCasa === timeFora) {
      throw new TimesIguaisError();
    }

    if (dto.status) {
      this.validarTransicaoStatus(jogo.status, dto.status);
    }

    // Modo híbrido — qualquer edição manual em jogo API_EXTERNA flip para MANUAL
    const updateData: any = { ...dto };
    if (jogo.fonteResultado === 'API_EXTERNA') {
      updateData.fonteResultado = 'MANUAL';
    }

    return this.jogoRepo.atualizar(id, updateData);
  }

  validarTransicaoStatus(atual: string, novo: string) {
    const permitidas = TRANSICOES_VALIDAS[atual];
    if (!permitidas?.includes(novo)) {
      throw new TransicaoStatusInvalidaError();
    }
  }

  async finalizar(id: string, dto: FinalizarJogoDto) {
    const jogo = await this.jogoRepo.buscarPorId(id);
    if (!jogo) {
      throw new JogoNaoEncontradoError();
    }

    const fase = await this.faseRepo.buscarPorId(jogo.faseId);

    this.validarTransicaoStatus(jogo.status, 'FINALIZADO');

    if (dto.golsCasa < 0 || dto.golsFora < 0) {
      throw new PlacarInvalidoError();
    }

    if (fase.tipo === 'PONTOS_CORRIDOS') {
      return this.finalizarPontosCorridos(jogo, dto);
    }

    return this.finalizarMataMata(jogo, fase, dto);
  }

  private async finalizarPontosCorridos(jogo: any, dto: FinalizarJogoDto) {
    this.validarSemDesempate(dto);

    const vencedorId = this.determinarVencedorPorPlacar(
      dto.golsCasa,
      dto.golsFora,
      jogo.timeCasaId,
      jogo.timeForaId,
    );

    return this.jogoRepo.atualizar(
      jogo.id,
      this.buildUpdateFinalizado(dto, vencedorId),
    );
  }

  private async finalizarMataMata(jogo: any, fase: any, dto: FinalizarJogoDto) {
    if (fase.idaVolta && !jogo.ehJogoVolta) {
      return this.finalizarJogoIda(jogo, dto);
    }

    if (fase.idaVolta && jogo.ehJogoVolta) {
      return this.finalizarJogoVolta(jogo, dto);
    }

    return this.finalizarMataMataSimples(jogo, dto);
  }

  private async finalizarJogoIda(jogo: any, dto: FinalizarJogoDto) {
    this.validarSemDesempate(dto);
    return this.jogoRepo.atualizar(
      jogo.id,
      this.buildUpdateFinalizado(dto, null),
    );
  }

  private async finalizarJogoVolta(jogo: any, dto: FinalizarJogoDto) {
    const jogosDoGrupo = await this.jogoRepo.buscarPorGrupoIdaVolta(
      jogo.grupoIdaVolta,
    );
    const jogoIda = jogosDoGrupo.find((j: any) => !j.ehJogoVolta);

    if (jogoIda?.status !== 'FINALIZADO') {
      throw new JogoIdaNaoEncontradoError();
    }

    const vencedorId = this.calcularVencedorAgregado(jogoIda, jogo, dto);

    const temProrrogacao = dto.temProrrogacao ?? false;
    const temPenaltis = dto.temPenaltis ?? false;

    return this.jogoRepo.atualizar(jogo.id, {
      status: 'FINALIZADO',
      golsCasa: dto.golsCasa,
      golsFora: dto.golsFora,
      temProrrogacao,
      golsProrrogacaoCasa: temProrrogacao
        ? (dto.golsProrrogacaoCasa ?? null)
        : null,
      golsProrrogacaoFora: temProrrogacao
        ? (dto.golsProrrogacaoFora ?? null)
        : null,
      temPenaltis,
      penaltisCasa: temPenaltis ? (dto.penaltisCasa ?? null) : null,
      penaltisFora: temPenaltis ? (dto.penaltisFora ?? null) : null,
      vencedorId,
    });
  }

  private async finalizarMataMataSimples(jogo: any, dto: FinalizarJogoDto) {
    const empateTN = dto.golsCasa === dto.golsFora;

    if (!empateTN) {
      return this.finalizarMataMataComVencedorTN(jogo, dto);
    }

    return this.finalizarMataMataComEmpate(jogo, dto);
  }

  private async finalizarMataMataComVencedorTN(
    jogo: any,
    dto: FinalizarJogoDto,
  ) {
    if (dto.temProrrogacao) {
      throw new ProrrogacaoNaoPermitidaError();
    }
    if (dto.temPenaltis) {
      throw new PenaltisNaoPermitidoError();
    }

    const vencedorId =
      dto.golsCasa > dto.golsFora ? jogo.timeCasaId : jogo.timeForaId;

    return this.jogoRepo.atualizar(
      jogo.id,
      this.buildUpdateFinalizado(dto, vencedorId),
    );
  }

  private async finalizarMataMataComEmpate(jogo: any, dto: FinalizarJogoDto) {
    if (!dto.temProrrogacao) {
      throw new VencedorObrigatorioError();
    }

    this.validarPlacarProrrogacao(dto);

    const empateProrrogacao =
      dto.golsProrrogacaoCasa === dto.golsProrrogacaoFora;

    if (!empateProrrogacao) {
      if (dto.temPenaltis) {
        throw new PenaltisNaoPermitidoError();
      }

      const vencedorId =
        (dto.golsProrrogacaoCasa ?? 0) > (dto.golsProrrogacaoFora ?? 0)
          ? jogo.timeCasaId
          : jogo.timeForaId;

      return this.jogoRepo.atualizar(jogo.id, {
        status: 'FINALIZADO',
        golsCasa: dto.golsCasa,
        golsFora: dto.golsFora,
        temProrrogacao: true,
        golsProrrogacaoCasa: dto.golsProrrogacaoCasa ?? 0,
        golsProrrogacaoFora: dto.golsProrrogacaoFora ?? 0,
        temPenaltis: false,
        penaltisCasa: null,
        penaltisFora: null,
        vencedorId,
      });
    }

    // Empate na prorrogação — precisa de pênaltis
    if (!dto.temPenaltis) {
      throw new VencedorObrigatorioError();
    }

    this.validarPlacarPenaltis(dto);

    const vencedorId =
      (dto.penaltisCasa ?? 0) > (dto.penaltisFora ?? 0)
        ? jogo.timeCasaId
        : jogo.timeForaId;

    return this.jogoRepo.atualizar(jogo.id, {
      status: 'FINALIZADO',
      golsCasa: dto.golsCasa,
      golsFora: dto.golsFora,
      temProrrogacao: true,
      golsProrrogacaoCasa: dto.golsProrrogacaoCasa ?? 0,
      golsProrrogacaoFora: dto.golsProrrogacaoFora ?? 0,
      temPenaltis: true,
      penaltisCasa: dto.penaltisCasa ?? 0,
      penaltisFora: dto.penaltisFora ?? 0,
      vencedorId,
    });
  }

  private validarPlacarProrrogacao(dto: FinalizarJogoDto) {
    if (dto.golsProrrogacaoCasa == null || dto.golsProrrogacaoFora == null) {
      throw new PlacarInvalidoError();
    }

    if (dto.golsProrrogacaoCasa < 0 || dto.golsProrrogacaoFora < 0) {
      throw new PlacarInvalidoError();
    }
  }

  private validarPlacarPenaltis(dto: FinalizarJogoDto) {
    if (dto.penaltisCasa == null || dto.penaltisFora == null) {
      throw new PlacarInvalidoError();
    }

    if (dto.penaltisCasa < 0 || dto.penaltisFora < 0) {
      throw new PlacarInvalidoError();
    }

    if (dto.penaltisCasa === dto.penaltisFora) {
      throw new PlacarPenaltisEmpatadoError();
    }
  }

  private validarSemDesempate(dto: FinalizarJogoDto) {
    if (
      dto.temProrrogacao ||
      dto.temPenaltis ||
      dto.golsProrrogacaoCasa != null ||
      dto.golsProrrogacaoFora != null ||
      dto.penaltisCasa != null ||
      dto.penaltisFora != null
    ) {
      throw new ProrrogacaoNaoPermitidaError();
    }
  }

  private determinarVencedorPorPlacar(
    golsCasa: number,
    golsFora: number,
    timeCasaId: string,
    timeForaId: string,
  ): string | null {
    if (golsCasa > golsFora) return timeCasaId;
    if (golsFora > golsCasa) return timeForaId;
    return null;
  }

  private buildUpdateFinalizado(
    dto: FinalizarJogoDto,
    vencedorId: string | null,
    extras?: any,
  ) {
    return {
      status: 'FINALIZADO',
      golsCasa: dto.golsCasa,
      golsFora: dto.golsFora,
      temProrrogacao: false,
      golsProrrogacaoCasa: null,
      golsProrrogacaoFora: null,
      temPenaltis: false,
      penaltisCasa: null,
      penaltisFora: null,
      vencedorId,
      ...extras,
    };
  }

  calcularVencedor(jogo: any): string | null {
    if (jogo.status !== 'FINALIZADO') return null;
    if (jogo.golsCasa == null || jogo.golsFora == null) return null;

    if (jogo.golsCasa > jogo.golsFora) return jogo.timeCasaId;
    if (jogo.golsFora > jogo.golsCasa) return jogo.timeForaId;

    if (
      !jogo.temProrrogacao ||
      jogo.golsProrrogacaoCasa == null ||
      jogo.golsProrrogacaoFora == null
    ) {
      return null;
    }

    if (jogo.golsProrrogacaoCasa > jogo.golsProrrogacaoFora)
      return jogo.timeCasaId;
    if (jogo.golsProrrogacaoFora > jogo.golsProrrogacaoCasa)
      return jogo.timeForaId;

    if (
      !jogo.temPenaltis ||
      jogo.penaltisCasa == null ||
      jogo.penaltisFora == null
    ) {
      return null;
    }

    if (jogo.penaltisCasa > jogo.penaltisFora) return jogo.timeCasaId;
    if (jogo.penaltisFora > jogo.penaltisCasa) return jogo.timeForaId;

    return null;
  }

  calcularVencedorAgregado(
    jogoIda: any,
    jogoVolta: any,
    dto: FinalizarJogoDto,
  ): string {
    const golsTimeA = (jogoIda.golsCasa ?? 0) + dto.golsFora;
    const golsTimeB = (jogoIda.golsFora ?? 0) + dto.golsCasa;

    if (golsTimeA > golsTimeB) {
      return jogoVolta.timeForaId;
    }
    if (golsTimeB > golsTimeA) {
      return jogoVolta.timeCasaId;
    }

    if (!dto.temProrrogacao) {
      throw new VencedorObrigatorioError();
    }

    this.validarPlacarProrrogacao(dto);

    if ((dto.golsProrrogacaoCasa ?? 0) !== (dto.golsProrrogacaoFora ?? 0)) {
      return (dto.golsProrrogacaoCasa ?? 0) > (dto.golsProrrogacaoFora ?? 0)
        ? jogoVolta.timeCasaId
        : jogoVolta.timeForaId;
    }

    if (!dto.temPenaltis) {
      throw new VencedorObrigatorioError();
    }

    this.validarPlacarPenaltis(dto);

    return (dto.penaltisCasa ?? 0) > (dto.penaltisFora ?? 0)
      ? jogoVolta.timeCasaId
      : jogoVolta.timeForaId;
  }

  async buscarPorFase(faseId: string, rodada?: number) {
    return this.jogoRepo.buscarPorFase(faseId, rodada);
  }

  async buscarPorFaseComDetalhes(
    faseId: string,
    rodada?: number,
    status?: string,
  ) {
    const fase = await this.faseRepo.buscarPorId(faseId);
    if (!fase) {
      throw new FaseNaoEncontradaError();
    }

    if (status) {
      const jogos = await this.jogoRepo.buscarPorFaseEStatus(faseId, status);
      return { fase, jogos, rodadaAtual: null };
    }

    const rodadaFiltro = rodada ?? (await this.obterRodadaAtual(faseId));
    const jogos = await this.jogoRepo.buscarPorFase(faseId, rodadaFiltro);
    return { fase, jogos, rodadaAtual: rodadaFiltro };
  }

  async obterRodadaAtual(faseId: string): Promise<number | undefined> {
    const rodada = await this.jogoRepo.buscarRodadaAtual(faseId);
    return rodada ?? undefined;
  }

  async buscarPorId(id: string) {
    const jogo = await this.jogoRepo.buscarPorId(id);
    if (!jogo) {
      throw new JogoNaoEncontradoError();
    }
    return jogo;
  }

  // --- Importação de jogos via API externa ---

  async importarJogos(dto: ImportarJogosDto, userId: string) {
    const fase = await this.faseRepo.buscarPorId(dto.faseId);
    if (!fase) {
      throw new FaseNaoEncontradaError();
    }

    // Resolver config e validar rodada
    const config = obterCampeonatoConfig(dto.campeonatoSlug);
    const faseConfig = obterFaseConfig(config, dto.faseSlug);
    validarRodada(dto.rodada, faseConfig);

    const faseSlugCompleto = config.buildFaseSlug(dto.faseSlug);
    const jogosApi = await this.futebolApiService.buscarJogosPorRodada(
      config.campeonatoId,
      faseSlugCompleto,
      dto.rodada,
    );

    const normalizados = jogosApi.map((j: any) =>
      this.futebolApiService.normalizarJogo(j),
    );

    const externoIds = normalizados.map((n: any) => n.externoId);
    const jogosExistentesGlobal =
      await this.buscarExternoIdsExistentes(externoIds);
    const externosExistentes = new Set(jogosExistentesGlobal);

    const timesCache = await this.carregarCacheTimes(normalizados);

    let importados = 0;
    let ignorados = 0;

    for (const normalizado of normalizados) {
      if (externosExistentes.has(normalizado.externoId)) {
        ignorados++;
        continue;
      }

      const timeCasa = await this.resolverOuCriarTime(
        normalizado.timeCasa,
        timesCache,
      );
      const timeFora = await this.resolverOuCriarTime(
        normalizado.timeFora,
        timesCache,
      );

      const vencedorId =
        normalizado.status === 'FINALIZADO' &&
        normalizado.golsCasa != null &&
        normalizado.golsFora != null
          ? this.determinarVencedorPorPlacar(
              normalizado.golsCasa,
              normalizado.golsFora,
              timeCasa.id,
              timeFora.id,
            )
          : null;

      const dataHora = normalizado.dataHora
        ? new Date(normalizado.dataHora)
        : null;
      const dataValida = dataHora && dataHora.getFullYear() >= 2020;

      await this.jogoRepo.criar({
        faseId: dto.faseId,
        rodada: dto.rodada,
        timeCasaId: timeCasa.id,
        timeForaId: timeFora.id,
        dataHora: dataValida ? dataHora : null,
        status: dataValida ? normalizado.status : 'ADIADO',
        foiAdiado: !dataValida,
        golsCasa: normalizado.golsCasa,
        golsFora: normalizado.golsFora,
        temProrrogacao: false,
        golsProrrogacaoCasa: null,
        golsProrrogacaoFora: null,
        temPenaltis: normalizado.penaltisCasa != null,
        penaltisCasa: normalizado.penaltisCasa,
        penaltisFora: normalizado.penaltisFora,
        vencedorId,
        ehJogoVolta: false,
        grupoIdaVolta: null,
        fonteResultado: 'API_EXTERNA',
        externoId: normalizado.externoId,
        criadoPor: userId,
      });

      importados++;
    }

    return { importados, ignorados };
  }

  private async buscarExternoIdsExistentes(
    externoIds: string[],
  ): Promise<string[]> {
    if (externoIds.length === 0) return [];
    const jogos = await this.jogoRepo.buscarPorExternoIds(externoIds);
    return jogos.map((j: any) => j.externoId);
  }

  private async carregarCacheTimes(
    normalizados: any[],
  ): Promise<Map<string, any>> {
    const externoIds = new Set<string>();
    for (const n of normalizados) {
      if (n.timeCasa?.externoId) externoIds.add(n.timeCasa.externoId);
      if (n.timeFora?.externoId) externoIds.add(n.timeFora.externoId);
    }

    const timesExistentes = await this.timeRepo.buscarPorExternoIds([
      ...externoIds,
    ]);
    const cache = new Map<string, any>();
    for (const time of timesExistentes) {
      cache.set(time.externoId, time);
    }
    return cache;
  }

  private async resolverOuCriarTime(
    timeData: {
      externoId: string;
      nome: string;
      sigla: string;
      escudo: string;
    },
    cache: Map<string, any>,
  ): Promise<any> {
    const cached = cache.get(timeData.externoId);
    if (cached?.escudo) return cached;

    if (cached && !cached.escudo && timeData.escudo) {
      const atualizado = await this.timeRepo.atualizar(cached.id, {
        escudo: timeData.escudo,
      });
      cache.set(timeData.externoId, atualizado);
      return atualizado;
    }

    if (cached) return cached;

    const existente = await this.timeRepo.buscarPorExternoId(
      timeData.externoId,
    );
    if (existente && !existente.escudo && timeData.escudo) {
      const atualizado = await this.timeRepo.atualizar(existente.id, {
        escudo: timeData.escudo,
      });
      cache.set(timeData.externoId, atualizado);
      return atualizado;
    }

    if (existente) {
      cache.set(timeData.externoId, existente);
      return existente;
    }

    // Buscar por sigla antes de criar — evita conflito de constraint unique
    const existentePorSigla = await this.timeRepo.buscarPorSigla(
      timeData.sigla,
    );
    if (existentePorSigla) {
      // Se já existe time com essa sigla mas externoId diferente, criar com sigla diferenciada
      if (
        existentePorSigla.externoId &&
        existentePorSigla.externoId !== timeData.externoId
      ) {
        const siglaUnica = `${timeData.sigla}-${timeData.externoId}`;
        const novo = await this.timeRepo.criar({
          ...timeData,
          sigla: siglaUnica,
        });
        cache.set(timeData.externoId, novo);
        return novo;
      }
      // Mesmo time sem externoId — vincular externoId + escudo
      const updateData: Record<string, any> = { externoId: timeData.externoId };
      if (timeData.escudo && !existentePorSigla.escudo)
        updateData.escudo = timeData.escudo;
      const atualizado = await this.timeRepo.atualizar(
        existentePorSigla.id,
        updateData,
      );
      cache.set(timeData.externoId, atualizado);
      return atualizado;
    }

    const novo = await this.timeRepo.criar(timeData);
    cache.set(timeData.externoId, novo);
    return novo;
  }

  // --- Sincronização de placares ---

  async sincronizarPlacares(
    faseId: string,
    campeonatoSlug: string,
    faseSlug: string,
  ) {
    const inicioTotal = Date.now();
    this.logger.log(
      `[SYNC] Iniciando sincronização: fase=${faseId}, campeonato=${campeonatoSlug}, faseSlug=${faseSlug}`,
    );

    const fase = await this.faseRepo.buscarPorId(faseId);
    if (!fase) {
      throw new FaseNaoEncontradaError();
    }

    const config = obterCampeonatoConfig(campeonatoSlug);
    const faseSlugCompleto = config.buildFaseSlug(faseSlug);

    // Detectar se há múltiplas fases do mesmo tipo na temporada (ex: grupos da Copa)
    const fasesParaSync = await this.obterFasesParaSync(fase);
    const faseIds = fasesParaSync.map((f: any) => f.id);

    this.logger.log(
      `[SYNC] Fases para sincronizar: ${faseIds.length} (${fasesParaSync.map((f: any) => f.nome).join(', ')})`,
    );

    // Calcular rodada atual (1 query) e buscar jogos pendentes em uma única query
    const rodadaAtual = await this.obterRodadaAtual(faseIds[0]);
    const rodadaEfetiva = rodadaAtual ?? 1;
    const limiteRodada = rodadaEfetiva + 1;

    const jogosParaSync = await this.jogoRepo.buscarPendentesSync(
      faseIds,
      limiteRodada,
    );

    this.logger.log(
      `[SYNC] rodadaAtual=${rodadaEfetiva}, limiteRodada=${limiteRodada}, jogosParaSync=${jogosParaSync.length}`,
    );

    if (jogosParaSync.length === 0) {
      this.logger.log('[SYNC] Nenhum jogo para sincronizar');
      return { sincronizados: 0, jogosAtualizados: [] };
    }

    const inicioApi = Date.now();
    const { jogoApiMap, apiDisponivel } = await this.buscarJogosParaSync(
      jogosParaSync,
      config.campeonatoId,
      faseSlugCompleto,
    );
    this.logger.log(
      `[SYNC] API respondeu em ${Date.now() - inicioApi}ms — jogos encontrados na API: ${jogoApiMap.size}, apiDisponivel=${apiDisponivel}`,
    );

    let sincronizados = 0;
    const jogosAtualizados: any[] = [];

    const inicioProcessamento = Date.now();
    for (const jogo of jogosParaSync) {
      const resultado = await this.processarJogoSync(
        jogo,
        jogoApiMap,
        apiDisponivel,
      );
      if (resultado.atualizado) {
        sincronizados++;
        const info = {
          id: jogo.id,
          timeCasa: jogo.timeCasa?.sigla || jogo.timeCasa?.nome,
          timeFora: jogo.timeFora?.sigla || jogo.timeFora?.nome,
          status: resultado.novoStatus ?? jogo.status,
          golsCasa: resultado.golsCasa ?? jogo.golsCasa,
          golsFora: resultado.golsFora ?? jogo.golsFora,
          rodada: jogo.rodada,
          horarioAlterado: resultado.horarioAlterado || false,
          horarioAnterior: resultado.horarioAnterior || null,
          horarioNovo: resultado.horarioNovo || null,
        };
        jogosAtualizados.push(info);

        this.logger.log(
          `[SYNC] ⚽ ${info.timeCasa} ${info.golsCasa ?? '?'} x ${info.golsFora ?? '?'} ${info.timeFora} → ${info.status}${info.horarioAlterado ? ' (horário alterado)' : ''}`,
        );
      }
    }

    this.logger.log(
      `[SYNC] Processamento de ${jogosParaSync.length} jogos em ${Date.now() - inicioProcessamento}ms — sincronizados=${sincronizados}`,
    );
    this.logger.log(
      `[SYNC] Sincronização completa em ${Date.now() - inicioTotal}ms`,
    );

    return { sincronizados, jogosAtualizados };
  }

  private async obterFasesParaSync(fase: {
    temporadaId: string;
    tipo: string;
  }): Promise<{ id: string; nome: string; tipo: string }[]> {
    // Buscar todas as fases da mesma temporada com o mesmo tipo
    const todasFases = await this.faseRepo.buscarPorTemporada(fase.temporadaId);
    const fasesDoMesmoTipo = (
      todasFases as { id: string; nome: string; tipo: string }[]
    ).filter((f) => f.tipo === fase.tipo);

    // Se há múltiplas fases do mesmo tipo (ex: 12 grupos da Copa), sincronizar todas
    if (fasesDoMesmoTipo.length > 1) {
      return fasesDoMesmoTipo;
    }

    // Caso contrário, sincronizar apenas a fase solicitada
    return [
      {
        id: (fase as any).id as string,
        nome: (fase as any).nome as string,
        tipo: fase.tipo,
      },
    ];
  }

  private async buscarJogosParaSync(
    jogos: any[],
    campeonatoId: string,
    faseSlug: string,
  ) {
    const rodadasPendentes = [
      ...new Set(jogos.map((j: any) => j.rodada).filter(Boolean)),
    ] as number[];
    let jogosApi: any[] = [];
    let apiDisponivel = true;

    try {
      jogosApi = await this.futebolApiService.buscarJogosPorRodadas(
        campeonatoId,
        faseSlug,
        rodadasPendentes,
      );
    } catch (error) {
      if (error instanceof ApiExternaIndisponivelError) {
        this.logger.warn(
          'API externa indisponível durante sincronização, usando fallback interno',
        );
        apiDisponivel = false;
      } else {
        throw error;
      }
    }

    const jogoApiMap = new Map<string, any>();
    for (const j of jogosApi) {
      const normalizado = this.futebolApiService.normalizarJogo(j);
      jogoApiMap.set(normalizado.externoId, normalizado);
    }

    return { jogoApiMap, apiDisponivel };
  }

  private async processarJogoSync(
    jogo: any,
    jogoApiMap: Map<string, any>,
    apiDisponivel: boolean,
  ): Promise<{
    atualizado: boolean;
    novoStatus?: string;
    golsCasa?: number | null;
    golsFora?: number | null;
    horarioAlterado?: boolean;
    horarioAnterior?: string | null;
    horarioNovo?: string | null;
  }> {
    const jogoApi = jogoApiMap.get(jogo.externoId);

    if (!jogoApi) {
      this.logger.warn(
        apiDisponivel
          ? `Jogo externo ${jogo.externoId} não encontrado na API`
          : `Usando fallback interno para jogo ${jogo.id} (externoId: ${jogo.externoId})`,
      );
    }

    const novoStatus = this.definirStatusFinal(jogo, jogoApi?.status);
    const updateData: any = { status: novoStatus };

    // Proteção: jogo sem data não pode ser AGENDADO nem EM_ANDAMENTO
    const semData = !jogo.dataHora && !jogoApi?.dataHora;
    const statusIncompativelSemData =
      updateData.status === 'AGENDADO' || updateData.status === 'EM_ANDAMENTO';

    if (semData && statusIncompativelSemData) {
      updateData.status = 'ADIADO';
    }

    const { horarioAlterado, horarioAnterior, horarioNovo } =
      this.detectarMudancaHorario(jogo, jogoApi, updateData);

    if (
      jogoApi &&
      (novoStatus === 'FINALIZADO' || novoStatus === 'EM_ANDAMENTO')
    ) {
      this.preencherPlacarSync(updateData, jogoApi, jogo, novoStatus);
    }

    if (novoStatus !== jogo.status || jogoApi) {
      // Verificar se realmente há mudança antes de atualizar
      const statusMudou = updateData.status !== jogo.status;
      const placarMudou =
        updateData.golsCasa !== undefined &&
        (updateData.golsCasa !== jogo.golsCasa ||
          updateData.golsFora !== jogo.golsFora);
      const horarioMudou = horarioAlterado;

      if (!statusMudou && !placarMudou && !horarioMudou) {
        return { atualizado: false };
      }

      await this.jogoRepo.atualizar(jogo.id, updateData);
      return {
        atualizado: true,
        novoStatus: updateData.status,
        golsCasa: updateData.golsCasa ?? null,
        golsFora: updateData.golsFora ?? null,
        horarioAlterado,
        horarioAnterior,
        horarioNovo,
      };
    }

    return { atualizado: false };
  }

  private detectarMudancaHorario(
    jogo: any,
    jogoApi: any,
    updateData: any,
  ): {
    horarioAlterado: boolean;
    horarioAnterior: string | null;
    horarioNovo: string | null;
  } {
    let horarioAlterado = false;
    let horarioAnterior: string | null = null;
    let horarioNovo: string | null = null;

    // Jogo adiado que recebeu data na API → atualizar dataHora e voltar para AGENDADO
    if (jogo.status === 'ADIADO' && jogoApi?.dataHora) {
      horarioAnterior = jogo.dataHora
        ? new Date(jogo.dataHora).toISOString()
        : null;
      updateData.dataHora = new Date(jogoApi.dataHora);
      updateData.status = 'AGENDADO';
      updateData.foiAdiado = true;
      horarioAlterado = true;
      horarioNovo = updateData.dataHora.toISOString();
    }

    // Detectar mudança de horário em jogos agendados
    if (jogoApi?.dataHora && jogo.status === 'AGENDADO' && jogo.dataHora) {
      const dataApi = new Date(jogoApi.dataHora).getTime();
      const dataBanco = new Date(jogo.dataHora).getTime();
      if (dataApi !== dataBanco) {
        horarioAnterior = new Date(jogo.dataHora).toISOString();
        updateData.dataHora = new Date(jogoApi.dataHora);
        horarioAlterado = true;
        horarioNovo = updateData.dataHora.toISOString();
      }
    }

    return { horarioAlterado, horarioAnterior, horarioNovo };
  }

  private preencherPlacarSync(
    updateData: any,
    jogoApi: any,
    jogo: any,
    status: string,
  ) {
    updateData.golsCasa = jogoApi.golsCasa ?? null;
    updateData.golsFora = jogoApi.golsFora ?? null;

    if (status !== 'FINALIZADO') return;

    // Suporte a pênaltis (jogos mata-mata da Copa do Mundo)
    if (jogoApi.penaltisCasa != null && jogoApi.penaltisFora != null) {
      updateData.temPenaltis = true;
      updateData.penaltisCasa = jogoApi.penaltisCasa;
      updateData.penaltisFora = jogoApi.penaltisFora;
    }

    updateData.vencedorId = this.determinarVencedorPorPlacar(
      updateData.golsCasa,
      updateData.golsFora,
      jogo.timeCasaId,
      jogo.timeForaId,
    );

    // Se empate no tempo normal e tem pênaltis, vencedor é por pênaltis
    if (!updateData.vencedorId && updateData.temPenaltis) {
      if (updateData.penaltisCasa > updateData.penaltisFora) {
        updateData.vencedorId = jogo.timeCasaId;
      } else if (updateData.penaltisFora > updateData.penaltisCasa) {
        updateData.vencedorId = jogo.timeForaId;
      }
      // Se penaltisCasa === penaltisFora → vencedorId permanece null (dados inconsistentes)
    }
  }

  // --- Reset de fonteResultado ---

  async resetarFonte(id: string) {
    const jogo = await this.jogoRepo.buscarPorId(id);
    if (!jogo) {
      throw new JogoNaoEncontradoError();
    }

    if (!jogo.externoId) {
      throw ErrorFactory.badRequest(
        'Jogo não possui externoId para resetar fonte',
      );
    }

    return this.jogoRepo.atualizar(id, { fonteResultado: 'API_EXTERNA' });
  }

  // --- Status híbrido ---

  definirStatusFinal(jogo: any, statusApi?: string): string {
    if (jogo.status === 'FINALIZADO') {
      return 'FINALIZADO';
    }

    if (statusApi) {
      return this.mapearStatusExterno(statusApi);
    }

    return this.calcularStatusInterno(jogo);
  }

  calcularStatusInterno(jogo: any): string {
    const agora = Date.now();
    const dataHora = new Date(jogo.dataHora).getTime();
    const duasHoras = 2 * 60 * 60 * 1000;

    if (agora < dataHora) {
      return 'AGENDADO';
    }

    if (agora <= dataHora + duasHoras) {
      return 'EM_ANDAMENTO';
    }

    return 'FINALIZADO';
  }

  mapearStatusExterno(status: string): string {
    switch (status) {
      case 'FINALIZADO':
        return 'FINALIZADO';
      case 'EM_ANDAMENTO':
        return 'EM_ANDAMENTO';
      case 'CANCELADO':
        return 'CANCELADO';
      case 'AGENDADO':
      default:
        return 'AGENDADO';
    }
  }
}
