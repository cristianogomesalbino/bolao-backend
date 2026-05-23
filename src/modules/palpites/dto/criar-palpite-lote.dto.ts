import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PalpiteItemDto {
  @ApiProperty({ description: 'ID do jogo', example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID('4', { message: 'jogoId deve ser um UUID válido' })
  jogoId: string;

  @ApiProperty({ description: 'Gols previstos para o time da casa', example: 2 })
  @IsInt({ message: 'golsCasa deve ser um número inteiro' })
  @Min(0, { message: 'golsCasa deve ser no mínimo 0' })
  golsCasa: number;

  @ApiProperty({ description: 'Gols previstos para o time visitante', example: 1 })
  @IsInt({ message: 'golsFora deve ser um número inteiro' })
  @Min(0, { message: 'golsFora deve ser no mínimo 0' })
  golsFora: number;
}

export class CriarPalpiteLoteDto {
  @ApiProperty({ description: 'Lista de palpites', type: [PalpiteItemDto] })
  @IsArray({ message: 'palpites deve ser um array' })
  @ValidateNested({ each: true })
  @Type(() => PalpiteItemDto)
  palpites: PalpiteItemDto[];
}
