import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class DefinirGrupoFavoritoDto {
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID do grupo favorito. Enviar null para remover.',
  })
  @IsOptional()
  @IsUUID('4', { message: 'grupoId deve ser um UUID válido' })
  grupoId?: string | null;
}
