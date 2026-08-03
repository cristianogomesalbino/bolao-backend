import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { TOURS_VALIDOS } from '../usuarios.constants';

export class MarcarTourCompletoDto {
  @ApiProperty({
    example: 'tour-home',
    description: 'ID do tour a marcar como completo',
    enum: TOURS_VALIDOS,
  })
  @IsString({ message: 'tourId deve ser uma string' })
  @IsIn([...TOURS_VALIDOS], {
    message: 'tourId deve ser um dos valores válidos',
  })
  tourId: (typeof TOURS_VALIDOS)[number];
}
