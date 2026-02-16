import { Test, TestingModule } from '@nestjs/testing';
import { CampeonatosController } from './campeonatos.controller';
import { CampeonatosService } from './campeonatos.service';

describe('CampeonatosController', () => {
  let controller: CampeonatosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampeonatosController],
      providers: [CampeonatosService],
    }).compile();

    controller = module.get<CampeonatosController>(CampeonatosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
