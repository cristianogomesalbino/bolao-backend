import { SetMetadata } from '@nestjs/common';

export const GroupRoles = (...roles: string[]) =>
  SetMetadata('groupRoles', roles);