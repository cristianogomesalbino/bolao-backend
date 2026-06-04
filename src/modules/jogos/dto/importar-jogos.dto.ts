import { IsInt, IsUUID, IsNotEmpty, IsIn, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CAMPEONATO_SLUGS } from '../jogos.constants';

export class ImportarJogosDto {
  @ApiProperty({
    description: `Slug do campeonato (${CAMPEONATO_SLUGS.join(' ou ')})`,
    example: 'brasileirao',
    enum: CAMPEONATO_SLUGS,
  })
  @IsIn(CAMPEONATO_SLUGS, {
    message: `campeonatoSlug deve ser um de: ${CAMPEONATO_SLUGS.join(', ')}`,
  })
  campeonatoSlug: string;

  @ApiProperty({
    description: 'Slug da fase na API externa',
    example: 'fase-unica-campeonato-brasileiro-2026',
  })
  @IsString({ message: 'faseSlug deve ser uma string' })
  @IsNotEmpty({ message: 'faseSlug é obrigatório' })
  faseSlug: string;

  @ApiProperty({
    description: 'Número da rodada (validação dinâmica por campeonato/fase)',
    example: 1,
  })
  @IsInt({ message: 'rodada deve ser um número inteiro' })
  @Min(1, { message: 'rodada deve ser no mínimo 1' })
  rodada: number;

  @ApiProperty({
    description: 'ID da fase onde os jogos serão importados',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'faseId deve ser um UUID válido' })
  @IsNotEmpty({ message: 'faseId é obrigatório' })
  faseId: string;
}
