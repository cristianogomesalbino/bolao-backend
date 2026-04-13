import { describe, it, expect, beforeEach } from 'vitest';
import { TemporadasController } from './temporadas.controller';
import { TemporadasService } from './temporadas.service';

const mockService = {} as TemporadasService;

describe('TemporadasController', () => {
  let controller: TemporadasController;

  beforeEach(() => {
    controller = new TemporadasController(mockService as any);
  });

  it('deve instanciar o controller', () => {
    expect(controller).toBeTruthy();
  });
});
