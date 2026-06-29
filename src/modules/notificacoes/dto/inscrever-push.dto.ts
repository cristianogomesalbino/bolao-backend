import { IsNotEmpty, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { NOTIFICACOES } from '../notificacoes.constants';

class PushKeysDto {
  @ApiProperty({ description: 'Chave pública p256dh' })
  @IsNotEmpty({ message: 'p256dh é obrigatório' })
  @IsString({ message: 'p256dh deve ser uma string' })
  @MaxLength(128, { message: 'p256dh deve ter no máximo 128 caracteres' })
  p256dh: string;

  @ApiProperty({ description: 'Chave de autenticação' })
  @IsNotEmpty({ message: 'auth é obrigatório' })
  @IsString({ message: 'auth deve ser uma string' })
  @MaxLength(48, { message: 'auth deve ter no máximo 48 caracteres' })
  auth: string;
}

export class InscreverPushDto {
  @ApiProperty({
    description: 'Endpoint do push subscription',
    maxLength: 2048,
  })
  @IsNotEmpty({ message: 'endpoint é obrigatório' })
  @IsUrl({}, { message: 'endpoint deve ser uma URL válida' })
  @MaxLength(2048, {
    message: `endpoint deve ter no máximo ${NOTIFICACOES.LIMITES.INSCRICOES_POR_USUARIO * 200} caracteres`,
  })
  endpoint: string;

  @ApiProperty({ type: PushKeysDto })
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}
