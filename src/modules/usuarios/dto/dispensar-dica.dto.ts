import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class DispensarDicaDto {
  @ApiProperty({
    example: 'dica-palpites-primeiro-card',
    description: 'ID da dica a marcar como dispensada',
  })
  @IsString({ message: 'dicaId deve ser uma string' })
  @IsNotEmpty({ message: 'dicaId é obrigatório' })
  dicaId: string;
}
