import { Test, TestingModule } from '@nestjs/testing';
import { TemporadasService } from './temporadas.service';
import { PrismaService } from '../../prisma/prisma.service';
import { prismaMock } from '../../../test/mocks/prisma.mock';

describe('TemporadasService', () => {
  let service: TemporadasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemporadasService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<TemporadasService>(TemporadasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
