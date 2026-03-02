import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, MinLength } from 'class-validator';

export class AtualizarUsuarioDto {
  @ApiPropertyOptional({ 
    example: 'João Silva',
    description: 'Nome completo do usuário'
  })
  @IsOptional()
  nome?: string;

  @ApiPropertyOptional({ 
    example: 'joao@example.com',
    description: 'Email do usuário'
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;

  @ApiPropertyOptional({ 
    example: 'senha123',
    description: 'Senha do usuário (mínimo 6 caracteres)'
  })
  @IsOptional()
  @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
  senha?: string;
}
