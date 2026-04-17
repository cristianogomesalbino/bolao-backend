import { IsNotEmpty, IsString, MinLength, Validate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ConfirmarSenhaConstraint } from './confirmar-senha.constraint';

export class ResetarSenhaDto {
  @ApiProperty({ example: 'token-recebido-por-email' })
  @IsString({ message: 'Token deve ser uma string.' })
  @IsNotEmpty({ message: 'Token é obrigatório.' })
  token: string;

  @ApiProperty({ example: 'novaSenha123' })
  @IsString({ message: 'Nova senha deve ser uma string.' })
  @IsNotEmpty({ message: 'Nova senha é obrigatória.' })
  @MinLength(6, { message: 'Nova senha deve ter no mínimo 6 caracteres.' })
  novaSenha: string;

  @ApiProperty({ example: 'novaSenha123' })
  @IsString({ message: 'Confirmação de senha deve ser uma string.' })
  @IsNotEmpty({ message: 'Confirmação de senha é obrigatória.' })
  @Validate(ConfirmarSenhaConstraint, { message: 'As senhas não coincidem.' })
  confirmarSenha: string;
}
