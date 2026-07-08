import type { Notificacao } from '../../modules/notificacoes/repositories/notificacao.repository.interface';

export class NotificacaoPresenter {
  static toHttp(notificacao: Notificacao) {
    return {
      id: notificacao.id,
      tipo: notificacao.tipo,
      titulo: notificacao.titulo,
      mensagem: notificacao.mensagem,
      status: notificacao.status,
      jogoId: notificacao.jogoId,
      grupoId: notificacao.grupoId,
      faseId: notificacao.faseId,
      rodada: notificacao.rodada,
      dataCriacao: notificacao.dataCriacao,
      dataLeitura: notificacao.dataLeitura,
    };
  }
}
