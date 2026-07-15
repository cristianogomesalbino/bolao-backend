/**
 * Tipos e interface do repositório de Jogos.
 */

import type { Time } from '../../times/repositories/time.repository.interface';
import type { Fase } from './fase.repository.interface';

// --- Tipo base (campos do model Prisma) ---

export interface Jogo {
  readonly id: string;
  readonly faseId: string;
  readonly timeCasaId: string;
  readonly timeForaId: string;
  readonly dataHora: Date | null;
  readonly rodada: number | null;
  readonly status: string;
  readonly golsCasa: number | null;
  readonly golsFora: number | null;
  readonly temProrrogacao: boolean;
  readonly golsProrrogacaoCasa: number | null;
  readonly golsProrrogacaoFora: number | null;
  readonly temPenaltis: boolean;
  readonly penaltisCasa: number | null;
  readonly penaltisFora: number | null;
  readonly vencedorId: string | null;
  readonly ehJogoVolta: boolean;
  readonly grupoIdaVolta: string | null;
  readonly fonteResultado: string;
  readonly foiAdiado: boolean;
  readonly externoId: string | null;
  readonly criadoPor: string;
  readonly dataCriacao: Date;
  readonly atualizadoEm: Date;
}

// --- Tipo com relações (include timeCasa, timeFora) ---

export interface JogoComTimes extends Jogo {
  readonly timeCasa: Time;
  readonly timeFora: Time;
}

// --- Tipo com relações completas (include timeCasa, timeFora, fase) ---

export interface JogoComRelacoes extends JogoComTimes {
  readonly fase: Fase;
}

// --- Tipo para select parcial (buscarPorExternoIds) ---

export interface JogoExternoId {
  readonly externoId: string | null;
}

// --- Tipo de criação ---

export interface CriarJogoData {
  readonly id?: string;
  readonly faseId: string;
  readonly timeCasaId: string;
  readonly timeForaId: string;
  readonly dataHora: Date | null;
  readonly rodada: number | null;
  readonly status: string;
  readonly golsCasa?: number | null;
  readonly golsFora?: number | null;
  readonly temProrrogacao?: boolean;
  readonly golsProrrogacaoCasa?: number | null;
  readonly golsProrrogacaoFora?: number | null;
  readonly temPenaltis?: boolean;
  readonly penaltisCasa?: number | null;
  readonly penaltisFora?: number | null;
  readonly vencedorId?: string | null;
  readonly ehJogoVolta?: boolean;
  readonly grupoIdaVolta?: string | null;
  readonly fonteResultado?: string;
  readonly foiAdiado?: boolean;
  readonly externoId?: string | null;
  readonly criadoPor: string;
}

// --- Tipo de atualização ---

export interface AtualizarJogoData {
  readonly status?: string;
  readonly golsCasa?: number | null;
  readonly golsFora?: number | null;
  readonly temProrrogacao?: boolean;
  readonly golsProrrogacaoCasa?: number | null;
  readonly golsProrrogacaoFora?: number | null;
  readonly temPenaltis?: boolean;
  readonly penaltisCasa?: number | null;
  readonly penaltisFora?: number | null;
  readonly vencedorId?: string | null;
  readonly dataHora?: Date | null;
  readonly foiAdiado?: boolean;
  readonly fonteResultado?: string;
  readonly externoId?: string | null;
  readonly timeCasaId?: string;
  readonly timeForaId?: string;
}

// --- Interface do repositório ---

export interface JogoRepository {
  criar(data: CriarJogoData): Promise<Jogo>;
  atualizar(id: string, data: AtualizarJogoData): Promise<Jogo>;
  buscarPorId(id: string): Promise<JogoComRelacoes | null>;
  buscarPorIds(ids: string[]): Promise<Jogo[]>;
  buscarPorExternoIds(externoIds: string[]): Promise<JogoExternoId[]>;
  buscarPorFase(faseId: string, rodada?: number): Promise<JogoComTimes[]>;
  buscarPorFaseAteRodada(
    faseId: string,
    ateRodada: number,
  ): Promise<JogoComTimes[]>;
  buscarPorFaseEStatus(faseId: string, status: string): Promise<JogoComTimes[]>;
  buscarPorExternoId(externoId: string): Promise<Jogo | null>;
  buscarPorGrupoIdaVolta(grupoIdaVolta: string): Promise<Jogo[]>;
  buscarProximoJogoPorTemporada(
    temporadaId: string,
  ): Promise<JogoComRelacoes | null>;
  buscarProximosJogosPorTemporada(
    temporadaId: string,
  ): Promise<JogoComRelacoes[]>;
  contarAdiadosPorTemporada(temporadaId: string): Promise<number>;
  buscarTodosPorTemporada(temporadaId: string): Promise<JogoComRelacoes[]>;
  buscarRodadaAtual(faseId: string): Promise<number | null>;
  buscarPendentesSync(
    faseIds: string[],
    limiteRodada: number,
  ): Promise<JogoComTimes[]>;
  buscarJogosComTimePlaceholder(
    temporadaId: string,
    placeholderTimeId: string,
  ): Promise<JogoComRelacoes[]>;
  buscarAgendadosEntre(inicio: Date, fim: Date): Promise<JogoComRelacoes[]>;
}
