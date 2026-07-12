import type { CategoriaRecorde } from '../types/story.types';

// --- Tipos de saída ---

export interface RecordeSequencia {
  id: string;
  grupoId: string;
  temporadaId: string;
  categoria: CategoriaRecorde;
  valor: number;
  criadoEm: Date;
  atualizadoEm: Date;
  detentores: RecordeDetentor[];
}

export interface RecordeDetentor {
  id: string;
  recordeId: string;
  usuarioId: string;
  atingidoEm: Date;
}

// --- Interface do Repository ---

export interface RecordeRepository {
  /**
   * Busca o recorde de sequência para um grupo/temporada/categoria.
   * Retorna null se não existir.
   */
  buscarRecorde(
    grupoId: string,
    temporadaId: string,
    categoria: CategoriaRecorde,
  ): Promise<RecordeSequencia | null>;

  /**
   * Cria um novo recorde com valor e primeiro detentor.
   */
  criar(
    grupoId: string,
    temporadaId: string,
    categoria: CategoriaRecorde,
    valor: number,
    usuarioId: string,
  ): Promise<RecordeSequencia>;

  /**
   * Atualiza o valor do recorde (quando superado).
   */
  atualizarValor(recordeId: string, novoValor: number): Promise<void>;

  /**
   * Adiciona um detentor ao recorde (empate ou novo).
   */
  adicionarDetentor(recordeId: string, usuarioId: string): Promise<void>;

  /**
   * Remove todos os detentores de um recorde (antes de adicionar novo).
   */
  limparDetentores(recordeId: string): Promise<void>;
}
