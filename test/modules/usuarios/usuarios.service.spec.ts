import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsuariosService } from '@src/modules/usuarios/usuarios.service';
import {
  EmailJaCadastradoError,
  UsuarioNaoEncontradoError,
} from '@src/common/errors/domain-errors';
import { AUTH } from '@src/modules/auth/auth.constants';
import * as bcrypt from 'bcryptjs';
import { InMemoryUsuarioRepository } from '@src/modules/usuarios/repositories/in-memory-usuario.repository';
import { InMemoryGrupoUsuarioRepository } from '@src/modules/grupo-usuario/repositories/in-memory-grupo-usuario.repository';
import { BadRequestException } from '@nestjs/common';

vi.mock('bcryptjs');

describe('UsuariosService', () => {
  let service: UsuariosService;
  let usuarioRepo: InMemoryUsuarioRepository;
  let grupoUsuarioRepo: InMemoryGrupoUsuarioRepository;

  beforeEach(() => {
    usuarioRepo = new InMemoryUsuarioRepository();
    grupoUsuarioRepo = new InMemoryGrupoUsuarioRepository();
    service = new UsuariosService(usuarioRepo, grupoUsuarioRepo);
    vi.clearAllMocks();
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
  });

  // ==================== criar ====================

  describe('criar', () => {
    it('deve criar usuário com sucesso', async () => {
      const result = await service.criar({
        nome: 'João Silva',
        email: 'joao@example.com',
        senha: 'senha123',
      });

      expect(result.nome).toBe('João Silva');
      expect(result.email).toBe('joao@example.com');
      expect(result.senha).toBe('hashed');
      expect(result.id).toBeDefined();
      expect(usuarioRepo.items).toHaveLength(1);
    });

    it('deve lançar EmailJaCadastradoError se email já existe', async () => {
      await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 'senha123',
      });

      await expect(
        service.criar({
          nome: 'Outro João',
          email: 'joao@example.com',
          senha: 'senha456',
        }),
      ).rejects.toThrow(EmailJaCadastradoError);
    });
  });

  // ==================== listar ====================

  describe('listar', () => {
    it('deve retornar lista de usuários ativos', async () => {
      await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });
      await service.criar({
        nome: 'Maria',
        email: 'maria@example.com',
        senha: 's',
      });

      const result = await service.listar();

      expect(result).toHaveLength(2);
      expect(result[0].nome).toBe('João');
      expect(result[1].nome).toBe('Maria');
    });
  });

  // ==================== buscarPorId ====================

  describe('buscarPorId', () => {
    it('deve retornar usuário por ID', async () => {
      const criado = await service.criar({
        nome: 'João Silva',
        email: 'joao@example.com',
        senha: 'senha123',
      });

      const result = await service.buscarPorId(criado.id);

      expect(result.id).toBe(criado.id);
      expect(result.nome).toBe('João Silva');
    });

    it('deve lançar UsuarioNaoEncontradoError se usuário não existe', async () => {
      await expect(service.buscarPorId('inexistente')).rejects.toThrow(
        UsuarioNaoEncontradoError,
      );
    });

    it('deve lançar UsuarioNaoEncontradoError se usuário está inativo', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });
      await usuarioRepo.desativar(criado.id);

      await expect(service.buscarPorId(criado.id)).rejects.toThrow(
        UsuarioNaoEncontradoError,
      );
    });
  });

  // ==================== atualizar ====================

  describe('atualizar', () => {
    it('deve atualizar nome do usuário', async () => {
      const criado = await service.criar({
        nome: 'João Silva',
        email: 'joao@example.com',
        senha: 'senha123',
      });

      const result = await service.atualizar(criado.id, {
        nome: 'João Atualizado',
      });

      expect(result.nome).toBe('João Atualizado');
    });

    it('deve fazer hash da senha ao atualizar', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 'senha123',
      });
      vi.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);

      await service.atualizar(criado.id, { senha: 'novasenha' });

      expect(bcrypt.hash).toHaveBeenCalledWith('novasenha', AUTH.BCRYPT_ROUNDS);
      const atualizado = usuarioRepo.items.find((u) => u.id === criado.id)!;
      expect(atualizado.senha).toBe('new-hash');
    });

    it('deve lançar UsuarioNaoEncontradoError se usuário não existe', async () => {
      await expect(
        service.atualizar('inexistente', { nome: 'Teste' }),
      ).rejects.toThrow(UsuarioNaoEncontradoError);
    });

    it('deve lançar UsuarioNaoEncontradoError se usuário está inativo', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });
      await usuarioRepo.desativar(criado.id);

      await expect(
        service.atualizar(criado.id, { nome: 'Teste' }),
      ).rejects.toThrow(UsuarioNaoEncontradoError);
    });
  });

  // ==================== remover ====================

  describe('remover', () => {
    it('deve desativar usuário ativo', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });

      const result = await service.remover(criado.id);

      expect(result.mensagem).toBe('Usuário desativado com sucesso');
      const usuario = usuarioRepo.items.find((u) => u.id === criado.id)!;
      expect(usuario.ativo).toBe(false);
    });

    it('deve retornar mensagem se já está inativo', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });
      await usuarioRepo.desativar(criado.id);

      const result = await service.remover(criado.id);

      expect(result.mensagem).toBe('Usuário já está inativo');
    });

    it('deve lançar UsuarioNaoEncontradoError se usuário não existe', async () => {
      await expect(service.remover('inexistente')).rejects.toThrow(
        UsuarioNaoEncontradoError,
      );
    });
  });

  // ==================== buscarPorEmail ====================

  describe('buscarPorEmail', () => {
    it('deve retornar usuário pelo email', async () => {
      await service.criar({
        nome: 'João Silva',
        email: 'joao@example.com',
        senha: 'senha123',
      });

      const result = await service.buscarPorEmail('joao@example.com');

      expect(result).not.toBeNull();
      expect(result!.nome).toBe('João Silva');
    });

    it('deve retornar null se email não existe', async () => {
      const result = await service.buscarPorEmail('naoexiste@example.com');

      expect(result).toBeNull();
    });
  });

  // ==================== definirGrupoFavorito ====================

  describe('definirGrupoFavorito', () => {
    it('deve definir grupo favorito com sucesso', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });
      grupoUsuarioRepo.items.push({
        usuarioId: criado.id,
        grupoId: 'grupo-1',
        role: 'MEMBER',
      });

      const result = await service.definirGrupoFavorito(criado.id, 'grupo-1');

      expect(result.grupoFavoritoId).toBe('grupo-1');
    });

    it('deve remover grupo favorito quando grupoId é null', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });
      await usuarioRepo.atualizar(criado.id, { grupoFavoritoId: 'grupo-1' });

      const result = await service.definirGrupoFavorito(criado.id, null);

      expect(result.grupoFavoritoId).toBeNull();
    });

    it('deve lançar erro quando usuário não pertence ao grupo', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });

      await expect(
        service.definirGrupoFavorito(criado.id, 'grupo-inexistente'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar UsuarioNaoEncontradoError se usuário não existe', async () => {
      await expect(
        service.definirGrupoFavorito('inexistente', 'grupo-1'),
      ).rejects.toThrow(UsuarioNaoEncontradoError);
    });

    it('deve lançar UsuarioNaoEncontradoError se usuário está inativo', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });
      await usuarioRepo.desativar(criado.id);

      await expect(
        service.definirGrupoFavorito(criado.id, 'grupo-1'),
      ).rejects.toThrow(UsuarioNaoEncontradoError);
    });
  });

  // ==================== dispensarDica ====================

  describe('dispensarDica', () => {
    it('deve adicionar dicaId ao array de dicasDispensadas', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });

      await service.dispensarDica(criado.id, 'dica-palpites-primeiro-card');

      const usuario = usuarioRepo.items.find((u) => u.id === criado.id)!;
      expect(usuario.dicasDispensadas).toContain('dica-palpites-primeiro-card');
    });

    it('deve ser idempotente — não duplicar dicaId já presente', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });

      await service.dispensarDica(criado.id, 'dica-palpites-primeiro-card');
      await service.dispensarDica(criado.id, 'dica-palpites-primeiro-card');

      const usuario = usuarioRepo.items.find((u) => u.id === criado.id)!;
      const ocorrencias = usuario.dicasDispensadas.filter(
        (h: string) => h === 'dica-palpites-primeiro-card',
      );
      expect(ocorrencias).toHaveLength(1);
    });

    it('deve preservar hints anteriores ao adicionar novo', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });

      await service.dispensarDica(criado.id, 'dica-palpites-primeiro-card');
      await service.dispensarDica(criado.id, 'dica-grupo-convite');

      const usuario = usuarioRepo.items.find((u) => u.id === criado.id)!;
      expect(usuario.dicasDispensadas).toContain('dica-palpites-primeiro-card');
      expect(usuario.dicasDispensadas).toContain('dica-grupo-convite');
      expect(usuario.dicasDispensadas).toHaveLength(2);
    });

    it('deve lançar UsuarioNaoEncontradoError se usuário não existe', async () => {
      await expect(
        service.dispensarDica('inexistente', 'dica-qualquer'),
      ).rejects.toThrow(UsuarioNaoEncontradoError);
    });

    it('deve lançar UsuarioNaoEncontradoError se usuário está inativo', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });
      await usuarioRepo.desativar(criado.id);

      await expect(
        service.dispensarDica(criado.id, 'dica-qualquer'),
      ).rejects.toThrow(UsuarioNaoEncontradoError);
    });
  });

  // ==================== resetarDicas ====================

  describe('resetarDicas', () => {
    it('deve limpar array de dicasDispensadas', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });

      await service.dispensarDica(criado.id, 'dica-palpites-primeiro-card');
      await service.dispensarDica(criado.id, 'dica-grupo-convite');
      await service.resetarDicas(criado.id);

      const usuario = usuarioRepo.items.find((u) => u.id === criado.id)!;
      expect(usuario.dicasDispensadas).toHaveLength(0);
    });

    it('deve resetar toastDescobrilidadeVisto para false', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });
      await usuarioRepo.atualizar(criado.id, {
        toastDescobrilidadeVisto: true,
      });

      await service.resetarDicas(criado.id);

      const usuario = usuarioRepo.items.find((u) => u.id === criado.id)!;
      expect(usuario.toastDescobrilidadeVisto).toBe(false);
    });

    it('deve funcionar quando array já está vazio (idempotente)', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });

      await service.resetarDicas(criado.id);

      const usuario = usuarioRepo.items.find((u) => u.id === criado.id)!;
      expect(usuario.dicasDispensadas).toHaveLength(0);
    });

    it('deve lançar UsuarioNaoEncontradoError se usuário não existe', async () => {
      await expect(service.resetarDicas('inexistente')).rejects.toThrow(
        UsuarioNaoEncontradoError,
      );
    });

    it('deve lançar UsuarioNaoEncontradoError se usuário está inativo', async () => {
      const criado = await service.criar({
        nome: 'João',
        email: 'joao@example.com',
        senha: 's',
      });
      await usuarioRepo.desativar(criado.id);

      await expect(service.resetarDicas(criado.id)).rejects.toThrow(
        UsuarioNaoEncontradoError,
      );
    });
  });
});
