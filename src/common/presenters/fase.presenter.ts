export class FasePresenter {
  static toHttp(fase: any) {
    return {
      id: fase.id,
      nome: fase.nome,
      tipo: fase.tipo,
      ordem: fase.ordem,
      idaVolta: fase.idaVolta,
      temporadaId: fase.temporadaId,
      dataCriacao: fase.dataCriacao,
    };
  }
}
