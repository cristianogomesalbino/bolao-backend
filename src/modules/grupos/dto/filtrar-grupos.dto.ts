import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class FiltrarGruposDto {
  @ApiPropertyOptional({
    description: 'Filtrar apenas grupos onde o usuário é membro',
    example: 'true',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  membro?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por visibilidade (false = apenas públicos)',
    example: 'false',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  privado?: boolean;

  @ApiPropertyOptional({
    description: 'Busca por nome do grupo (parcial, case-insensitive)',
    example: 'bolao',
  })
  @IsOptional()
  @IsString({ message: 'busca deve ser uma string' })
  busca?: string;
}
