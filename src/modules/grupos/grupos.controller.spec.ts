import { Test, TestingModule } from '@nestjs/testing';
import { GruposController } from './grupos.controller';
import { GruposService } from './grupos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { prismaMock } from '../../../test/mocks/prisma.mock';

describe('GruposController', () => {
  let controller: GruposController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GruposController],
      providers: [
        GruposService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    controller = module.get<GruposController>(GruposController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
