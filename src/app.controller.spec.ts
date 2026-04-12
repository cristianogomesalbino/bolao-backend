import { describe, it, expect, beforeEach } from 'vitest';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    appController = new AppController();
  });

  describe('health', () => {
    it('should return status ok', () => {
      expect(appController.health()).toEqual({ status: 'ok' });
    });
  });
});
