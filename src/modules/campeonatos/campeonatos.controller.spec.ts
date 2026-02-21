import { Test, TestingModule } from '@nestjs/testing';
import { CampeonatosController } from './campeonatos.controller';
import { CampeonatosService } from './campeonatos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { prismaMock } from '../../../test/mocks/prisma.mock';

describe('CampeonatosController', () => {
  let controller: CampeonatosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampeonatosController],
      providers: [
        CampeonatosService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    controller = module.get<CampeonatosController>(CampeonatosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
