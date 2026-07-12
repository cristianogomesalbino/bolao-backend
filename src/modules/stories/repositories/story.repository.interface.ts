import type { TipoStory } from '../types/story.types';

// --- Tipos de entrada ---

export interface CriarStoryData {
  grupoId: string;
  usuarioId: string;
  jogoId: string;
  rodada: number | null;
  tipo: TipoStory;
  dados: Record<string, unknown>;
  titulo: string;
}

export interface CriarReacaoData {
  storyId: string;
  remetenteId: string;
}

export interface CriarVisualizacaoData {
  storyId: string;
  usuarioId: string;
}

// --- Tipos de saída ---

export interface Story {
  id: string;
  grupoId: string;
  usuarioId: string;
  jogoId: string;
  rodada: number | null;
  tipo: TipoStory;
  dados: Record<string, unknown>;
  titulo: string;
  contadorFs: number;
  criadoEm: Date;
}

export interface StoryComAutor extends Story {
  usuario: {
    id: string;
    nome: string;
  };
}

export interface StoryReacao {
  id: string;
  storyId: string;
  remetenteId: string;
  criadoEm: Date;
}

export interface StoryVisualizacao {
  id: string;
  storyId: string;
  usuarioId: string;
  visualizadoEm: Date;
}

// --- Interface do Repository ---

export interface StoryRepository {
  criar(data: CriarStoryData): Promise<Story>;

  criarVarios(data: CriarStoryData[]): Promise<void>;

  buscarPorId(id: string): Promise<Story | null>;

  /**
   * Busca stories de um grupo por rodadas (atual + anterior).
   * Ordenação: rodada DESC, criadoEm DESC, prioridade por tipo.
   * Inclui dados do autor.
   */
  buscarPorGrupoERodadas(
    grupoId: string,
    rodadas: number[],
    limite: number,
  ): Promise<StoryComAutor[]>;

  /**
   * Conta stories de um grupo por rodada (para saber se precisa complementar).
   */
  contarPorGrupoERodadas(grupoId: string, rodadas: number[]): Promise<number>;

  /**
   * Incrementa o contador de Fs de um story.
   * Retorna o novo valor.
   */
  incrementarContadorFs(storyId: string): Promise<number>;

  /**
   * Verifica se já existe uma reação do remetente para o story.
   */
  existeReacao(remetenteId: string, storyId: string): Promise<boolean>;

  /**
   * Cria uma reação (F) para um story.
   */
  criarReacao(data: CriarReacaoData): Promise<StoryReacao>;

  /**
   * Registra visualizações em batch (ignora duplicatas).
   */
  criarVisualizacoesBatch(dados: CriarVisualizacaoData[]): Promise<void>;

  /**
   * Retorna set de storyIds que o usuário já visualizou.
   */
  buscarVisualizacoes(
    storyIds: string[],
    usuarioId: string,
  ): Promise<Set<string>>;

  /**
   * Verifica se um story do mesmo tipo já existe (deduplicação).
   */
  existeStory(
    grupoId: string,
    usuarioId: string,
    jogoId: string,
    tipo: TipoStory,
  ): Promise<boolean>;

  /**
   * Remove stories antigos (criadoEm < diasLimite dias atrás).
   * Cascade remove reações e visualizações via DB.
   * Retorna quantidade removida.
   */
  removerAntigos(diasLimite: number): Promise<number>;
}
