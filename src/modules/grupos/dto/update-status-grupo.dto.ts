import { IsDefined, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStatusGrupoDto {
  @ApiProperty({ description: 'Status do grupo (ativo/inativo)', example: false })
  @IsDefined({ message: 'O campo é obrigatório.' })
  @IsBoolean({ message: 'Deve ser verdadeiro ou falso.' })
  ativo: boolean;
}
