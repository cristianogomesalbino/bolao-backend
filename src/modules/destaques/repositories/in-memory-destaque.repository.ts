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
      await this.criar(item);
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

  incrementarContadorFs(destaqueId: string): Promise<number> {
    const destaque = this.destaques.find((s) => s.id === destaqueId);
    if (!destaque) return Promise.resolve(0);
    destaque.contadorFs += 1;
    return Promise.resolve(destaque.contadorFs);
  }

  existeReacao(remetenteId: string, destaqueId: string): Promise<boolean> {
    const existe = this.reacoes.some(
      (r) => r.remetenteId === remetenteId && r.destaqueId === destaqueId,
    );
    return Promise.resolve(existe);
  }

  buscarReacoesDoUsuario(
    remetenteId: string,
    destaqueIds: string[],
  ): Promise<Set<string>> {
    if (destaqueIds.length === 0) return Promise.resolve(new Set());
    const reagidos = this.reacoes
      .filter(
        (r) =>
          r.remetenteId === remetenteId && destaqueIds.includes(r.destaqueId),
      )
      .map((r) => r.destaqueId);
    return Promise.resolve(new Set(reagidos));
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
      const jaExiste = this.visualizacoes.some(
        (v) =>
          v.destaqueId === item.destaqueId && v.usuarioId === item.usuarioId,
      );
      if (!jaExiste) {
        this.visualizacoes.push({
          id: randomUUID(),
          destaqueId: item.destaqueId,
          usuarioId: item.usuarioId,
          visualizadoEm: new Date(),
        });
      }
    }
    return Promise.resolve();
  }

  buscarVisualizacoes(
    destaqueIds: string[],
    usuarioId: string,
  ): Promise<Set<string>> {
    const visualizados = this.visualizacoes
      .filter(
        (v) => destaqueIds.includes(v.destaqueId) && v.usuarioId === usuarioId,
      )
      .map((v) => v.destaqueId);
    return Promise.resolve(new Set(visualizados));
  }

  existeDestaque(
    grupoId: string,
    usuarioId: string,
    jogoId: string,
    tipo: TipoDestaque,
  ): Promise<boolean> {
    const existe = this.destaques.some(
      (s) =>
        s.grupoId === grupoId &&
        s.usuarioId === usuarioId &&
        s.jogoId === jogoId &&
        s.tipo === tipo,
    );
    return Promise.resolve(existe);
  }

  removerAntigos(diasLimite: number): Promise<number> {
    const limite = new Date();
    limite.setDate(limite.getDate() - diasLimite);

    const antes = this.destaques.length;
    const idsParaRemover = new Set(
      this.destaques.filter((s) => s.criadoEm < limite).map((s) => s.id),
    );

    for (let i = this.destaques.length - 1; i >= 0; i--) {
      if (idsParaRemover.has(this.destaques[i].id)) {
        this.destaques.splice(i, 1);
      }
    }

    // Cascade: remove reações e visualizações
    for (let i = this.reacoes.length - 1; i >= 0; i--) {
      if (idsParaRemover.has(this.reacoes[i].destaqueId)) {
        this.reacoes.splice(i, 1);
      }
    }
    for (let i = this.visualizacoes.length - 1; i >= 0; i--) {
      if (idsParaRemover.has(this.visualizacoes[i].destaqueId)) {
        this.visualizacoes.splice(i, 1);
      }
    }

    return Promise.resolve(antes - this.destaques.length);
  }
}
