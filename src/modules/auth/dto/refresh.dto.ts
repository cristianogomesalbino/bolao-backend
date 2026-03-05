import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty()
  @IsString({ message: 'Refresh token deve ser uma string.' })
  @IsNotEmpty({ message: 'Refresh token é obrigatório.' })
  refreshToken: string;
}
