import { Inject, Injectable, Logger } from '@nestjs/common';
import { JOGOS } from './jogos.constants';
import type { JogoRepository } from './repositories/jogo.repository.interface';
import type { FaseRepository } from './repositories/fase.repository.interface';
import { ApiFootballService } from './api-football.service';
import { ErrorFactory } from '../../common/errors/error.factory';
import { CriarJogoDto } from './dto/criar-jogo.dto';
import { AtualizarJogoDto } from './dto/atualizar-jogo.dto';
import { FinalizarJogoDto } from './dto/finalizar-jogo.dto';
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
  ApiFootballIndisponivelError,
} from '../../common/errors/domain-errors';

const TRANSICOES_VALIDAS: Record<string, string[]> = {
  AGENDADO: ['EM_ANDAMENTO', 'CANCELADO'],
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
    private readonly apiFootballService: ApiFootballService,
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

    // Task 16.4: Modo híbrido — qualquer edição manual em jogo API_FOOTBALL flip para MANUAL
    const updateData: any = { ...dto };
    if (jogo.fonteResultado === 'API_FOOTBALL') {
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

  async buscarPorFase(faseId: string) {
    return this.jogoRepo.buscarPorFase(faseId);
  }

  async buscarPorId(id: string) {
    const jogo = await this.jogoRepo.buscarPorId(id);
    if (!jogo) {
      throw new JogoNaoEncontradoError();
    }
    return jogo;
  }

  // --- Task 16.2: Importação de jogos via API-Football ---

  async importarJogos(
      leagueId: number,
      season: number,
      faseId: string,
      userId: string,
    ) {
      const fase = await this.faseRepo.buscarPorId(faseId);
      if (!fase) {
        throw new FaseNaoEncontradaError();
      }

      const fixtures = await this.apiFootballService.buscarFixtures(
        leagueId,
        season,
      );

      // Buscar todos os externoIds existentes de uma vez (evita N+1)
      const jogosExistentes = await this.jogoRepo.buscarPorFase(faseId);
      const externosExistentes = new Set(
        jogosExistentes.filter((j: any) => j.externoId).map((j: any) => j.externoId),
      );

      let importados = 0;

      for (const fixture of fixtures) {
        const externoId = String(fixture.fixture.id);
        if (externosExistentes.has(externoId)) continue;

        const statusMapeado = this.mapearStatusApiFootball(
          fixture.fixture.status.short,
        );

        const timeCasaId = String(fixture.teams.home.id);
        const timeForaId = String(fixture.teams.away.id);

        const golsCasa =
          statusMapeado === 'FINALIZADO' ? (fixture.goals.home ?? null) : null;
        const golsFora =
          statusMapeado === 'FINALIZADO' ? (fixture.goals.away ?? null) : null;

        const vencedorId =
          statusMapeado === 'FINALIZADO' && golsCasa != null && golsFora != null
            ? this.determinarVencedorPorPlacar(golsCasa, golsFora, timeCasaId, timeForaId)
            : null;

        await this.jogoRepo.criar({
          faseId,
          timeCasaId,
          timeForaId,
          dataHora: new Date(fixture.fixture.date),
          status: statusMapeado,
          golsCasa,
          golsFora,
          temProrrogacao: false,
          golsProrrogacaoCasa: null,
          golsProrrogacaoFora: null,
          temPenaltis: false,
          penaltisCasa: null,
          penaltisFora: null,
          vencedorId,
          ehJogoVolta: false,
          grupoIdaVolta: null,
          fonteResultado: 'API_FOOTBALL',
          externoId,
          criadoPor: userId,
        });

        importados++;
      }

      return { importados };
    }


  // --- Task 16.3: Sincronização de placares ---

  async sincronizarPlacares(faseId: string) {
      const fase = await this.faseRepo.buscarPorId(faseId);
      if (!fase) {
        throw new FaseNaoEncontradaError();
      }

      const jogos = await this.jogoRepo.buscarPorFase(faseId);
      const jogosComExterno = jogos.filter(
        (j: any) => j.externoId != null && j.fonteResultado === 'API_FOOTBALL',
      );

      if (jogosComExterno.length === 0) {
        return { sincronizados: 0 };
      }

      const { fixtureMap, apiDisponivel } = await this.buscarFixturesParaSync(
        jogosComExterno,
      );

      let sincronizados = 0;

      for (const jogo of jogosComExterno) {
        const atualizado = await this.processarJogoSync(
          jogo,
          fixtureMap,
          apiDisponivel,
        );
        if (atualizado) sincronizados++;
      }

      return { sincronizados };
    }

    private async buscarFixturesParaSync(jogos: any[]) {
      const externoIds = jogos.map((j: any) => Number(j.externoId));
      let fixtures: any[] = [];
      let apiDisponivel = true;

      try {
        fixtures = await this.apiFootballService.buscarFixturesPorIds(externoIds);
      } catch (error) {
        if (error instanceof ApiFootballIndisponivelError) {
          this.logger.warn(
            'API-Football indisponível durante sincronização, usando fallback interno',
          );
          apiDisponivel = false;
        } else {
          throw error;
        }
      }

      const fixtureMap = new Map<string, any>();
      for (const f of fixtures) {
        fixtureMap.set(String(f.fixture.id), f);
      }

      return { fixtureMap, apiDisponivel };
    }

    private async processarJogoSync(
      jogo: any,
      fixtureMap: Map<string, any>,
      apiDisponivel: boolean,
    ): Promise<boolean> {
      const fixture = fixtureMap.get(jogo.externoId);
      const statusApi = fixture ? fixture.fixture.status.short : undefined;

      if (!fixture) {
        this.logger.warn(
          apiDisponivel
            ? `Fixture ${jogo.externoId} não encontrado na API-Football`
            : `Usando fallback interno para jogo ${jogo.id} (externoId: ${jogo.externoId})`,
        );
      }

      const novoStatus = this.definirStatusFinal(jogo, statusApi);
      const updateData: any = { status: novoStatus };

      if (fixture && novoStatus === 'FINALIZADO') {
        this.preencherPlacarSync(updateData, fixture, jogo);
      }

      if (novoStatus !== jogo.status || fixture) {
        await this.jogoRepo.atualizar(jogo.id, updateData);
        return true;
      }

      return false;
    }

    private preencherPlacarSync(updateData: any, fixture: any, jogo: any) {
      updateData.golsCasa = fixture.goals.home ?? null;
      updateData.golsFora = fixture.goals.away ?? null;

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

  // --- Task 16.4: Reset de fonteResultado ---

  async resetarFonte(id: string) {
      const jogo = await this.jogoRepo.buscarPorId(id);
      if (!jogo) {
        throw new JogoNaoEncontradoError();
      }

      if (!jogo.externoId) {
        throw ErrorFactory.badRequest('Jogo não possui externoId para resetar fonte');
      }

      return this.jogoRepo.atualizar(id, { fonteResultado: 'API_FOOTBALL' });
    }

  // --- Task 16b.1: Status híbrido ---

  definirStatusFinal(jogo: any, statusApi?: string): string {
    if (jogo.status === 'FINALIZADO') {
      return 'FINALIZADO';
    }

    if (statusApi) {
      return this.mapearStatusApiFootball(statusApi);
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

  mapearStatusApiFootball(statusShort: string): string {
    switch (statusShort) {
      case 'NS':
        return 'AGENDADO';
      case '1H':
      case '2H':
      case 'HT':
        return 'EM_ANDAMENTO';
      case 'FT':
      case 'AET':
      case 'PEN':
        return 'FINALIZADO';
      case 'CANC':
      case 'PST':
        return 'CANCELADO';
      default:
        return 'AGENDADO';
    }
  }
}
