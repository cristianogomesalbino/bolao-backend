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
      ...(grupo.ehMembro !== undefined && { ehMembro: grupo.ehMembro }),
      ...(grupo._count?.usuarios !== undefined && {
        totalParticipantes: grupo._count.usuarios,
      }),
      ...(grupo.temporada && {
        temporada: TemporadaPresenter.toHttp(grupo.temporada),
      }),
    };
  }

  static toHttpMembro(grupo: any) {
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
      ehMembro: true,
      ...(grupo._count?.usuarios !== undefined && {
        totalParticipantes: grupo._count.usuarios,
      }),
      ...(grupo.temporada && {
        temporada: TemporadaPresenter.toHttp(grupo.temporada),
      }),
    };
  }

  static toHttpBasico(grupo: any) {
    return {
      id: grupo.id,
      nome: grupo.nome,
      privado: grupo.privado,
      maxParticipantes: grupo.maxParticipantes,
      ...(grupo._count?.usuarios !== undefined && {
        totalParticipantes: grupo._count.usuarios,
      }),
      ehMembro: false,
    };
  }
}
