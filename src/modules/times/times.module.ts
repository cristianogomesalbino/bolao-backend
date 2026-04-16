import { Module } from '@nestjs/common';
import { TIMES } from './time.constants';
import { PrismaTimeRepository } from './repositories/prisma-time.repository';

@Module({
  providers: [
    {
      provide: TIMES.REPOSITORY_TOKEN,
      useClass: PrismaTimeRepository,
    },
  ],
  exports: [TIMES.REPOSITORY_TOKEN],
})
export class TimesModule {}
