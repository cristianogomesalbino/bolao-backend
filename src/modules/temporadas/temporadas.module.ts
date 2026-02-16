import { Module } from '@nestjs/common';
import { TemporadasService } from './temporadas.service';
import { TemporadasController } from './temporadas.controller';

@Module({
  controllers: [TemporadasController],
  providers: [TemporadasService],
})
export class TemporadasModule {}
