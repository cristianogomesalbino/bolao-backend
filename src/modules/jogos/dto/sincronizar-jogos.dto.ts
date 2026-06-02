import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SincronizarJogosDto {
  @ApiProperty({
    description: 'Slug do campeonato (brasileirao ou copa-do-mundo-2026)',
    example: 'brasileirao',
    enum: ['brasileirao', 'copa-do-mundo-2026'],
  })
  @IsIn(['brasileirao', 'copa-do-mundo-2026'], {
    message: "campeonatoSlug deve ser 'brasileirao' ou 'copa-do-mundo-2026'",
  })
  campeonatoSlug: 'brasileirao' | 'copa-do-mundo-2026';

  @ApiProperty({
    description: 'Slug da fase na API externa',
    example: 'fase-unica-campeonato-brasileiro-2026',
  })
  @IsString({ message: 'faseSlug deve ser uma string' })
  @IsNotEmpty({ message: 'faseSlug é obrigatório' })
  faseSlug: string;
}
