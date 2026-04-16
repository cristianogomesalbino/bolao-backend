import { IsInt, IsUUID, IsNotEmpty, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportarJogosDto {
  @ApiProperty({
    description: 'Ano da temporada',
    example: 2026,
  })
  @IsInt({ message: 'season deve ser um número inteiro' })
  season: number;

  @ApiProperty({
    description: 'Número da rodada (1-38)',
    example: 1,
  })
  @IsInt({ message: 'rodada deve ser um número inteiro' })
  @Min(1, { message: 'rodada deve ser no mínimo 1' })
  @Max(38, { message: 'rodada deve ser no máximo 38' })
  rodada: number;

  @ApiProperty({
    description: 'ID da fase onde os jogos serão importados',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'faseId deve ser um UUID válido' })
  @IsNotEmpty({ message: 'faseId é obrigatório' })
  faseId: string;
}
