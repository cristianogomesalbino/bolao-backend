import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsInt,
  Min,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CriarFaseDto {
  @ApiProperty({ description: 'Nome da fase', example: 'Rodada 1' })
  @IsString({ message: 'nome deve ser uma string' })
  @IsNotEmpty({ message: 'nome é obrigatório' })
  nome: string;

  @ApiProperty({
    description: 'Tipo da fase',
    enum: ['PONTOS_CORRIDOS', 'MATA_MATA'],
    example: 'PONTOS_CORRIDOS',
  })
  @IsIn(['PONTOS_CORRIDOS', 'MATA_MATA'], {
    message: 'tipo deve ser PONTOS_CORRIDOS ou MATA_MATA',
  })
  tipo: 'PONTOS_CORRIDOS' | 'MATA_MATA';

  @ApiProperty({ description: 'Ordem da fase na temporada', example: 1 })
  @IsInt({ message: 'ordem deve ser um número inteiro' })
  @Min(1, { message: 'ordem deve ser no mínimo 1' })
  ordem: number;

  @ApiPropertyOptional({
    description: 'Se a fase possui jogos de ida e volta (apenas MATA_MATA)',
    default: false,
  })
  @IsBoolean({ message: 'idaVolta deve ser um booleano' })
  @IsOptional()
  idaVolta?: boolean;
}
