import type {
  InscricaoPushRepository,
  CriarInscricaoData,
  AtualizarInscricaoData,
  InscricaoPush,
} from './inscricao-push.repository.interface';

export class InMemoryInscricaoPushRepository
  implements InscricaoPushRepository
{
  items: InscricaoPush[] = [];

  async criar(data: CriarInscricaoData): Promise<InscricaoPush> {
    const inscricao: InscricaoPush = {
      id: crypto.randomUUID(),
      usuarioId: data.usuarioId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      dataCriacao: new Date(),
      atualizadoEm: new Date(),
    };
    this.items.push(inscricao);
    return inscricao;
  }

  async atualizar(
    usuarioId: string,
    endpoint: string,
    data: AtualizarInscricaoData,
  ): Promise<InscricaoPush> {
    const inscricao = this.items.find(
      (i) => i.usuarioId === usuarioId && i.endpoint === endpoint,
    );
    if (!inscricao) throw new Error('Inscrição não encontrada');
    inscricao.p256dh = data.p256dh;
    inscricao.auth = data.auth;
    inscricao.atualizadoEm = new Date();
    return inscricao;
  }

  async remover(usuarioId: string, endpoint: string): Promise<void> {
    this.items = this.items.filter(
      (i) => !(i.usuarioId === usuarioId && i.endpoint === endpoint),
    );
  }

  async removerPorId(id: string): Promise<void> {
    this.items = this.items.filter((i) => i.id !== id);
  }

  async buscarPorUsuario(usuarioId: string): Promise<InscricaoPush[]> {
    return this.items.filter((i) => i.usuarioId === usuarioId);
  }

  async buscarPorEndpoint(
    usuarioId: string,
    endpoint: string,
  ): Promise<InscricaoPush | null> {
    return (
      this.items.find(
        (i) => i.usuarioId === usuarioId && i.endpoint === endpoint,
      ) ?? null
    );
  }

  async contarPorUsuario(usuarioId: string): Promise<number> {
    return this.items.filter((i) => i.usuarioId === usuarioId).length;
  }
}
