import { IsInt, Min, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FinalizarJogoDto {
  @ApiProperty({ description: 'Gols do time da casa', example: 2 })
  @IsInt({ message: 'golsCasa deve ser um número inteiro' })
  @Min(0, { message: 'golsCasa deve ser no mínimo 0' })
  golsCasa: number;

  @ApiProperty({ description: 'Gols do time visitante', example: 1 })
  @IsInt({ message: 'golsFora deve ser um número inteiro' })
  @Min(0, { message: 'golsFora deve ser no mínimo 0' })
  golsFora: number;

  @ApiPropertyOptional({
    description: 'Se houve prorrogação',
    default: false,
  })
  @IsBoolean({ message: 'temProrrogacao deve ser um booleano' })
  @IsOptional()
  temProrrogacao?: boolean;

  @ApiPropertyOptional({
    description: 'Gols da prorrogação do time da casa',
    example: 1,
  })
  @IsInt({ message: 'golsProrrogacaoCasa deve ser um número inteiro' })
  @Min(0, { message: 'golsProrrogacaoCasa deve ser no mínimo 0' })
  @IsOptional()
  golsProrrogacaoCasa?: number;

  @ApiPropertyOptional({
    description: 'Gols da prorrogação do time visitante',
    example: 0,
  })
  @IsInt({ message: 'golsProrrogacaoFora deve ser um número inteiro' })
  @Min(0, { message: 'golsProrrogacaoFora deve ser no mínimo 0' })
  @IsOptional()
  golsProrrogacaoFora?: number;

  @ApiPropertyOptional({
    description: 'Se houve disputa de pênaltis',
    default: false,
  })
  @IsBoolean({ message: 'temPenaltis deve ser um booleano' })
  @IsOptional()
  temPenaltis?: boolean;

  @ApiPropertyOptional({
    description: 'Pênaltis convertidos pelo time da casa',
    example: 5,
  })
  @IsInt({ message: 'penaltisCasa deve ser um número inteiro' })
  @Min(0, { message: 'penaltisCasa deve ser no mínimo 0' })
  @IsOptional()
  penaltisCasa?: number;

  @ApiPropertyOptional({
    description: 'Pênaltis convertidos pelo time visitante',
    example: 4,
  })
  @IsInt({ message: 'penaltisFora deve ser um número inteiro' })
  @Min(0, { message: 'penaltisFora deve ser no mínimo 0' })
  @IsOptional()
  penaltisFora?: number;
}
