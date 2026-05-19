import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AlterarRoleDto {
  @ApiProperty({
    description: 'Novo role do membro',
    enum: ['ADMIN', 'MEMBER'],
    example: 'ADMIN',
  })
  @IsIn(['ADMIN', 'MEMBER'], { message: 'role deve ser ADMIN ou MEMBER' })
  role: 'ADMIN' | 'MEMBER';
}
