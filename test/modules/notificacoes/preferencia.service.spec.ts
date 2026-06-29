import { describe, it, expect, beforeEach } from 'vitest';
import { PreferenciaService } from '../../../src/modules/notificacoes/services/preferencia.service';
import { InMemoryPreferenciaRepository } from '../../../src/modules/notificacoes/repositories/in-memory-preferencia.repository';

describe('PreferenciaService', () => {
  let service: PreferenciaService;
  let repo: InMemoryPreferenciaRepository;

  beforeEach(() => {
    repo = new InMemoryPreferenciaRepository();
    service = new PreferenciaService(repo);
  });

  describe('buscar', () => {
    it('deve retornar preferências existentes', async () => {
      await repo.criar('user-1', { jogoProximo: false });

      const resultado = await service.buscar('user-1');

      expect(resultado.jogoProximo).toBe(false);
      expect(resultado.rodadaEncerrada).toBe(true);
    });

    it('deve criar preferências padrão se não existirem', async () => {
      const resultado = await service.buscar('user-1');

      expect(resultado.usuarioId).toBe('user-1');
      expect(resultado.jogoProximo).toBe(true);
      expect(resultado.acertoEmCheio).toBe(true);
      expect(resultado.palpitesPendentes).toBe(true);
    });
  });

  describe('atualizar', () => {
    it('deve atualizar parcialmente', async () => {
      await repo.criar('user-1');

      const resultado = await service.atualizar('user-1', {
        subiuPosicao: false,
        desceuPosicao: false,
      });

      expect(resultado.subiuPosicao).toBe(false);
      expect(resultado.desceuPosicao).toBe(false);
      expect(resultado.jogoProximo).toBe(true);
    });
  });

  describe('estaHabilitado', () => {
    it('deve retornar true se não há preferências (padrão)', async () => {
      const resultado = await service.estaHabilitado('user-1', 'JOGO_PROXIMO');
      expect(resultado).toBe(true);
    });

    it('deve retornar false se desabilitado', async () => {
      await repo.criar('user-1', { jogoProximo: false });

      const resultado = await service.estaHabilitado('user-1', 'JOGO_PROXIMO');
      expect(resultado).toBe(false);
    });

    it('deve retornar true para tipo desconhecido', async () => {
      const resultado = await service.estaHabilitado('user-1', 'TIPO_INVALIDO');
      expect(resultado).toBe(true);
    });
  });

  describe('filtrarUsuariosHabilitados', () => {
    it('deve filtrar usuários que desabilitaram o tipo', async () => {
      await repo.criar('user-1', { acertoEmCheio: false });
      await repo.criar('user-2', { acertoEmCheio: true });
      // user-3 sem preferência = habilitado por padrão

      const resultado = await service.filtrarUsuariosHabilitados(
        ['user-1', 'user-2', 'user-3'],
        'ACERTO_EM_CHEIO',
      );

      expect(resultado).toContain('user-2');
      expect(resultado).toContain('user-3');
      expect(resultado).not.toContain('user-1');
    });

    it('deve retornar todos para array vazio', async () => {
      const resultado = await service.filtrarUsuariosHabilitados([], 'JOGO_PROXIMO');
      expect(resultado).toEqual([]);
    });
  });
});
