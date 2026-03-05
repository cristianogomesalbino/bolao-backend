import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'usuario@email.com' })
  @IsEmail({}, { message: 'Email inválido.' })
  @IsNotEmpty({ message: 'Email é obrigatório.' })
  email: string;

  @ApiProperty({ example: 'senha123' })
  @IsString({ message: 'Senha deve ser uma string.' })
  @IsNotEmpty({ message: 'Senha é obrigatória.' })
  senha: string;
}
