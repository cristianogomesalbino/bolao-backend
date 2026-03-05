import { SetMetadata } from '@nestjs/common';

export const GROUP_ROLES_KEY = 'groupRoles';

export const GroupRoles = (...roles: string[]) =>
  SetMetadata(GROUP_ROLES_KEY, roles);