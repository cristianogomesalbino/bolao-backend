import { Test, TestingModule } from '@nestjs/testing';
import { CampeonatosService } from './campeonatos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { prismaMock } from '../../../test/mocks/prisma.mock';

describe('CampeonatosService', () => {
  let service: CampeonatosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampeonatosService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CampeonatosService>(CampeonatosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
