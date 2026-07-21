import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AtualizarPreferenciasDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'jogoProximo deve ser true ou false' })
  jogoProximo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'rodadaEncerrada deve ser true ou false' })
  rodadaEncerrada?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'acertoEmCheio deve ser true ou false' })
  acertoEmCheio?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'subiuPosicao deve ser true ou false' })
  subiuPosicao?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'desceuPosicao deve ser true ou false' })
  desceuPosicao?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'palpitesPendentes deve ser true ou false' })
  palpitesPendentes?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'jogoLiberado deve ser true ou false' })
  jogoLiberado?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'vencedorBolao deve ser true ou false' })
  vencedorBolao?: boolean;
}
