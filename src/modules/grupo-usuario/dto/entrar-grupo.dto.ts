import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EntrarGrupoDto {
  @ApiProperty({
    description: 'Código de convite do grupo',
    example: 'ABC12345',
  })
  @IsString({ message: 'codigoConvite deve ser uma string' })
  @Length(8, 8, { message: 'codigoConvite deve ter exatamente 8 caracteres' })
  codigoConvite: string;
}
