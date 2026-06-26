import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AtualizarPalpiteDto {
  @ApiProperty({
    description: 'Gols previstos para o time da casa',
    example: 3,
  })
  @IsInt({ message: 'golsCasa deve ser um número inteiro' })
  @Min(0, { message: 'golsCasa deve ser no mínimo 0' })
  golsCasa: number;

  @ApiProperty({
    description: 'Gols previstos para o time visitante',
    example: 0,
  })
  @IsInt({ message: 'golsFora deve ser um número inteiro' })
  @Min(0, { message: 'golsFora deve ser no mínimo 0' })
  golsFora: number;
}
