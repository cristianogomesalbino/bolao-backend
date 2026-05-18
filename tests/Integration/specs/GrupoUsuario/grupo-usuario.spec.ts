import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('Grupo Membros Requests Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let temporadaId: string;
  let grupoId: string;
  let codigoConvite: string;

  const adminUser = API.factoryUsuario('user_to_manage_grupo_suite');
  const memberUser = API.factoryUsuario('user_member_grupo_suite');
  const addUser = API.factoryUsuario('user_to_add_grupo_suite');

  test.beforeAll(async ({ request }) => {
    await API.seedingForGrupoUsuarioSuite();
    temporadaId = await API.getGrupoUsuarioSuiteTemporadaId();

    // Cria grupo privado via API (precisa do usuário autenticado para ser admin)
    const grupoResponse = await API.GrupoRoute.postGrupo(request, adminUser, {
      nome: `Grupo Membros E2E ${Date.now()}`,
      temporadaId,
      privado: true,
    });
    const grupoBody = await grupoResponse.json();
    grupoId = grupoBody.id;
    codigoConvite = grupoBody.codigoConvite;
  });

  test('Caso 01 - Entrar no grupo por código de convite', async ({
    request,
  }) => {
    const response = await API.GrupoUsuarioRoute.postEntrarGrupo(
      request,
      memberUser,
      { codigoConvite },
    );
    const body = await response.json();

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar id e role MEMBER', async () => {
      expect(body).toHaveProperty('id');
      expect(body.role).toBe('MEMBER');
    });

    await test.step('Deve persistir membro no banco', async () => {
      const membro = await API.GrupoDB.selectMembroByGrupoAndUsuario(grupoId, memberUser.email);
      expect(membro).not.toBeNull();
      expect(membro!.role).toBe('MEMBER');
    });
  });

  test('Caso 02 - Entrar no grupo novamente deve retornar conflito', async ({
    request,
  }) => {
    const response = await API.GrupoUsuarioRoute.postEntrarGrupo(
      request,
      memberUser,
      { codigoConvite },
    );

    await test.step('Deve retornar 409 Conflict', async () => {
      expect(response.status()).toBe(API.HTTP_CONFLICT);
    });
  });

  test('Caso 03 - Adicionar membro por email (admin)', async ({ request }) => {
    const response = await API.GrupoUsuarioRoute.postAdicionarMembro(
      request,
      adminUser,
      grupoId,
      { email: addUser.email },
    );
    const body = await response.json();

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar id do membro', async () => {
      expect(body).toHaveProperty('id');
    });

    await test.step('Deve persistir membro adicionado no banco', async () => {
      const membro = await API.GrupoDB.selectMembroByGrupoAndUsuario(grupoId, addUser.email);
      expect(membro).not.toBeNull();
      expect(membro!.role).toBe('MEMBER');
    });
  });

  test('Caso 04 - Listar membros do grupo', async ({ request }) => {
    const response = await API.GrupoUsuarioRoute.getMembros(
      request,
      adminUser,
      grupoId,
    );
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar array com pelo menos 3 membros', async () => {
      expect(Array.isArray(body)).toBeTruthy();
      expect(body.length).toBeGreaterThanOrEqual(3);
    });

    await test.step('Quantidade deve bater com o banco', async () => {
      const count = await API.GrupoDB.selectMembrosCount(grupoId);
      expect(body.length).toBe(count);
    });
  });

  test('Caso 05 - Membro sai do grupo', async ({ request }) => {
    const response = await API.GrupoUsuarioRoute.deleteSairGrupo(
      request,
      addUser,
      grupoId,
    );
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar mensagem de confirmação', async () => {
      expect(body.mensagem).toContain('saiu');
    });

    await test.step('Membro não deve mais existir no banco', async () => {
      const membro = await API.GrupoDB.selectMembroByGrupoAndUsuario(grupoId, addUser.email);
      expect(membro).toBeNull();
    });
  });

  test('Caso 06 - Entrar com código de convite inválido deve falhar', async ({
    request,
  }) => {
    const novoUser = API.factoryUsuario('user_to_manage_campeonato_suite');
    await API.UsuarioDB.createUsuario(novoUser);

    const response = await API.GrupoUsuarioRoute.postEntrarGrupo(
      request,
      novoUser,
      { codigoConvite: 'INVALIDO' },
    );

    await test.step('Deve retornar 404 Not Found', async () => {
      expect(response.status()).toBe(API.HTTP_NOT_FOUND);
    });
  });
});
