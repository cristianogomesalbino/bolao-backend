import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GRUPOS } from '../../grupos/grupos.constants';

export class EntrarGrupoDto {
  @ApiProperty({
    description: 'Código de convite do grupo',
    example: 'ABC12345',
  })
  @IsString({ message: 'codigoConvite deve ser uma string' })
  @Length(GRUPOS.CODIGO_CONVITE_LENGTH, GRUPOS.CODIGO_CONVITE_LENGTH, {
    message: `codigoConvite deve ter exatamente ${GRUPOS.CODIGO_CONVITE_LENGTH} caracteres`,
  })
  codigoConvite: string;
}
