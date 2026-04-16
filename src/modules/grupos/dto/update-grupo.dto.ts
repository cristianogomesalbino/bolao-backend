import { IsOptional, IsString, IsBoolean, Length } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGrupoDto {
  @ApiPropertyOptional({ description: 'Nome do grupo', example: 'Bolão da Firma' })
  @IsOptional()
  @IsString({ message: 'Deve ser um texto.' })
  @Length(3, 100, { message: 'Deve ter entre 3 e 100 caracteres.' })
  nome?: string;

  @ApiPropertyOptional({ description: 'Se o grupo é privado', example: true })
  @IsOptional()
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  privado?: boolean;

  @ApiPropertyOptional({ description: 'Permitir palpite automático', example: false })
  @IsOptional()
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  permitirPalpiteAutomatico?: boolean;

  @ApiPropertyOptional({ description: 'Habilitar palpite dobrado no grupo', example: false })
  @IsOptional()
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  permitirPalpiteDobrado?: boolean;
}
