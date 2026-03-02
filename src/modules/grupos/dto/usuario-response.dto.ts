export class UsuarioResponseDto {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  dataCriacao: Date;
  atualizadoEm: Date;

  constructor(usuario: any) {
    this.id = usuario.id;
    this.nome = usuario.nome;
    this.email = usuario.email;
    this.perfil = usuario.perfil;
    this.ativo = usuario.ativo;
    this.dataCriacao = usuario.dataCriacao;
    this.atualizadoEm = usuario.atualizadoEm;
  }
}