import { IsInt, Min, Max, IsUUID, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemporadaDto {
  @ApiProperty({ description: 'Ano da temporada', example: 2026 })
  @IsInt({ message: 'O ano deve ser um número inteiro.' })
  @Min(2000, { message: 'O ano deve ser maior ou igual a 2000.' })
  @Max(2100, { message: 'O ano deve ser menor ou igual a 2100.' })
  ano: number;

  @ApiProperty({
    description: 'ID do campeonato',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'campeonatoId deve ser um UUID válido.' })
  campeonatoId: string;

  @ApiPropertyOptional({
    description: 'ID da temporada de onde copiar as fases',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'copiarFasesDe deve ser um UUID válido.' })
  copiarFasesDe?: string;
}
