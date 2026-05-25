import {
  IsDateString,
  IsString,
  IsIn,
  IsOptional,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AtualizarJogoDto {
  @ApiPropertyOptional({
    description: 'Data e hora do jogo',
    example: '2026-03-15T16:00:00.000Z',
  })
  @IsDateString({}, { message: 'dataHora deve ser uma data válida no formato ISO 8601' })
  @IsOptional()
  dataHora?: string;

  @ApiPropertyOptional({
    description: 'ID do time da casa',
    example: 'flamengo',
  })
  @IsString({ message: 'timeCasaId deve ser uma string' })
  @IsOptional()
  timeCasaId?: string;

  @ApiPropertyOptional({
    description: 'ID do time visitante',
    example: 'palmeiras',
  })
  @IsString({ message: 'timeForaId deve ser uma string' })
  @IsOptional()
  timeForaId?: string;

  @ApiPropertyOptional({
    description: 'Status do jogo',
    enum: ['AGENDADO', 'ADIADO', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO'],
    example: 'EM_ANDAMENTO',
  })
  @IsIn(['AGENDADO', 'ADIADO', 'EM_ANDAMENTO', 'FINALIZADO', 'CANCELADO'], {
    message: 'status deve ser AGENDADO, ADIADO, EM_ANDAMENTO, FINALIZADO ou CANCELADO',
  })
  @IsOptional()
  status?: 'AGENDADO' | 'ADIADO' | 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';
}
