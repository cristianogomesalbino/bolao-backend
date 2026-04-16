import { IsString, IsNotEmpty, IsDefined, IsBoolean, IsUUID, IsOptional, IsInt, Length, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CriarGrupoDto {
  @ApiProperty({ description: 'Nome do grupo', example: 'Bolão da Firma' })
  @IsDefined({ message: 'O campo é obrigatório.' })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O campo não pode estar vazio.' })
  @Length(3, 100, { message: 'Deve ter entre 3 e 100 caracteres.' })
  nome: string;

  @ApiProperty({ description: 'ID da temporada', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsDefined({ message: 'O campo é obrigatório.' })
  @IsUUID('4', { message: 'Deve ser um UUID válido.' })
  temporadaId: string;

  @ApiProperty({ description: 'Se o grupo é privado', example: true })
  @IsDefined({ message: 'O campo é obrigatório.' })
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  privado: boolean;

  @ApiPropertyOptional({ description: 'Permitir palpite automático', example: false })
  @IsOptional()
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  permitirPalpiteAutomatico?: boolean;

  @ApiPropertyOptional({ description: 'Máximo de participantes', example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Deve ser do tipo número inteiro.' })
  @Max(50, { message: 'O grupo pode ter no máximo 50 participantes.' })
  maxParticipantes?: number;

  @ApiPropertyOptional({ description: 'Habilitar palpite dobrado no grupo', example: false })
  @IsOptional()
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  permitirPalpiteDobrado?: boolean;
}
