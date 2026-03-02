import { IsString, IsNotEmpty, IsDefined, IsBoolean, IsUUID, IsOptional, IsInt, Length, Max } from 'class-validator';
import { Type } from 'class-transformer';
export class CriarGrupoDto {

  @IsDefined({ message: 'O campo é obrigatório.' })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O campo não pode estar vazio.' })
  @Length(3, 100, {
    message: 'Deve ter entre 3 e 100 caracteres.',
  })
  nome: string;

  @IsDefined({ message: 'O campo é obrigatório.' })
  @IsUUID('4', { message: 'Deve ser um UUID válido.' })
  temporadaId: string;

  @IsString({ message: 'Deve ser um texto válido.' })
  @IsDefined({ message: 'O campo é obrigatório.' })
  adminId: string;

  @IsDefined({ message: 'O campo é obrigatório.' })
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  privado: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  permitirPalpiteAutomatico?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Deve ser do tipo número inteiro.' })
  @Max(50, { message: 'O grupo pode ter no máximo 50 participantes.' })
  maxParticipantes?: number;
}
