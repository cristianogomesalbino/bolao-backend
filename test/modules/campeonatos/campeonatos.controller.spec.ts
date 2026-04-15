import { describe, it, expect, beforeEach } from 'vitest';
import { CampeonatosController } from '@src/modules/campeonatos/campeonatos.controller';
import { CampeonatosService } from '@src/modules/campeonatos/campeonatos.service';

const mockService = {} as CampeonatosService;

describe('CampeonatosController', () => {
  let controller: CampeonatosController;

  beforeEach(() => {
    controller = new CampeonatosController(mockService as any);
  });

  it('deve instanciar o controller', () => {
    expect(controller).toBeTruthy();
  });
});
