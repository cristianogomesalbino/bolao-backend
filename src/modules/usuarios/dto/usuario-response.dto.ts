import { ApiProperty } from '@nestjs/swagger';

export class UsuarioResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  nome: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  perfil: string;

  @ApiProperty()
  ativo: boolean;

  @ApiProperty()
  dataCriacao: Date;

  @ApiProperty()
  atualizadoEm: Date;

  static fromEntity(usuario: any): UsuarioResponseDto {
    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      ativo: usuario.ativo,
      dataCriacao: usuario.dataCriacao,
      atualizadoEm: usuario.atualizadoEm,
    };
  }
}