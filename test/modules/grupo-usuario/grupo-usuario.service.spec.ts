import { describe, it, expect, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import {
  CodigoConviteInvalidoError,
  GrupoInativoError,
  JaEstaNoGrupoError,
  LimiteParticipantesError,
  UnicoAdminError,
  ApenasCriadorPodePromoverError,
  MembroJaPossuiRoleError,
  NaoPodeRemoverCriadorError,
  NaoPodeAlterarRoleCriadorError,
  CriadorDeveTransferirError,
} from '@src/common/errors/domain-errors';
import { GrupoNaoEncontradoError } from '@src/common/errors/domain-errors/grupos.errors';
import { UsuarioNaoEncontradoError } from '@src/common/errors/domain-errors/usuarios.errors';
import { GrupoUsuarioService } from '@src/modules/grupo-usuario/grupo-usuario.service';
import { InMemoryGrupoUsuarioRepository } from '@src/modules/grupo-usuario/repositories/in-memory-grupo-usuario.repository';
import { InMemoryGrupoRepository } from '@src/modules/grupos/repositories/in-memory-grupo.repository';
import { InMemoryUsuarioRepository } from '@src/modules/usuarios/repositories/in-memory-usuario.repository';

describe('GrupoUsuarioService', () => {
  let service: GrupoUsuarioService;
  let grupoUsuarioRepo: InMemoryGrupoUsuarioRepository;
  let grupoRepo: InMemoryGrupoRepository;
  let usuarioRepo: InMemoryUsuarioRepository;

  const grupoId = 'grupo-1';
  const userId = 'user-1';
  const userId2 = 'user-2';

  const grupo = {
    id: grupoId,
    nome: 'Bolão da Galera',
    ativo: true,
    maxParticipantes: 50,
    codigoConvite: 'ABC12345',
    privado: true,
    temporadaId: 'temp-1',
    criadoPor: userId,
    permitirPalpiteAutomatico: false,
    dataCriacao: new Date(),
  };

  const usuario2 = {
    id: userId2,
    nome: 'Maria',
    email: 'maria@example.com',
    senha: 'hashed',
    perfil: 'USER',
    ativo: true,
    dataCriacao: new Date(),
    atualizadoEm: new Date(),
  };

  beforeEach(() => {
    grupoUsuarioRepo = new InMemoryGrupoUsuarioRepository();
    grupoRepo = new InMemoryGrupoRepository();
    usuarioRepo = new InMemoryUsuarioRepository();
    service = new GrupoUsuarioService(grupoUsuarioRepo, grupoRepo, usuarioRepo);
  });

  // ==================== entrarPorConvite ====================

  describe('entrarPorConvite', () => {
    it('deve adicionar usuário ao grupo com código válido', async () => {
      grupoRepo.items.push({ ...grupo });
      grupoUsuarioRepo.grupos.push({ ...grupo });

      const result = await service.entrarPorConvite('ABC12345', userId);

      expect(result.grupo.nome).toBe('Bolão da Galera');
      expect(result.role).toBe('MEMBER');
      expect(grupoUsuarioRepo.items).toHaveLength(1);
    });

    it('deve lançar CodigoConviteInvalidoError se código não existe', async () => {
      await expect(
        service.entrarPorConvite('INVALIDO', userId),
      ).rejects.toThrow(CodigoConviteInvalidoError);
    });

    it('deve lançar GrupoInativoError se grupo está inativo', async () => {
      grupoRepo.items.push({ ...grupo, ativo: false });

      await expect(
        service.entrarPorConvite('ABC12345', userId),
      ).rejects.toThrow(GrupoInativoError);
    });

    it('deve lançar JaEstaNoGrupoError se usuário já está no grupo', async () => {
      grupoRepo.items.push({ ...grupo });
      grupoUsuarioRepo.items.push({
        usuarioId: userId,
        grupoId,
        role: 'MEMBER',
        dataCriacao: new Date(),
      });

      await expect(
        service.entrarPorConvite('ABC12345', userId),
      ).rejects.toThrow(JaEstaNoGrupoError);
    });

    it('deve lançar LimiteParticipantesError se grupo atingiu limite', async () => {
      grupoRepo.items.push({ ...grupo, maxParticipantes: 2 });
      grupoUsuarioRepo.items.push(
        { usuarioId: 'u1', grupoId, role: 'ADMIN', dataCriacao: new Date() },
        { usuarioId: 'u2', grupoId, role: 'MEMBER', dataCriacao: new Date() },
      );

      await expect(
        service.entrarPorConvite('ABC12345', userId),
      ).rejects.toThrow(LimiteParticipantesError);
    });
  });

  // ==================== adicionarPorEmail ====================

  describe('adicionarPorEmail', () => {
    it('deve adicionar membro por email', async () => {
      grupoRepo.items.push({ ...grupo });
      usuarioRepo.items.push({ ...usuario2 });
      grupoUsuarioRepo.grupos.push({ ...grupo });
      grupoUsuarioRepo.usuarios.push({ ...usuario2 });

      const result = await service.adicionarPorEmail(
        grupoId,
        'maria@example.com',
      );

      expect(result.usuario.nome).toBe('Maria');
      expect(result.grupo.nome).toBe('Bolão da Galera');
      expect(grupoUsuarioRepo.items).toHaveLength(1);
    });

    it('deve lançar GrupoNaoEncontradoError se grupo não existe', async () => {
      await expect(
        service.adicionarPorEmail('inexistente', 'maria@example.com'),
      ).rejects.toThrow(GrupoNaoEncontradoError);
    });

    it('deve lançar GrupoInativoError se grupo está inativo', async () => {
      grupoRepo.items.push({ ...grupo, ativo: false });

      await expect(
        service.adicionarPorEmail(grupoId, 'maria@example.com'),
      ).rejects.toThrow(GrupoInativoError);
    });

    it('deve lançar UsuarioNaoEncontradoError se usuário não existe', async () => {
      grupoRepo.items.push({ ...grupo });

      await expect(
        service.adicionarPorEmail(grupoId, 'naoexiste@example.com'),
      ).rejects.toThrow(UsuarioNaoEncontradoError);
    });

    it('deve lançar JaEstaNoGrupoError se usuário já está no grupo', async () => {
      grupoRepo.items.push({ ...grupo });
      usuarioRepo.items.push({ ...usuario2 });
      grupoUsuarioRepo.items.push({
        usuarioId: userId2,
        grupoId,
        role: 'MEMBER',
        dataCriacao: new Date(),
      });

      await expect(
        service.adicionarPorEmail(grupoId, 'maria@example.com'),
      ).rejects.toThrow(JaEstaNoGrupoError);
    });
  });

  // ==================== listarMembros ====================

  describe('listarMembros', () => {
    it('deve retornar lista de membros do grupo', async () => {
      grupoRepo.items.push({ ...grupo });
      grupoUsuarioRepo.items.push(
        { usuarioId: userId, grupoId, role: 'ADMIN', dataCriacao: new Date() },
        {
          usuarioId: userId2,
          grupoId,
          role: 'MEMBER',
          dataCriacao: new Date(),
        },
      );
      grupoUsuarioRepo.usuarios.push(
        { id: userId, nome: 'João' },
        { id: userId2, nome: 'Maria' },
      );

      const result = await service.listarMembros(grupoId);

      expect(result).toHaveLength(2);
      expect(result[0].usuario.nome).toBe('João');
      expect(result[0].role).toBe('ADMIN');
    });

    it('deve lançar GrupoNaoEncontradoError se grupo não existe', async () => {
      await expect(service.listarMembros('inexistente')).rejects.toThrow(
        GrupoNaoEncontradoError,
      );
    });
  });

  // ==================== sair ====================

  describe('sair', () => {
    it('deve permitir MEMBER sair do grupo', async () => {
      grupoRepo.items.push({ ...grupo });
      grupoUsuarioRepo.items.push({
        usuarioId: userId2,
        grupoId,
        role: 'MEMBER',
        dataCriacao: new Date(),
      });

      const result = await service.sair(grupoId, userId2);

      expect(result.mensagem).toBe('Você saiu do grupo');
      expect(grupoUsuarioRepo.items).toHaveLength(0);
    });

    it('deve permitir ADMIN sair se houver outro admin e não é criador', async () => {
      grupoRepo.items.push({ ...grupo });
      grupoUsuarioRepo.items.push(
        { usuarioId: userId, grupoId, role: 'ADMIN', dataCriacao: new Date() },
        { usuarioId: userId2, grupoId, role: 'ADMIN', dataCriacao: new Date() },
      );

      const result = await service.sair(grupoId, userId2);

      expect(result.mensagem).toBe('Você saiu do grupo');
      expect(grupoUsuarioRepo.items).toHaveLength(1);
    });

    it('deve bloquear saída do único ADMIN', async () => {
      grupoRepo.items.push({ ...grupo, criadoPor: 'outro-user' });
      grupoUsuarioRepo.items.push({
        usuarioId: userId,
        grupoId,
        role: 'ADMIN',
        dataCriacao: new Date(),
      });

      await expect(service.sair(grupoId, userId)).rejects.toThrow(
        UnicoAdminError,
      );
    });

    it('deve bloquear saída do criador do grupo', async () => {
      grupoRepo.items.push({ ...grupo });
      grupoUsuarioRepo.items.push(
        { usuarioId: userId, grupoId, role: 'ADMIN', dataCriacao: new Date() },
        { usuarioId: userId2, grupoId, role: 'ADMIN', dataCriacao: new Date() },
      );

      await expect(service.sair(grupoId, userId)).rejects.toThrow(
        CriadorDeveTransferirError,
      );
    });

    it('deve lançar NotFoundException se não está no grupo', async () => {
      await expect(service.sair(grupoId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== removerMembro ====================

  describe('removerMembro', () => {
    it('deve remover membro do grupo', async () => {
      grupoRepo.items.push({ ...grupo });
      grupoUsuarioRepo.items.push({
        usuarioId: userId2,
        grupoId,
        role: 'MEMBER',
        dataCriacao: new Date(),
      });

      const result = await service.removerMembro(grupoId, userId2);

      expect(result.mensagem).toBe('Usuário removido do grupo');
      expect(grupoUsuarioRepo.items).toHaveLength(0);
    });

    it('deve lançar NaoPodeRemoverCriadorError ao tentar remover o criador', async () => {
      grupoRepo.items.push({ ...grupo });
      grupoUsuarioRepo.items.push({
        usuarioId: userId,
        grupoId,
        role: 'ADMIN',
        dataCriacao: new Date(),
      });

      await expect(service.removerMembro(grupoId, userId)).rejects.toThrow(
        NaoPodeRemoverCriadorError,
      );
    });

    it('deve lançar GrupoNaoEncontradoError se grupo não existe', async () => {
      await expect(
        service.removerMembro('inexistente', userId2),
      ).rejects.toThrow(GrupoNaoEncontradoError);
    });

    it('deve lançar NotFoundException se usuário não está no grupo', async () => {
      grupoRepo.items.push({ ...grupo });

      await expect(service.removerMembro(grupoId, 'user-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== alterarRole ====================

  describe('alterarRole', () => {
    beforeEach(() => {
      grupoRepo.items.push({ ...grupo });
      grupoUsuarioRepo.items.push(
        { usuarioId: userId, grupoId, role: 'ADMIN', dataCriacao: new Date() },
        {
          usuarioId: userId2,
          grupoId,
          role: 'MEMBER',
          dataCriacao: new Date(),
        },
      );
    });

    it('deve promover membro para ADMIN', async () => {
      const result = await service.alterarRole(
        grupoId,
        userId2,
        'ADMIN',
        userId,
      );

      expect(result.mensagem).toContain('alterado');
      const registro = grupoUsuarioRepo.items.find(
        (i) => i.usuarioId === userId2,
      );
      expect(registro.role).toBe('ADMIN');
    });

    it('deve rebaixar admin para MEMBER', async () => {
      grupoUsuarioRepo.items.find((i) => i.usuarioId === userId2)!.role =
        'ADMIN';

      const result = await service.alterarRole(
        grupoId,
        userId2,
        'MEMBER',
        userId,
      );

      expect(result.mensagem).toContain('alterado');
      const registro = grupoUsuarioRepo.items.find(
        (i) => i.usuarioId === userId2,
      );
      expect(registro.role).toBe('MEMBER');
    });

    it('deve transferir propriedade quando transferir=true e role=ADMIN', async () => {
      const result = await service.alterarRole(
        grupoId,
        userId2,
        'ADMIN',
        userId,
        true,
      );

      expect(result.mensagem).toContain('transferida');
      const grupoAtualizado = grupoRepo.items.find((g) => g.id === grupoId);
      expect(grupoAtualizado.criadoPor).toBe(userId2);
    });

    it('deve lançar ApenasCriadorPodePromoverError se solicitante não é criador', async () => {
      await expect(
        service.alterarRole(grupoId, userId, 'MEMBER', userId2),
      ).rejects.toThrow(ApenasCriadorPodePromoverError);
    });

    it('deve lançar NaoPodeAlterarRoleCriadorError ao tentar alterar role do criador', async () => {
      await expect(
        service.alterarRole(grupoId, userId, 'MEMBER', userId),
      ).rejects.toThrow(NaoPodeAlterarRoleCriadorError);
    });

    it('deve lançar MembroJaPossuiRoleError se membro já possui o role', async () => {
      await expect(
        service.alterarRole(grupoId, userId2, 'MEMBER', userId),
      ).rejects.toThrow(MembroJaPossuiRoleError);
    });

    it('deve lançar GrupoNaoEncontradoError se grupo não existe', async () => {
      await expect(
        service.alterarRole('inexistente', userId2, 'ADMIN', userId),
      ).rejects.toThrow(GrupoNaoEncontradoError);
    });

    it('deve lançar NotFoundException se usuário não está no grupo', async () => {
      await expect(
        service.alterarRole(grupoId, 'user-999', 'ADMIN', userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
