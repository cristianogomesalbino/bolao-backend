import type { DestaqueComAutor } from '../../modules/destaques/repositories/destaque.repository.interface';

export interface DestaqueHttp {
  id: string;
  tipo: string;
  titulo: string;
  dados: Record<string, unknown>;
  jogoId: string;
  rodada: number | null;
  criadoEm: string;
  contadorFs: number;
  jaEnviouF: boolean;
  visualizado: boolean;
  autor: {
    usuarioId: string;
    nome: string;
    avatar: string | null;
  };
}

export class DestaquePresenter {
  static toHttp(
    destaque: DestaqueComAutor,
    opcoes: { jaEnviouF: boolean; visualizado: boolean },
  ): DestaqueHttp {
    return {
      id: destaque.id,
      tipo: destaque.tipo,
      titulo: destaque.titulo,
      dados: destaque.dados,
      jogoId: destaque.jogoId,
      rodada: destaque.rodada,
      criadoEm: destaque.criadoEm.toISOString(),
      contadorFs: destaque.contadorFs,
      jaEnviouF: opcoes.jaEnviouF,
      visualizado: opcoes.visualizado,
      autor: {
        usuarioId: destaque.usuario.id,
        nome: destaque.usuario.nome,
        avatar: null,
      },
    };
  }
}
