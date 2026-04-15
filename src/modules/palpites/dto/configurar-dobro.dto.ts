import { IsBoolean, IsDefined } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfigurarDobroDto {
  @ApiProperty({ description: 'Habilitar ou desabilitar palpite dobrado no grupo', example: true })
  @IsDefined({ message: 'O campo é obrigatório' })
  @IsBoolean({ message: 'palpiteDobradoHabilitado deve ser verdadeiro ou falso' })
  palpiteDobradoHabilitado: boolean;
}
