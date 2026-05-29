import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BuscarPalpitesPorJogosDto {
  @ApiProperty({ description: 'IDs dos jogos', type: [String] })
  @IsArray({ message: 'jogoIds deve ser um array' })
  @ArrayNotEmpty({ message: 'jogoIds não pode estar vazio' })
  @IsUUID('4', { each: true, message: 'Cada jogoId deve ser um UUID válido' })
  jogoIds: string[];
}
