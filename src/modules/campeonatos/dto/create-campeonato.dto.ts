import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCampeonatoDto {
  @ApiProperty({
    description: 'Nome do campeonato',
    example: 'Brasileirão Série A',
  })
  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  nome: string;
}
