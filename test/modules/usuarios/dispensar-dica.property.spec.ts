import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { UsuariosService } from '@src/modules/usuarios/usuarios.service';
import { InMemoryUsuarioRepository } from '@src/modules/usuarios/repositories/in-memory-usuario.repository';
import { InMemoryGrupoUsuarioRepository } from '@src/modules/grupo-usuario/repositories/in-memory-grupo-usuario.repository';
import * as bcrypt from 'bcryptjs';

vi.mock('bcryptjs');

describe('UsuariosService — Property Test: Idempotência dispensarDica', () => {
  let service: UsuariosService;
  let usuarioRepo: InMemoryUsuarioRepository;
  let grupoUsuarioRepo: InMemoryGrupoUsuarioRepository;

  beforeEach(() => {
    usuarioRepo = new InMemoryUsuarioRepository();
    grupoUsuarioRepo = new InMemoryGrupoUsuarioRepository();
    service = new UsuariosService(usuarioRepo, grupoUsuarioRepo);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed' as never);
  });

  const dicaIdArb = fc.stringMatching(/^dica-[a-z]+-[a-z-]+$/);

  // Feature: hints-independentes, Property 6: Idempotência do backend
  it('Property 6: dispensarDica N vezes com mesmo id resulta em exatamente 1 ocorrência', async () => {
    const criado = await service.criar({
      nome: 'Teste',
      email: 'teste@test.com',
      senha: 's',
    });

    await fc.assert(
      fc.asyncProperty(
        dicaIdArb,
        fc.integer({ min: 2, max: 5 }),
        async (dicaId, vezes) => {
          // Reset: limpar dicasDispensadas do usuário
          await usuarioRepo.atualizar(criado.id, { dicasDispensadas: [] });

          for (let i = 0; i < vezes; i++) {
            await service.dispensarDica(criado.id, dicaId);
          }

          const usuario = usuarioRepo.items.find((u) => u.id === criado.id)!;
          const ocorrencias = usuario.dicasDispensadas.filter(
            (d) => d === dicaId,
          );
          expect(ocorrencias).toHaveLength(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property 6 complementar: dispensar múltiplos ids distintos preserva todos
  it('Property 6b: dispensar múltiplos ids distintos preserva todos sem perda', async () => {
    const criado = await service.criar({
      nome: 'Teste2',
      email: 'teste2@test.com',
      senha: 's',
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(dicaIdArb, { minLength: 1, maxLength: 8 }),
        async (dicaIds) => {
          await usuarioRepo.atualizar(criado.id, { dicasDispensadas: [] });

          const unicos = [...new Set(dicaIds)];

          for (const dicaId of unicos) {
            await service.dispensarDica(criado.id, dicaId);
          }

          const usuario = usuarioRepo.items.find((u) => u.id === criado.id)!;
          expect(usuario.dicasDispensadas).toHaveLength(unicos.length);

          for (const dicaId of unicos) {
            expect(usuario.dicasDispensadas).toContain(dicaId);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});
