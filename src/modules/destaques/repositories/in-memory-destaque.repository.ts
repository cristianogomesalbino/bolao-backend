import type {
  DestaqueRepository,
  CriarDestaqueData,
  CriarReacaoData,
  CriarVisualizacaoData,
  Destaque,
  DestaqueComAutor,
  DestaqueReacao,
} from './destaque.repository.interface';
import type { TipoDestaque } from '../types/destaque.types';
import { DESTAQUES } from '../destaques.constants';
import { randomUUID } from 'node:crypto';

export class InMemoryDestaqueRepository implements DestaqueRepository {
  readonly destaques: Destaque[] = [];
  readonly reacoes: DestaqueReacao[] = [];
  readonly visualizacoes: Array<{
    id: string;
    destaqueId: string;
    usuarioId: string;
    visualizadoEm: Date;
  }> = [];

  private readonly usuarios = new Map<string, { id: string; nome: string }>();

  setUsuario(id: string, nome: string): void {
    this.usuarios.set(id, { id, nome });
  }

  criar(data: CriarDestaqueData): Promise<Destaque> {
    const destaque: Destaque = {
      id: randomUUID(),
      ...data,
      contadorFs: 0,
      criadoEm: new Date(),
    };
    this.destaques.push(destaque);
    return Promise.resolve(destaque);
  }

  async criarVarios(data: CriarDestaqueData[]): Promise<void> {
    for (const item of data) {
      const chave = `${item.grupoId}:${item.usuarioId}:${item.jogoId}:${item.tipo}`;
      const duplicado = this.destaques.some(
        (s) => `${s.grupoId}:${s.usuarioId}:${s.jogoId}:${s.tipo}` === chave,
      );
      if (!duplicado) await this.criar(item);
    }
  }

  buscarPorId(id: string): Promise<Destaque | null> {
    return Promise.resolve(this.destaques.find((s) => s.id === id) ?? null);
  }

  buscarPorGrupoERodadas(
    grupoId: string,
    rodadas: number[],
    limite: number,
  ): Promise<DestaqueComAutor[]> {
    const prioridades = DESTAQUES.PRIORIDADE_POR_TIPO;

    const resultado = this.destaques
      .filter(
        (s) =>
          s.grupoId === grupoId &&
          s.rodada !== null &&
          s.tipo !== 'SEQUENCIA_MOSCA' &&
          rodadas.includes(s.rodada),
      )
      .sort((a, b) => {
        const rodadaDiff = (b.rodada ?? 0) - (a.rodada ?? 0);
        if (rodadaDiff !== 0) return rodadaDiff;

        const dateDiff = b.criadoEm.getTime() - a.criadoEm.getTime();
        if (dateDiff !== 0) return dateDiff;

        const prioA = prioridades[a.tipo] ?? 99;
        const prioB = prioridades[b.tipo] ?? 99;
        return prioA - prioB;
      })
      .slice(0, limite)
      .map((s) => ({
        ...s,
        usuario: this.usuarios.get(s.usuarioId) ?? {
          id: s.usuarioId,
          nome: 'Desconhecido',
        },
      }));

    return Promise.resolve(resultado);
  }

  contarPorGrupoERodadas(grupoId: string, rodadas: number[]): Promise<number> {
    const count = this.destaques.filter(
      (s) =>
        s.grupoId === grupoId &&
        s.rodada !== null &&
        rodadas.includes(s.rodada),
    ).length;
    return Promise.resolve(count);
  }

  listarRodadasPorGrupo(grupoId: string): Promise<number[]> {
    const rodadas = new Set(
      this.destaques
        .filter((s) => s.grupoId === grupoId && s.rodada != null)
        .map((s) => s.rodada as number),
    );
    return Promise.resolve(Array.from(rodadas).sort((a, b) => b - a));
  }

  incrementarContadorFs(destaqueId: string): Promise<number> {
    const destaque = this.destaques.find((s) => s.id === destaqueId);
    if (destaque) destaque.contadorFs += 1;
    return Promise.resolve(destaque?.contadorFs ?? 0);
  }

  existeReacao(remetenteId: string, destaqueId: string): Promise<boolean> {
    return Promise.resolve(
      this.reacoes.some(
        (r) => r.remetenteId === remetenteId && r.destaqueId === destaqueId,
      ),
    );
  }

  buscarReacoesDoUsuario(
    remetenteId: string,
    destaqueIds: string[],
  ): Promise<Set<string>> {
    if (destaqueIds.length === 0) return Promise.resolve(new Set());
    return Promise.resolve(
      new Set(
        this.reacoes
          .filter(
            (r) =>
              r.remetenteId === remetenteId &&
              destaqueIds.includes(r.destaqueId),
          )
          .map((r) => r.destaqueId),
      ),
    );
  }

