import { Inject, Injectable, Logger } from '@nestjs/common';
import { JOGOS } from '../jogos.constants';
import { TIMES } from '../../times/time.constants';
import type { JogoRepository } from '../repositories/jogo.repository.interface';
import type { FaseRepository } from '../repositories/fase.repository.interface';
import type { TimeRepository } from '../../times/repositories/time.repository.interface';
import { FutebolApiService } from './futebol-api.service';
import { ErrorFactory } from '../../../common/errors/error.factory';
import { CriarJogoDto } from '../dto/criar-jogo.dto';
import { AtualizarJogoDto } from '../dto/atualizar-jogo.dto';
import { FinalizarJogoDto } from '../dto/finalizar-jogo.dto';
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
      dto.golsCasa, dto.golsFora, jogo.timeCasaId, jogo.timeForaId,
    );

    return this.jogoRepo.atualizar(jogo.id, this.buildUpdateFinalizado(dto, vencedorId));
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
    return this.jogoRepo.atualizar(jogo.id, this.buildUpdateFinalizado(dto, null));
  }

  private async finalizarJogoVolta(jogo: any, dto: FinalizarJogoDto) {
    const jogosDoGrupo = await this.jogoRepo.buscarPorGrupoIdaVolta(
      jogo.grupoIdaVolta,
    );
    const jogoIda = jogosDoGrupo.find((j: any) => !j.ehJogoVolta);

    if (!jogoIda || jogoIda.status !== 'FINALIZADO') {
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

    return this.jogoRepo.atualizar(jogo.id, {
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
    });
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

    if (!jogo.temProrrogacao || jogo.golsProrrogacaoCasa == null || jogo.golsProrrogacaoFora == null) {
      return null;
    }

    if (jogo.golsProrrogacaoCasa > jogo.golsProrrogacaoFora) return jogo.timeCasaId;
    if (jogo.golsProrrogacaoFora > jogo.golsProrrogacaoCasa) return jogo.timeForaId;

    if (!jogo.temPenaltis || jogo.penaltisCasa == null || jogo.penaltisFora == null) {
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

  async buscarPorFaseComDetalhes(faseId: string, rodada?: number, status?: string) {
    const fase = await this.faseRepo.buscarPorId(faseId);
    if (!fase) {
      throw new FaseNaoEncontradaError();
    }

    if (status) {
      const jogos = await this.jogoRepo.buscarPorFaseEStatus(faseId, status);
      return { fase, jogos, rodadaAtual: null };
    }

    const rodadaFiltro = rodada ?? await this.obterRodadaAtual(faseId);
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

  async importarJogos(
    season: number,
    rodada: number,
    faseId: string,
    userId: string,
  ) {
    const fase = await this.faseRepo.buscarPorId(faseId);
    if (!fase) {
      throw new FaseNaoEncontradaError();
    }

    const jogosApi = await this.futebolApiService.buscarJogosPorRodada(
      season,
      rodada,
    );

    // Normalizar todos os jogos e resolver times em batch (evita N+1)
    const normalizados = jogosApi.map((j: any) => this.futebolApiService.normalizarJogo(j));

    // Verificar externoIds existentes globalmente (constraint unique é global, não por fase)
    const externoIds = normalizados.map((n: any) => n.externoId);
    const jogosExistentesGlobal = await this.buscarExternoIdsExistentes(externoIds);
    const externosExistentes = new Set(jogosExistentesGlobal);

    const timesCache = await this.carregarCacheTimes(normalizados);

    let importados = 0;
    let ignorados = 0;

    for (const normalizado of normalizados) {
      if (externosExistentes.has(normalizado.externoId)) {
        ignorados++;
        continue;
      }

      const timeCasa = await this.resolverOuCriarTime(normalizado.timeCasa, timesCache);
      const timeFora = await this.resolverOuCriarTime(normalizado.timeFora, timesCache);

      const vencedorId =
        normalizado.status === 'FINALIZADO' && normalizado.golsCasa != null && normalizado.golsFora != null
          ? this.determinarVencedorPorPlacar(normalizado.golsCasa, normalizado.golsFora, timeCasa.id, timeFora.id)
          : null;

      const dataHora = normalizado.dataHora ? new Date(normalizado.dataHora) : null;
      const dataValida = dataHora && dataHora.getFullYear() >= 2020;

      await this.jogoRepo.criar({
        faseId,
        rodada,
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
        temPenaltis: false,
        penaltisCasa: null,
        penaltisFora: null,
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

  private async buscarExternoIdsExistentes(externoIds: string[]): Promise<string[]> {
    if (externoIds.length === 0) return [];
    const jogos = await this.jogoRepo.buscarPorExternoIds(externoIds);
    return jogos.map((j: any) => j.externoId);
  }

  private async carregarCacheTimes(normalizados: any[]): Promise<Map<string, any>> {
    const externoIds = new Set<string>();
    for (const n of normalizados) {
      if (n.timeCasa?.externoId) externoIds.add(n.timeCasa.externoId);
      if (n.timeFora?.externoId) externoIds.add(n.timeFora.externoId);
    }

    const timesExistentes = await this.timeRepo.buscarPorExternoIds([...externoIds]);
    const cache = new Map<string, any>();
    for (const time of timesExistentes) {
      cache.set(time.externoId, time);
    }
    return cache;
  }

  private async resolverOuCriarTime(
    timeData: { externoId: string; nome: string; sigla: string; escudo: string },
    cache: Map<string, any>,
  ): Promise<any> {
    const cached = cache.get(timeData.externoId);
    if (cached && cached.escudo) return cached;

    if (cached && !cached.escudo && timeData.escudo) {
      const atualizado = await this.timeRepo.atualizar(cached.id, { escudo: timeData.escudo });
      cache.set(timeData.externoId, atualizado);
      return atualizado;
    }

    if (cached) return cached;

    const existente = await this.timeRepo.buscarPorExternoId(timeData.externoId);
    if (existente && !existente.escudo && timeData.escudo) {
      const atualizado = await this.timeRepo.atualizar(existente.id, { escudo: timeData.escudo });
      cache.set(timeData.externoId, atualizado);
      return atualizado;
    }

    if (existente) {
      cache.set(timeData.externoId, existente);
      return existente;
    }

    const novo = await this.timeRepo.criar(timeData);
    cache.set(timeData.externoId, novo);
    return novo;
  }

  // --- Sincronização de placares ---

  async sincronizarPlacares(faseId: string) {
    const fase = await this.faseRepo.buscarPorId(faseId);
    if (!fase) {
      throw new FaseNaoEncontradaError();
    }

    const jogos = await this.jogoRepo.buscarPorFase(faseId);
    const jogosComExterno = jogos.filter(
      (j: any) => j.externoId != null && j.fonteResultado === 'API_EXTERNA' && j.status !== 'FINALIZADO' && j.status !== 'CANCELADO',
    );

    if (jogosComExterno.length === 0) {
      return { sincronizados: 0 };
    }

    const { jogoApiMap, apiDisponivel } = await this.buscarJogosParaSync(
      jogosComExterno,
    );

    let sincronizados = 0;

    for (const jogo of jogosComExterno) {
      const atualizado = await this.processarJogoSync(
        jogo,
        jogoApiMap,
        apiDisponivel,
      );
      if (atualizado) sincronizados++;
    }

    return { sincronizados };
  }

  private async buscarJogosParaSync(jogos: any[]) {
    const externoIds = jogos.map((j: any) => Number(j.externoId));
    let jogosApi: any[] = [];
    let apiDisponivel = true;

    try {
      jogosApi = await this.futebolApiService.buscarJogosPorIds(externoIds);
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
  ): Promise<boolean> {
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

    // Jogo adiado que recebeu data na API → atualizar dataHora e voltar para AGENDADO
    if (jogo.status === 'ADIADO' && jogoApi?.dataHora) {
      updateData.dataHora = new Date(jogoApi.dataHora);
      updateData.status = 'AGENDADO';
      updateData.foiAdiado = true;
    }

    if (jogoApi && novoStatus === 'FINALIZADO') {
      this.preencherPlacarSync(updateData, jogoApi, jogo);
    }

    if (novoStatus !== jogo.status || jogoApi) {
      await this.jogoRepo.atualizar(jogo.id, updateData);
      return true;
    }

    return false;
  }

  private preencherPlacarSync(updateData: any, jogoApi: any, jogo: any) {
    updateData.golsCasa = jogoApi.golsCasa ?? null;
    updateData.golsFora = jogoApi.golsFora ?? null;

    let vencedorId: string | null = null;
    if (updateData.golsCasa != null && updateData.golsFora != null) {
      if (updateData.golsCasa > updateData.golsFora) {
        vencedorId = jogo.timeCasaId;
      } else if (updateData.golsFora > updateData.golsCasa) {
        vencedorId = jogo.timeForaId;
      }
    }
    updateData.vencedorId = vencedorId;
  }

  // --- Reset de fonteResultado ---

  async resetarFonte(id: string) {
    const jogo = await this.jogoRepo.buscarPorId(id);
    if (!jogo) {
      throw new JogoNaoEncontradoError();
    }

    if (!jogo.externoId) {
      throw ErrorFactory.badRequest('Jogo não possui externoId para resetar fonte');
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
