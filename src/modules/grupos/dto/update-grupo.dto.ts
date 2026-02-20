import { PartialType } from '@nestjs/mapped-types';
import { CreateGrupoDto } from './create-grupo.dto';
import { IsOptional, IsString, IsBoolean, Length } from 'class-validator';

export class UpdateGrupoDto {

  @IsOptional()
  @IsString({ message: 'Deve ser um texto.' })
  @Length(3, 100, { message: 'Deve ter entre 3 e 100 caracteres.' })
  nome?: string;

  @IsOptional()
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  privado?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  permitirPalpiteAutomatico?: boolean;
}
