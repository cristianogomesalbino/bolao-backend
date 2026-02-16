import { IsInt, Min, Max, IsUUID } from 'class-validator';

export class CreateTemporadaDto {

  @IsInt({ message: 'O ano deve ser um número inteiro.' })
  @Min(2000, { message: 'O ano deve ser maior ou igual a 2000.' })
  @Max(2100, { message: 'O ano deve ser menor ou igual a 2100.' })
  ano: number;

  @IsUUID('4', { message: 'campeonatoId deve ser um UUID válido.' })
  campeonatoId: string;
}