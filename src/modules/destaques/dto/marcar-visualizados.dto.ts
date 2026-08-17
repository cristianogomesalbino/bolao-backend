import { IsArray, ArrayMaxSize, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MarcarVisualizadosDto {
  @IsArray({ message: 'destaqueIds deve ser um array' })
  @ArrayMaxSize(50, { message: 'Máximo 50 destaques por request' })
  @IsUUID('4', { each: true, message: 'Cada item deve ser um UUID válido' })
  @ApiProperty({ type: [String], description: 'IDs dos destaques visualizados' })
  destaqueIds: string[];
}
