import { Test, TestingModule } from '@nestjs/testing';
import { TemporadasController } from './temporadas.controller';
import { TemporadasService } from './temporadas.service';

describe('TemporadasController', () => {
  let controller: TemporadasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemporadasController],
      providers: [TemporadasService],
    }).compile();

    controller = module.get<TemporadasController>(TemporadasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
