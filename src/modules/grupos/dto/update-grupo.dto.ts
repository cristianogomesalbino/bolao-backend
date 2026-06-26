import {
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { GRUPOS } from '../grupos.constants';

export class UpdateGrupoDto {
  @ApiPropertyOptional({
    description: 'Nome do grupo',
    example: 'Bolão da Firma',
  })
  @IsOptional()
  @IsString({ message: 'Deve ser um texto.' })
  @Length(3, 100, { message: 'Deve ter entre 3 e 100 caracteres.' })
  nome?: string;

  @ApiPropertyOptional({ description: 'Se o grupo é privado', example: true })
  @IsOptional()
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  privado?: boolean;

  @ApiPropertyOptional({
    description: 'Permitir palpite automático',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  permitirPalpiteAutomatico?: boolean;

  @ApiPropertyOptional({
    description: 'Máximo de participantes',
    example: GRUPOS.MAX_PARTICIPANTES_DEFAULT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Deve ser do tipo número inteiro.' })
  @Min(1, { message: 'Deve ter no mínimo 1 participante.' })
  @Max(GRUPOS.MAX_PARTICIPANTES_DEFAULT, {
    message: `O grupo pode ter no máximo ${GRUPOS.MAX_PARTICIPANTES_DEFAULT} participantes.`,
  })
  maxParticipantes?: number;

  @ApiPropertyOptional({
    description: 'Ícone do grupo (emoji ou URL)',
    example: '⚽',
  })
  @IsOptional()
  @IsString({ message: 'Deve ser um texto.' })
  @Length(1, 255, { message: 'Deve ter entre 1 e 255 caracteres.' })
  icone?: string;

  @ApiPropertyOptional({
    description: 'Habilitar palpite dobrado no grupo',
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  permitirPalpiteDobrado?: boolean;
}