  criarReacao(data: CriarReacaoData): Promise<DestaqueReacao> {
    const reacao: DestaqueReacao = {
      id: randomUUID(),
      ...data,
      criadoEm: new Date(),
    };
    this.reacoes.push(reacao);
    return Promise.resolve(reacao);
  }

  criarVisualizacoesBatch(dados: CriarVisualizacaoData[]): Promise<void> {
    for (const item of dados) {
      const existe = this.visualizacoes.some(
        (v) =>
          v.destaqueId === item.destaqueId && v.usuarioId === item.usuarioId,
      );
      if (existe) continue;
      this.visualizacoes.push({
        id: randomUUID(),
        ...item,
        visualizadoEm: new Date(),
      });
    }
    return Promise.resolve();
  }

  filtrarIdsDoGrupo(grupoId: string, destaqueIds: string[]): Promise<string[]> {
    return Promise.resolve(
      this.destaques
        .filter((s) => s.grupoId === grupoId && destaqueIds.includes(s.id))
        .map((s) => s.id),
    );
  }

  buscarVisualizacoes(
    destaqueIds: string[],
    usuarioId: string,
  ): Promise<Set<string>> {
    return Promise.resolve(
      new Set(
        this.visualizacoes
          .filter(
            (v) =>
              destaqueIds.includes(v.destaqueId) && v.usuarioId === usuarioId,
          )
          .map((v) => v.destaqueId),
      ),
    );
  }

  existeDestaque(
    grupoId: string,
    usuarioId: string,
    jogoId: string,
    tipo: TipoDestaque,
  ): Promise<boolean> {
    return Promise.resolve(
      this.destaques.some(
        (s) =>
          s.grupoId === grupoId &&
          s.usuarioId === usuarioId &&
          s.jogoId === jogoId &&
          s.tipo === tipo,
      ),
    );
  }

  buscarUnicosNaMoscaDaRodada(
    grupoId: string,
    usuarioId: string,
    jogoIds: string[],
  ): Promise<Set<string>> {
    return Promise.resolve(
      new Set(
        this.destaques
          .filter(
            (s) =>
              s.grupoId === grupoId &&
              s.usuarioId === usuarioId &&
              s.tipo === 'UNICO_NA_MOSCA' &&
              jogoIds.includes(s.jogoId),
          )
          .map((s) => s.jogoId),
      ),
    );
  }

  existeDestaqueNaRodada(
    grupoId: string,
    usuarioId: string,
    rodada: number,
    tipo: TipoDestaque,
  ): Promise<boolean> {
    return Promise.resolve(
      this.destaques.some(
        (s) =>
          s.grupoId === grupoId &&
          s.usuarioId === usuarioId &&
          s.rodada === rodada &&
          s.tipo === tipo,
      ),
    );
  }

  buscarNaRodada(
    grupoId: string,
    usuarioId: string,
    rodada: number,
    tipo: TipoDestaque,
  ): Promise<Destaque | null> {
    return Promise.resolve(
      this.destaques.find(
        (s) =>
          s.grupoId === grupoId &&
          s.usuarioId === usuarioId &&
          s.rodada === rodada &&
          s.tipo === tipo,
      ) ?? null,
    );
  }

  atualizar(
    id: string,
    data: { dados: object; titulo: string },
  ): Promise<void> {
    const destaque = this.destaques.find((s) => s.id === id);
    if (destaque) {
      destaque.dados = data.dados as Record<string, unknown>;
      destaque.titulo = data.titulo;
    }
    return Promise.resolve();
  }

  removerPorTiposNaRodada(
    grupoId: string,
    usuarioId: string,
    rodada: number,
    tipos: TipoDestaque[],
    excetoId?: string,
  ): Promise<void> {
    this.purgeIds(
      this.destaques
        .filter(
          (s) =>
            s.grupoId === grupoId &&
            s.usuarioId === usuarioId &&
            s.rodada === rodada &&
            tipos.includes(s.tipo) &&
            s.id !== excetoId,
        )
        .map((s) => s.id),
    );
    return Promise.resolve();
  }

  removerAntigos(diasLimite: number): Promise<number> {
    const limite = new Date();
    limite.setDate(limite.getDate() - diasLimite);
    const antes = this.destaques.length;
    this.purgeIds(
      this.destaques.filter((s) => s.criadoEm < limite).map((s) => s.id),
    );
    return Promise.resolve(antes - this.destaques.length);
  }

  private purgeIds(idsLista: string[]): void {
    const ids = new Set(idsLista);
    this.recortar(this.destaques, (s) => !ids.has(s.id));
    this.recortar(this.reacoes, (r) => !ids.has(r.destaqueId));
    this.recortar(this.visualizacoes, (v) => !ids.has(v.destaqueId));
  }

  private recortar<T>(lista: T[], fica: (item: T) => boolean): void {
    const restantes = lista.filter(fica);
    lista.splice(0, lista.length, ...restantes);
  }
}
