import { IsUUID } from 'class-validator';

export class AddUsuarioGrupoDto {
  @IsUUID()
  usuarioId: string;

  @IsUUID()
  grupoId: string;
}
