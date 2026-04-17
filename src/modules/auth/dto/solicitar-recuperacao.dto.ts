import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SolicitarRecuperacaoDto {
  @ApiProperty({ example: 'usuario@email.com' })
  @IsEmail({}, { message: 'Email inválido.' })
  @IsNotEmpty({ message: 'Email é obrigatório.' })
  email: string;
}
