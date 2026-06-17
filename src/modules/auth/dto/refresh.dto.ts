import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * @deprecated O refresh token agora é lido do cookie HttpOnly.
 * Este DTO é mantido apenas para retrocompatibilidade temporária.
 * Será removido em versão futura.
 */
export class RefreshDto {
  @ApiPropertyOptional({
    description: 'Deprecated — refresh token agora é lido do cookie HttpOnly.',
  })
  @IsString({ message: 'Refresh token deve ser uma string.' })
  @IsOptional()
  refreshToken?: string;
}
