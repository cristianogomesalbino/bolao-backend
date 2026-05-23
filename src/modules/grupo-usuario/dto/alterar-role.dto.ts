import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GRUPO_ROLE } from '../../../common/constants/roles.constants';

export class AlterarRoleDto {
  @ApiProperty({
    description: 'Novo role do membro',
    enum: [GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER],
    example: 'ADMIN',
  })
  @IsIn([GRUPO_ROLE.ADMIN, GRUPO_ROLE.MEMBER], { message: 'role deve ser ADMIN ou MEMBER' })
  role: typeof GRUPO_ROLE.ADMIN | typeof GRUPO_ROLE.MEMBER;
}
