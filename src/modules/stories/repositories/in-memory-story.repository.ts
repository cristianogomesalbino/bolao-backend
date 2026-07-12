import type {
  StoryRepository,
  CriarStoryData,
  CriarReacaoData,
  CriarVisualizacaoData,
  Story,
  StoryComAutor,
  StoryReacao,
} from './story.repository.interface';
import type { TipoStory } from '../types/story.types';
import { STORIES } from '../stories.constants';
import { randomUUID } from 'node:crypto';

export class InMemoryStoryRepository implements StoryRepository {
  readonly stories: Story[] = [];
  readonly reacoes: StoryReacao[] = [];
  readonly visualizacoes: Array<{
    id: string;
    storyId: string;
    usuarioId: string;
    visualizadoEm: Date;
  }> = [];

  private readonly usuarios = new Map<string, { id: string; nome: string }>();

  setUsuario(id: string, nome: string): void {
    this.usuarios.set(id, { id, nome });
  }

  criar(data: CriarStoryData): Promise<Story> {
    const story: Story = {
      id: randomUUID(),
      ...data,
      contadorFs: 0,
      criadoEm: new Date(),
    };
    this.stories.push(story);
    return Promise.resolve(story);
  }

  async criarVarios(data: CriarStoryData[]): Promise<void> {
    for (const item of data) {
      await this.criar(item);
    }
  }

  buscarPorId(id: string): Promise<Story | null> {
    return Promise.resolve(this.stories.find((s) => s.id === id) ?? null);
  }

  buscarPorGrupoERodadas(
    grupoId: string,
    rodadas: number[],
    limite: number,
  ): Promise<StoryComAutor[]> {
    const prioridades = STORIES.PRIORIDADE_POR_TIPO;

    const resultado = this.stories
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
    const count = this.stories.filter(
      (s) =>
        s.grupoId === grupoId &&
        s.rodada !== null &&
        rodadas.includes(s.rodada),
    ).length;
    return Promise.resolve(count);
  }

  incrementarContadorFs(storyId: string): Promise<number> {
    const story = this.stories.find((s) => s.id === storyId);
    if (!story) return Promise.resolve(0);
    story.contadorFs += 1;
    return Promise.resolve(story.contadorFs);
  }

  existeReacao(remetenteId: string, storyId: string): Promise<boolean> {
    const existe = this.reacoes.some(
      (r) => r.remetenteId === remetenteId && r.storyId === storyId,
    );
    return Promise.resolve(existe);
  }

  criarReacao(data: CriarReacaoData): Promise<StoryReacao> {
    const reacao: StoryReacao = {
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
        (v) => v.storyId === item.storyId && v.usuarioId === item.usuarioId,
      );
      if (!jaExiste) {
        this.visualizacoes.push({
          id: randomUUID(),
          ...item,
          visualizadoEm: new Date(),
        });
      }
    }
    return Promise.resolve();
  }

  buscarVisualizacoes(
    storyIds: string[],
    usuarioId: string,
  ): Promise<Set<string>> {
    const visualizados = this.visualizacoes
      .filter((v) => storyIds.includes(v.storyId) && v.usuarioId === usuarioId)
      .map((v) => v.storyId);
    return Promise.resolve(new Set(visualizados));
  }

  existeStory(
    grupoId: string,
    usuarioId: string,
    jogoId: string,
    tipo: TipoStory,
  ): Promise<boolean> {
    const existe = this.stories.some(
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

    const antes = this.stories.length;
    const idsParaRemover = new Set(
      this.stories.filter((s) => s.criadoEm < limite).map((s) => s.id),
    );

    for (let i = this.stories.length - 1; i >= 0; i--) {
      if (idsParaRemover.has(this.stories[i].id)) {
        this.stories.splice(i, 1);
      }
    }

    // Cascade: remove reações e visualizações
    for (let i = this.reacoes.length - 1; i >= 0; i--) {
      if (idsParaRemover.has(this.reacoes[i].storyId)) {
        this.reacoes.splice(i, 1);
      }
    }
    for (let i = this.visualizacoes.length - 1; i >= 0; i--) {
      if (idsParaRemover.has(this.visualizacoes[i].storyId)) {
        this.visualizacoes.splice(i, 1);
      }
    }

    return Promise.resolve(antes - this.stories.length);
  }
}
