interface UsuarioData {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  grupoFavoritoId: string | null;
  toursCompletos?: string[];
  dicasDispensadas?: string[];
  toastDescobrilidadeVisto?: boolean;
  dataCriacao: Date;
  atualizadoEm: Date;
}

export class UsuarioPresenter {
  static toHttp(usuario: UsuarioData) {
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      ativo: usuario.ativo,
      grupoFavoritoId: usuario.grupoFavoritoId ?? null,
      toursCompletos: usuario.toursCompletos ?? [],
      dicasDispensadas: usuario.dicasDispensadas ?? [],
      toastDescobrilidadeVisto: usuario.toastDescobrilidadeVisto ?? false,
      dataCriacao: usuario.dataCriacao,
      atualizadoEm: usuario.atualizadoEm,
    };
  }
}
