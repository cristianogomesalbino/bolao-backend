import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CAMPEONATO_SLUGS, type CampeonatoSlug } from '../jogos.constants';

export class SincronizarJogosDto {
  @ApiProperty({
    description: `Slug do campeonato (${CAMPEONATO_SLUGS.join(' ou ')})`,
    example: 'brasileirao',
    enum: CAMPEONATO_SLUGS,
  })
  @IsIn(CAMPEONATO_SLUGS, {
    message: `campeonatoSlug deve ser um de: ${CAMPEONATO_SLUGS.join(', ')}`,
  })
  campeonatoSlug: CampeonatoSlug;

  @ApiProperty({
    description: 'Slug da fase na API externa',
    example: 'fase-unica-campeonato-brasileiro-2026',
  })
  @IsString({ message: 'faseSlug deve ser uma string' })
  @IsNotEmpty({ message: 'faseSlug é obrigatório' })
  faseSlug: string;
}
