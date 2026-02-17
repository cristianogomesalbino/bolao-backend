import { PartialType } from '@nestjs/mapped-types';
import { CreateGrupoDto } from './create-grupo.dto';
import { IsInt, IsOptional, IsString, IsBoolean, Max } from 'class-validator';

export class UpdateGrupoDto {
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  nome?: string;

  @IsOptional()
  @IsBoolean()
  privado?: boolean;

  @IsOptional()
  @IsBoolean()
  permitirPalpiteAutomatico?: boolean;

  @IsOptional()
  @IsInt()
  @Max(50, { message: 'O grupo pode ter no máximo 50 participantes.' })
  maxParticipantes?: number;
}
