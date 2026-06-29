export interface CriarInscricaoData {
  usuarioId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface AtualizarInscricaoData {
  p256dh: string;
  auth: string;
}

export interface InscricaoPush {
  id: string;
  usuarioId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  dataCriacao: Date;
  atualizadoEm: Date;
}

export interface InscricaoPushRepository {
  criar(data: CriarInscricaoData): Promise<InscricaoPush>;
  atualizar(
    usuarioId: string,
    endpoint: string,
    data: AtualizarInscricaoData,
  ): Promise<InscricaoPush>;
  remover(usuarioId: string, endpoint: string): Promise<void>;
  removerPorId(id: string): Promise<void>;
  buscarPorUsuario(usuarioId: string): Promise<InscricaoPush[]>;
  buscarPorEndpoint(
    usuarioId: string,
    endpoint: string,
  ): Promise<InscricaoPush | null>;
  contarPorUsuario(usuarioId: string): Promise<number>;
}
