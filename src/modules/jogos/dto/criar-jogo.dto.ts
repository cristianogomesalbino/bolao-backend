import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CriarJogoDto {
  @ApiProperty({
    description: 'ID do time da casa',
    example: 'flamengo',
  })
  @IsString({ message: 'timeCasaId deve ser uma string' })
  @IsNotEmpty({ message: 'timeCasaId é obrigatório' })
  timeCasaId: string;

  @ApiProperty({
    description: 'ID do time visitante',
    example: 'palmeiras',
  })
  @IsString({ message: 'timeForaId deve ser uma string' })
  @IsNotEmpty({ message: 'timeForaId é obrigatório' })
  timeForaId: string;

  @ApiProperty({
    description: 'Data e hora do jogo',
    example: '2026-03-15T16:00:00.000Z',
  })
  @IsDateString({}, { message: 'dataHora deve ser uma data válida no formato ISO 8601' })
  @IsNotEmpty({ message: 'dataHora é obrigatório' })
  dataHora: string;

  @ApiPropertyOptional({
    description: 'Número da rodada',
    example: 1,
  })
  @IsInt({ message: 'rodada deve ser um número inteiro' })
  @Min(1, { message: 'rodada deve ser maior ou igual a 1' })
  @IsOptional()
  rodada?: number;

  @ApiPropertyOptional({
    description: 'Identificador do grupo ida/volta',
    example: 'quartas-1',
  })
  @IsString({ message: 'grupoIdaVolta deve ser uma string' })
  @IsOptional()
  grupoIdaVolta?: string;

  @ApiPropertyOptional({
    description: 'Se é o jogo de volta do confronto',
    default: false,
  })
  @IsBoolean({ message: 'ehJogoVolta deve ser um booleano' })
  @IsOptional()
  ehJogoVolta?: boolean;
}
