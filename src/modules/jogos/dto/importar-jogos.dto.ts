import { IsInt, IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportarJogosDto {
  @ApiProperty({
    description: 'ID da liga na API-Football (71=Brasileirão, 1=Copa do Mundo)',
    example: 71,
  })
  @IsInt({ message: 'leagueId deve ser um número inteiro' })
  leagueId: number;

  @ApiProperty({
    description: 'Ano da temporada',
    example: 2026,
  })
  @IsInt({ message: 'season deve ser um número inteiro' })
  season: number;

  @ApiProperty({
    description: 'ID da fase onde os jogos serão importados',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'faseId deve ser um UUID válido' })
  @IsNotEmpty({ message: 'faseId é obrigatório' })
  faseId: string;
}
