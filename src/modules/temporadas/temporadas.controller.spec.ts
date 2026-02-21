import { Test, TestingModule } from '@nestjs/testing';
import { TemporadasController } from './temporadas.controller';
import { TemporadasService } from './temporadas.service';
import { PrismaService } from '../../prisma/prisma.service';
import { prismaMock } from '../../../test/mocks/prisma.mock';

describe('TemporadasController', () => {
  let controller: TemporadasController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TemporadasController],
      providers: [
        TemporadasService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    controller = module.get<TemporadasController>(TemporadasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
