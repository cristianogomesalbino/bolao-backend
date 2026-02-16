import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCampeonatoDto {

  @IsString({ message: 'O nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  nome: string;
}
