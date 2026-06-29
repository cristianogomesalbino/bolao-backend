import { IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelarPushDto {
  @ApiProperty({ description: 'Endpoint da inscrição push a cancelar' })
  @IsNotEmpty({ message: 'endpoint é obrigatório' })
  @IsUrl({}, { message: 'endpoint deve ser uma URL válida' })
  endpoint: string;
}
