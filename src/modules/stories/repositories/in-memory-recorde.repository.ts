import type {
  RecordeRepository,
  RecordeSequencia,
  RecordeDetentor,
} from './recorde.repository.interface';
import type { CategoriaRecorde } from '../types/story.types';
import { randomUUID } from 'node:crypto';

export class InMemoryRecordeRepository implements RecordeRepository {
  readonly recordes: RecordeSequencia[] = [];

  buscarRecorde(
    grupoId: string,
    temporadaId: string,
    categoria: CategoriaRecorde,
  ): Promise<RecordeSequencia | null> {
    const resultado =
      this.recordes.find(
        (r) =>
          r.grupoId === grupoId &&
          r.temporadaId === temporadaId &&
          r.categoria === categoria,
      ) ?? null;
    return Promise.resolve(resultado);
  }

  criar(
    grupoId: string,
    temporadaId: string,
    categoria: CategoriaRecorde,
    valor: number,
    usuarioId: string,
  ): Promise<RecordeSequencia> {
    const detentor: RecordeDetentor = {
      id: randomUUID(),
      recordeId: '',
      usuarioId,
      atingidoEm: new Date(),
    };

    const recorde: RecordeSequencia = {
      id: randomUUID(),
      grupoId,
      temporadaId,
      categoria,
      valor,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
      detentores: [detentor],
    };

    detentor.recordeId = recorde.id;
    this.recordes.push(recorde);
    return Promise.resolve(recorde);
  }

  atualizarValor(recordeId: string, novoValor: number): Promise<void> {
    const recorde = this.recordes.find((r) => r.id === recordeId);
    if (recorde) {
      recorde.valor = novoValor;
      recorde.atualizadoEm = new Date();
    }
    return Promise.resolve();
  }

  adicionarDetentor(recordeId: string, usuarioId: string): Promise<void> {
    const recorde = this.recordes.find((r) => r.id === recordeId);
    if (!recorde) return Promise.resolve();

    const jaExiste = recorde.detentores.some((d) => d.usuarioId === usuarioId);
    if (jaExiste) return Promise.resolve();

    recorde.detentores.push({
      id: randomUUID(),
      recordeId,
      usuarioId,
      atingidoEm: new Date(),
    });
    return Promise.resolve();
  }

  limparDetentores(recordeId: string): Promise<void> {
    const recorde = this.recordes.find((r) => r.id === recordeId);
    if (recorde) {
      recorde.detentores = [];
    }
    return Promise.resolve();
  }
}
