import { TemporadaPresenter } from './temporada.presenter';

interface GrupoBase {
  id: string;
  nome: string;
  icone: string | null;
  temporadaId: string;
  privado: boolean;
  codigoConvite: string | null;
  permitirPalpiteAutomatico: boolean;
  maxParticipantes: number;
  permitirPalpiteDobrado: boolean;
  ativo: boolean;
  dataCriacao: Date;
  criadoPor: string;
}

interface TemporadaRelacao {
  id: string;
  ano: number;
  campeonatoId: string;
  dataCriacao: Date;
  campeonato?: {
    id: string;
    nome: string;
    dataCriacao: Date;
    atualizadoEm: Date;
  };
}

interface GrupoComRelacoes extends GrupoBase {
  ehMembro?: boolean;
  _count?: { usuarios: number };
  temporada?: TemporadaRelacao;
}

export class GrupoPresenter {
  static toHttp(grupo: GrupoComRelacoes) {
    const resultado: Record<string, unknown> = {
      id: grupo.id,
      nome: grupo.nome,
      icone: grupo.icone ?? null,
      temporadaId: grupo.temporadaId,
      privado: grupo.privado,
      codigoConvite: grupo.codigoConvite,
      permitirPalpiteAutomatico: grupo.permitirPalpiteAutomatico,
      maxParticipantes: grupo.maxParticipantes,
      permitirPalpiteDobrado: grupo.permitirPalpiteDobrado,
      ativo: grupo.ativo,
      dataCriacao: grupo.dataCriacao,
    };

    if (grupo.ehMembro !== undefined) {
      resultado.ehMembro = grupo.ehMembro;
    }
    if (grupo._count?.usuarios !== undefined) {
      resultado.totalParticipantes = grupo._count.usuarios;
    }
    if (grupo.temporada) {
      resultado.temporada = TemporadaPresenter.toHttp(grupo.temporada);
    }

    return resultado;
  }

  static toHttpMembro(grupo: GrupoComRelacoes) {
    const resultado: Record<string, unknown> = {
      id: grupo.id,
      nome: grupo.nome,
      icone: grupo.icone ?? null,
      temporadaId: grupo.temporadaId,
      privado: grupo.privado,
      codigoConvite: grupo.codigoConvite,
      permitirPalpiteAutomatico: grupo.permitirPalpiteAutomatico,
      maxParticipantes: grupo.maxParticipantes,
      permitirPalpiteDobrado: grupo.permitirPalpiteDobrado,
      ativo: grupo.ativo,
      dataCriacao: grupo.dataCriacao,
      ehMembro: true,
    };

    if (grupo._count?.usuarios !== undefined) {
      resultado.totalParticipantes = grupo._count.usuarios;
    }
    if (grupo.temporada) {
      resultado.temporada = TemporadaPresenter.toHttp(grupo.temporada);
    }

    return resultado;
  }

  static toHttpAdmin(grupo: GrupoComRelacoes) {
    return {
      ...GrupoPresenter.toHttp(grupo),
      criadoPor: grupo.criadoPor,
    };
  }

  static toHttpBasico(grupo: GrupoComRelacoes) {
    const resultado: Record<string, unknown> = {
      id: grupo.id,
      nome: grupo.nome,
      icone: grupo.icone ?? null,
      privado: grupo.privado,
      maxParticipantes: grupo.maxParticipantes,
      ehMembro: false,
    };

    if (grupo._count?.usuarios !== undefined) {
      resultado.totalParticipantes = grupo._count.usuarios;
    }

    return resultado;
  }
}
