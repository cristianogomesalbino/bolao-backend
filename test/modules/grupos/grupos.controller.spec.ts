import { describe, it, expect, beforeEach } from 'vitest';
import { GruposController } from '@src/modules/grupos/grupos.controller';
import { GruposService } from '@src/modules/grupos/grupos.service';

const mockService = {} as GruposService;

describe('GruposController', () => {
  let controller: GruposController;

  beforeEach(() => {
    controller = new GruposController(mockService as any);
  });

  it('deve instanciar o controller', () => {
    expect(controller).toBeTruthy();
  });
});
