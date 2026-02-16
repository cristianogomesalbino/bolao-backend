import { IsString, IsNotEmpty, IsBoolean, IsUUID, IsOptional, IsInt, Max } from 'class-validator';

export class CreateGrupoDto {

  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  nome: string;

  @IsUUID('4', { message: 'temporadaId deve ser um UUID válido.' })
  temporadaId: string;

  @IsString({ message: 'adminId deve ser um texto válido.' })
  @IsNotEmpty({ message: 'adminId é obrigatório.' })
  adminId: string;

  @IsBoolean()
  privado: boolean;

  @IsOptional()
  @IsBoolean()
  permitirPalpiteAutomatico?: boolean;

  @IsOptional()
  @IsInt()
  @Max(50, { message: 'O grupo pode ter no máximo 50 participantes.' })
  maxParticipantes?: number;
}
