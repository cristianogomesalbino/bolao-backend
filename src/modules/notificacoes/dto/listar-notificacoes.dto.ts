import { IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NOTIFICACOES } from '../notificacoes.constants';

export class ListarNotificacoesDto {
  @ApiPropertyOptional({
    default: NOTIFICACOES.LIMITES.LISTAGEM_LIMIT_DEFAULT,
    minimum: 1,
    maximum: NOTIFICACOES.LIMITES.LISTAGEM_LIMIT_MAX,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit deve ser um número inteiro' })
  @Min(1, { message: 'limit deve ser no mínimo 1' })
  @Max(NOTIFICACOES.LIMITES.LISTAGEM_LIMIT_MAX, {
    message: `limit deve ser no máximo ${NOTIFICACOES.LIMITES.LISTAGEM_LIMIT_MAX}`,
  })
  limit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset deve ser um número inteiro' })
  @Min(0, { message: 'offset deve ser no mínimo 0' })
  offset?: number;

  @ApiPropertyOptional({ enum: ['NAO_LIDA', 'LIDA'] })
  @IsOptional()
  @IsIn(['NAO_LIDA', 'LIDA'], {
    message: 'status deve ser NAO_LIDA ou LIDA',
  })
  status?: 'NAO_LIDA' | 'LIDA';
}
