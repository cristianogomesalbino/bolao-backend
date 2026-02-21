import { Test, TestingModule } from '@nestjs/testing';
import { GruposService } from './grupos.service';
import { PrismaService } from '../../prisma/prisma.service';
import { prismaMock } from '../../../test/mocks/prisma.mock';

jest.mock('nanoid', () => ({
  nanoid: () => 'mocked-id',
}));

describe('GruposService', () => {
  let service: GruposService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GruposService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<GruposService>(GruposService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
