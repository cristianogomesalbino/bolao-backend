interface FaseData {
  id: string;
  nome: string;
  tipo: string;
  ordem: number;
  idaVolta: boolean;
  temporadaId: string;
  dataCriacao: Date;
}

export class FasePresenter {
  static toHttp(fase: FaseData) {
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
