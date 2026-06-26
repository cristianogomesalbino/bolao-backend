import { IsBoolean, IsDefined } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfigurarDobroDto {
  @ApiProperty({
    description: 'Habilitar ou desabilitar palpite dobrado no grupo',
    example: true,
  })
  @IsDefined({ message: 'permitirPalpiteDobrado é obrigatório' })
  @IsBoolean({ message: 'permitirPalpiteDobrado deve ser verdadeiro ou falso' })
  permitirPalpiteDobrado: boolean;
}
