import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'usuario@email.com' })
  @IsEmail({}, { message: 'Email inválido.' })
  @IsNotEmpty({ message: 'Email é obrigatório.' })
  email!: string;

  @ApiProperty({ example: 'senha123' })
  @IsString({ message: 'Senha deve ser uma string.' })
  @IsNotEmpty({ message: 'Senha é obrigatória.' })
  senha!: string;

  @ApiPropertyOptional({
    description:
      'Renova a sessão por mais 30 dias a cada acesso. Sem esta opção, o cookie expira ao fechar o navegador.',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Continuar logado deve ser verdadeiro ou falso.' })
  continuarLogado?: boolean;
}
