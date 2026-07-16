import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  TemporadaNaoEncontradaError,
  GrupoNaoEncontradoError,
  DesativeAntesDeExcluirError,
} from '@src/common/errors/domain-errors';
import { GruposService } from '@src/modules/grupos/grupos.service';
import { InMemoryGrupoRepository } from '@src/modules/grupos/repositories/in-memory-grupo.repository';
import { InMemoryTemporadaRepository } from '@src/modules/temporadas/repositories/in-memory-temporada.repository';
import { InMemoryGrupoUsuarioRepository } from '@src/modules/grupo-usuario/repositories/in-memory-grupo-usuario.repository';

vi.mock('nanoid', () => ({
  nanoid: () => 'ABCD1234',
}));

describe('GruposService', () => {
  let service: GruposService;
  let grupoRepo: InMemoryGrupoRepository;
  let temporadaRepo: InMemoryTemporadaRepository;
  let grupoUsuarioRepo: InMemoryGrupoUsuarioRepository;

  const campeonato = {
    id: 'camp-1',
    nome: 'Brasileirão',
    dataCriacao: new Date(),
    atualizadoEm: new Date(),
  };
  const temporada = {
    id: 'temp-1',
    ano: 2026,
    campeonatoId: 'camp-1',
    dataCriacao: new Date(),
  };

  beforeEach(() => {
    grupoRepo = new InMemoryGrupoRepository();
    temporadaRepo = new InMemoryTemporadaRepository();
    grupoUsuarioRepo = new InMemoryGrupoUsuarioRepository();

    // Sincronizar grupoUsuarios entre os repos para filtros de membro
    grupoRepo.grupoUsuarios = grupoUsuarioRepo.items;

    grupoRepo.temporadas = [{ ...temporada, campeonato }];
    temporadaRepo.items = [{ ...temporada }];

    service = new GruposService(grupoRepo, temporadaRepo, grupoUsuarioRepo);
  });

  // ==================== criar ====================

  describe('criar', () => {
    it('deve criar grupo privado com código de convite', async () => {
      const result = await service.criar(
        { nome: 'Bolão da Galera', temporadaId: 'temp-1', privado: true },
        'user-1',
      );

      expect(result.nome).toBe('Bolão da Galera');
      expect(result.codigoConvite).toBe('ABCD1234');
      expect(result.privado).toBe(true);
      expect(result.temporada).toBeDefined();
      expect(result.temporada.campeonato.nome).toBe('Brasileirão');
      expect(grupoRepo.items).toHaveLength(1);
      expect(grupoUsuarioRepo.items).toHaveLength(1);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(grupoUsuarioRepo.items[0].role).toBe('ADMIN');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(grupoUsuarioRepo.items[0].usuarioId).toBe('user-1');
    });

    it('deve criar grupo público com código de convite', async () => {
      const result = await service.criar(
        { nome: 'Bolão Público', temporadaId: 'temp-1', privado: false },
        'user-1',
      );

      expect(result.codigoConvite).toBeDefined();
      expect(result.codigoConvite).toHaveLength(8);
      expect(result.privado).toBe(false);
    });

    it('deve lançar TemporadaNaoEncontradaError se temporada não existe', async () => {
      await expect(
        service.criar(
          { nome: 'Teste', temporadaId: 'inexistente', privado: true },
          'user-1',
        ),
      ).rejects.toThrow(TemporadaNaoEncontradaError);
    });
  });

  // ==================== buscarTodos ====================

  describe('buscarTodos', () => {
    it('deve retornar apenas grupos ativos do membro por padrão', async () => {
      await service.criar(
        { nome: 'Grupo Ativo', temporadaId: 'temp-1', privado: false },
        'user-1',
      );

      // Add an inactive grupo directly
      grupoRepo.items.push({
        id: 'inativo-1',
        nome: 'Grupo Inativo',
        temporadaId: 'temp-1',
        privado: false,
        codigoConvite: null,
        permitirPalpiteAutomatico: false,
        maxParticipantes: 50,
        criadoPor: 'user-1',
        ativo: false,
        dataCriacao: new Date(),
      });

      const result = await service.buscarTodos(undefined, 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].nome).toBe('Grupo Ativo');
    });

    it('deve filtrar por membro=true retornando apenas grupos do usuário', async () => {
      await service.criar(
        { nome: 'Meu Grupo', temporadaId: 'temp-1', privado: false },
        'user-1',
      );

      // Grupo de outro usuário
      grupoRepo.items.push({
        id: 'outro-grupo',
        nome: 'Grupo Alheio',
        temporadaId: 'temp-1',
        privado: false,
        codigoConvite: null,
        permitirPalpiteAutomatico: false,
        maxParticipantes: 50,
        criadoPor: 'user-2',
        ativo: true,
        dataCriacao: new Date(),
      });

      const result = await service.buscarTodos({ membro: true }, 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].nome).toBe('Meu Grupo');
    });

    it('deve filtrar por privado=false retornando apenas grupos públicos', async () => {
      await service.criar(
        { nome: 'Grupo Público', temporadaId: 'temp-1', privado: false },
        'user-1',
      );
      await service.criar(
        { nome: 'Grupo Privado', temporadaId: 'temp-1', privado: true },
        'user-1',
      );

      const result = await service.buscarTodos({ privado: false }, 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].nome).toBe('Grupo Público');
    });

    it('deve filtrar por busca (case-insensitive)', async () => {
      await service.criar(
        { nome: 'Bolão da Galera', temporadaId: 'temp-1', privado: false },
        'user-1',
      );
      await service.criar(
        { nome: 'Campeonato Top', temporadaId: 'temp-1', privado: false },
        'user-1',
      );

      const result = await service.buscarTodos({ busca: 'bolao' }, 'user-1');

      expect(result).toHaveLength(1);
      expect(result[0].nome).toBe('Bolão da Galera');
    });

    it('deve combinar filtros membro + privado + busca', async () => {
      await service.criar(
        { nome: 'Bolão Público', temporadaId: 'temp-1', privado: false },
        'user-1',
      );
      await service.criar(
        { nome: 'Bolão Privado', temporadaId: 'temp-1', privado: true },
        'user-1',
      );

      const result = await service.buscarTodos(
        { membro: true, privado: false, busca: 'bolão' },
        'user-1',
      );

      expect(result).toHaveLength(1);
      expect(result[0].nome).toBe('Bolão Público');
    });
  });

  // ==================== buscarPorId ====================

  describe('buscarPorId', () => {
    it('deve retornar grupo por ID com ehMembro=true quando é membro', async () => {
      const created = await service.criar(
        { nome: 'Bolão da Galera', temporadaId: 'temp-1', privado: true },
        'user-1',
      );

      const result = await service.buscarPorId(created.id, 'user-1');

      expect(result.nome).toBe('Bolão da Galera');
      expect(result.ehMembro).toBe(true);
    });

    it('deve retornar grupo por ID com ehMembro=false quando não é membro', async () => {
      const created = await service.criar(
        { nome: 'Bolão da Galera', temporadaId: 'temp-1', privado: true },
        'user-1',
      );

      const result = await service.buscarPorId(created.id, 'user-outro');

      expect(result.nome).toBe('Bolão da Galera');
      expect(result.ehMembro).toBe(false);
    });

    it('deve lançar GrupoNaoEncontradoError se grupo não existe', async () => {
      await expect(
        service.buscarPorId('inexistente', 'user-1'),
      ).rejects.toThrow(GrupoNaoEncontradoError);
    });

    it('deve lançar GrupoNaoEncontradoError se grupo está inativo', async () => {
      const created = await service.criar(
        { nome: 'Grupo', temporadaId: 'temp-1', privado: false },
        'user-1',
      );
      await grupoRepo.atualizar(created.id, { ativo: false });

      await expect(service.buscarPorId(created.id, 'user-1')).rejects.toThrow(
        GrupoNaoEncontradoError,
      );
    });
  });

  // ==================== atualizar ====================

  describe('atualizar', () => {
    it('deve atualizar nome do grupo', async () => {
      const created = await service.criar(
        { nome: 'Bolão da Galera', temporadaId: 'temp-1', privado: true },
        'user-1',
      );

      const result = await service.atualizar(created.id, { nome: 'Novo Nome' });

      expect(result.nome).toBe('Novo Nome');
    });

    it('deve lançar GrupoNaoEncontradoError se grupo não existe', async () => {
      await expect(
        service.atualizar('inexistente', { nome: 'Teste' }),
      ).rejects.toThrow(GrupoNaoEncontradoError);
    });

    it('deve lançar GrupoNaoEncontradoError se grupo está inativo', async () => {
      const created = await service.criar(
        { nome: 'Grupo', temporadaId: 'temp-1', privado: false },
        'user-1',
      );
      await grupoRepo.atualizar(created.id, { ativo: false });

      await expect(
        service.atualizar(created.id, { nome: 'Teste' }),
      ).rejects.toThrow(GrupoNaoEncontradoError);
    });
  });

  // ==================== atualizarStatus ====================

  describe('atualizarStatus', () => {
    it('deve desativar grupo', async () => {
      const created = await service.criar(
        { nome: 'Grupo', temporadaId: 'temp-1', privado: false },
        'user-1',
      );

      const result = await service.atualizarStatus(created.id, {
        ativo: false,
      });

      expect(result.ativo).toBe(false);
    });

    it('deve lançar GrupoNaoEncontradoError se grupo não existe', async () => {
      await expect(
        service.atualizarStatus('inexistente', { ativo: false }),
      ).rejects.toThrow(GrupoNaoEncontradoError);
    });
  });

  // ==================== remover ====================

  describe('remover', () => {
    it('deve excluir grupo inativo', async () => {
      const created = await service.criar(
        { nome: 'Grupo', temporadaId: 'temp-1', privado: false },
        'user-1',
      );
      await grupoRepo.atualizar(created.id, { ativo: false });

      const result = await service.remover(created.id);

      expect(result.mensagem).toBe('Grupo excluído com sucesso.');
      expect(grupoRepo.items).toHaveLength(0);
    });

    it('deve lançar DesativeAntesDeExcluirError se grupo está ativo', async () => {
      const created = await service.criar(
        { nome: 'Grupo', temporadaId: 'temp-1', privado: false },
        'user-1',
      );

      await expect(service.remover(created.id)).rejects.toThrow(
        DesativeAntesDeExcluirError,
      );
    });

    it('deve lançar GrupoNaoEncontradoError se grupo não existe', async () => {
      await expect(service.remover('inexistente')).rejects.toThrow(
        GrupoNaoEncontradoError,
      );
    });
  });

  // ==================== regenerarCodigoConvite ====================

  describe('regenerarCodigoConvite', () => {
    it('deve gerar novo código de convite', async () => {
      const created = await service.criar(
        { nome: 'Bolão', temporadaId: 'temp-1', privado: true },
        'user-1',
      );

      const result = await service.regenerarCodigoConvite(created.id);

      expect(result.codigoConvite).toBe('ABCD1234');
    });

    it('deve lançar GrupoNaoEncontradoError se grupo não existe', async () => {
      await expect(
        service.regenerarCodigoConvite('inexistente'),
      ).rejects.toThrow(GrupoNaoEncontradoError);
    });

    it('deve lançar GrupoNaoEncontradoError se grupo está inativo', async () => {
      const created = await service.criar(
        { nome: 'Grupo', temporadaId: 'temp-1', privado: true },
        'user-1',
      );
      await grupoRepo.atualizar(created.id, { ativo: false });

      await expect(service.regenerarCodigoConvite(created.id)).rejects.toThrow(
        GrupoNaoEncontradoError,
      );
    });
  });
});
