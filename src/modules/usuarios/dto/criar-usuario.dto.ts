import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class CriarUsuarioDto {
  @ApiProperty({ 
    example: 'João Silva',
    description: 'Nome completo do usuário'
  })
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  nome: string;

  @ApiProperty({ 
    example: 'joao@example.com',
    description: 'Email do usuário'
  })
  @IsEmail({}, { message: 'Email inválido' })
  email: string;

  @ApiProperty({ 
    example: 'senha123',
    description: 'Senha do usuário (mínimo 6 caracteres)'
  })
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  senha: string;

}