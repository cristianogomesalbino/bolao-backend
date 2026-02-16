import { Test, TestingModule } from '@nestjs/testing';
import { TemporadasService } from './temporadas.service';

describe('TemporadasService', () => {
  let service: TemporadasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemporadasService],
    }).compile();

    service = module.get<TemporadasService>(TemporadasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
