import { TemporadaPresenter } from './temporada.presenter';

export class GrupoPresenter {
  static toHttp(grupo: any) {
    return {
      id: grupo.id,
      nome: grupo.nome,
      temporadaId: grupo.temporadaId,
      privado: grupo.privado,
      codigoConvite: grupo.codigoConvite,
      permitirPalpiteAutomatico: grupo.permitirPalpiteAutomatico,
      maxParticipantes: grupo.maxParticipantes,
      permitirPalpiteDobrado: grupo.permitirPalpiteDobrado,
      ativo: grupo.ativo,
      dataCriacao: grupo.dataCriacao,
      criadoPor: grupo.criadoPor,
      ...(grupo.temporada && {
        temporada: TemporadaPresenter.toHttp(grupo.temporada),
      }),
    };
  }
}
