import type { TipoDestaque } from '../types/destaque.types';

// --- Tipos de entrada ---

export interface CriarDestaqueData {
  grupoId: string;
  usuarioId: string;
  jogoId: string;
  rodada: number | null;
  tipo: TipoDestaque;
  dados: Record<string, unknown>;
  titulo: string;
}

export interface CriarReacaoData {
  destaqueId: string;
  remetenteId: string;
}

export interface CriarVisualizacaoData {
  destaqueId: string;
  usuarioId: string;
}

// --- Tipos de saída ---

export interface Destaque {
  id: string;
  grupoId: string;
  usuarioId: string;
  jogoId: string;
  rodada: number | null;
  tipo: TipoDestaque;
  dados: Record<string, unknown>;
  titulo: string;
  contadorFs: number;
  criadoEm: Date;
}

export interface DestaqueComAutor extends Destaque {
  usuario: {
    id: string;
    nome: string;
  };
}

export interface DestaqueReacao {
  id: string;
  destaqueId: string;
  remetenteId: string;
  criadoEm: Date;
}

export interface DestaqueVisualizacao {
  id: string;
  destaqueId: string;
  usuarioId: string;
  visualizadoEm: Date;
}

// --- Interface do Repository ---

export interface DestaqueRepository {
  criar(data: CriarDestaqueData): Promise<Destaque>;

  criarVarios(data: CriarDestaqueData[]): Promise<void>;

  buscarPorId(id: string): Promise<Destaque | null>;

  /**
   * Busca destaques de um grupo por rodadas (atual + anterior).
   * Ordenação: rodada DESC, criadoEm DESC, prioridade por tipo.
   * Inclui dados do autor.
   */
  buscarPorGrupoERodadas(
    grupoId: string,
    rodadas: number[],
    limite: number,
  ): Promise<DestaqueComAutor[]>;

  /**
   * Conta destaques de um grupo por rodada (para saber se precisa complementar).
   */
  contarPorGrupoERodadas(grupoId: string, rodadas: number[]): Promise<number>;

  /**
   * Incrementa o contador de Fs de um destaque.
   * Retorna o novo valor.
   */
  incrementarContadorFs(destaqueId: string): Promise<number>;

  /**
   * Verifica se já existe uma reação do remetente para o destaque.
   */
  existeReacao(remetenteId: string, destaqueId: string): Promise<boolean>;

  /**
   * Cria uma reação (F) para um destaque.
   */
  criarReacao(data: CriarReacaoData): Promise<DestaqueReacao>;

  /**
   * Registra visualizações em batch (ignora duplicatas).
   */
  criarVisualizacoesBatch(dados: CriarVisualizacaoData[]): Promise<void>;

  /**
   * Retorna set de destaqueIds que o usuário já visualizou.
   */
  buscarVisualizacoes(
    destaqueIds: string[],
    usuarioId: string,
  ): Promise<Set<string>>;

  /**
   * Verifica se um destaque do mesmo tipo já existe (deduplicação).
   */
  existeDestaque(
    grupoId: string,
    usuarioId: string,
    jogoId: string,
    tipo: TipoDestaque,
  ): Promise<boolean>;

  /**
   * Remove destaques antigos (criadoEm < diasLimite dias atrás).
   * Cascade remove reações e visualizações via DB.
   * Retorna quantidade removida.
   */
  removerAntigos(diasLimite: number): Promise<number>;
}
