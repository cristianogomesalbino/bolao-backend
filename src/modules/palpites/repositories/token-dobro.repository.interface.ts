export interface TokenDobroRepository {
  criar(data: {
    usuarioId: string;
    grupoId: string;
    tipo: 'CONCESSAO' | 'UTILIZACAO';
    motivo: 'PALPITES_COMPLETOS' | 'ACERTO_EM_CHEIO' | 'ULTIMO_RANKING' | 'PRIMEIRO_RANKING' | 'ATIVACAO_DOBRO' | 'CANCELAMENTO_DOBRO';
    referenciaId: string;
  }): Promise<any>;
  calcularSaldo(usuarioId: string, grupoId: string): Promise<number>;
  listarPorUsuarioEGrupo(usuarioId: string, grupoId: string): Promise<any[]>;
  buscarPorChave(usuarioId: string, grupoId: string, motivo: string, referenciaId: string): Promise<any>;
}
