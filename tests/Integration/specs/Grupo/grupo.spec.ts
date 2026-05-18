import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('Grupos Requests Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let temporadaId: string;
  let grupoId: string;

  const adminUser = API.factoryUsuario('user_to_manage_grupo_suite');

  test.beforeAll(async () => {
    await API.seedingForGrupoSuite();
    temporadaId = await API.getGrupoSuiteTemporadaId();
  });

  test('Caso 01 - Criar grupo privado', async ({ request }) => {
    const payload = {
      nome: `Grupo Privado E2E ${Date.now()}`,
      temporadaId,
      privado: true,
    };

    const response = await API.GrupoRoute.postGrupo(request, adminUser, payload);
    const body = await response.json();

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar id e codigoConvite', async () => {
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('codigoConvite');
    });

    await test.step('Deve ser privado', async () => {
      expect(body.privado).toBe(true);
    });

    grupoId = body.id;

    await test.step('Deve persistir corretamente no banco', async () => {
      const grupoDB = await API.GrupoDB.selectGrupoById(grupoId);
      expect(grupoDB).not.toBeNull();
      expect(grupoDB!.nome).toBe(payload.nome);
      expect(grupoDB!.privado).toBe(true);
      expect(grupoDB!.ativo).toBe(true);
      expect(grupoDB!.codigoConvite).toBe(body.codigoConvite);
    });
  });

  test('Caso 02 - Criar grupo público', async ({ request }) => {
    const payload = {
      nome: `Grupo Público E2E ${Date.now()}`,
      temporadaId,
      privado: false,
    };

    const response = await API.GrupoRoute.postGrupo(request, adminUser, payload);
    const body = await response.json();

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve ser público', async () => {
      expect(body.privado).toBe(false);
    });

    await test.step('Deve persistir como público no banco', async () => {
      const grupoDB = await API.GrupoDB.selectGrupoById(body.id);
      expect(grupoDB!.privado).toBe(false);
    });
  });

  test('Caso 03 - Listar grupos ativos', async ({ request }) => {
    const response = await API.GrupoRoute.getGrupos(request, adminUser);
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar um array', async () => {
      expect(Array.isArray(body)).toBeTruthy();
    });
  });

  test('Caso 04 - Buscar grupo por ID', async ({ request }) => {
    const response = await API.GrupoRoute.getGrupoById(request, adminUser, grupoId);
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar o grupo correto', async () => {
      expect(body.id).toBe(grupoId);
    });

    await test.step('Resposta deve bater com o banco', async () => {
      const grupoDB = await API.GrupoDB.selectGrupoById(grupoId);
      expect(body.nome).toBe(grupoDB!.nome);
      expect(body.privado).toBe(grupoDB!.privado);
      expect(body.ativo).toBe(grupoDB!.ativo);
    });
  });

  test('Caso 05 - Atualizar grupo (admin do grupo)', async ({ request }) => {
    const novoNome = `Grupo Atualizado E2E ${Date.now()}`;
    const response = await API.GrupoRoute.patchGrupo(
      request,
      adminUser,
      grupoId,
      { nome: novoNome },
    );
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar nome atualizado', async () => {
      expect(body.nome).toBe(novoNome);
    });

    await test.step('Deve persistir o novo nome no banco', async () => {
      const grupoDB = await API.GrupoDB.selectGrupoById(grupoId);
      expect(grupoDB!.nome).toBe(novoNome);
    });
  });

  test('Caso 06 - Desativar grupo', async ({ request }) => {
    const response = await API.GrupoRoute.patchGrupoStatus(
      request,
      adminUser,
      grupoId,
      { ativo: false },
    );
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve estar inativo', async () => {
      expect(body.ativo).toBe(false);
    });

    await test.step('Deve persistir status inativo no banco', async () => {
      const grupoDB = await API.GrupoDB.selectGrupoById(grupoId);
      expect(grupoDB!.ativo).toBe(false);
    });
  });

  test('Caso 07 - Reativar grupo', async ({ request }) => {
    const response = await API.GrupoRoute.patchGrupoStatus(
      request,
      adminUser,
      grupoId,
      { ativo: true },
    );
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve estar ativo', async () => {
      expect(body.ativo).toBe(true);
    });

    await test.step('Deve persistir status ativo no banco', async () => {
      const grupoDB = await API.GrupoDB.selectGrupoById(grupoId);
      expect(grupoDB!.ativo).toBe(true);
    });
  });

  test('Caso 08 - Excluir grupo ativo deve falhar', async ({ request }) => {
    const response = await API.GrupoRoute.deleteGrupo(request, adminUser, grupoId);

    await test.step('Deve retornar 400 Bad Request', async () => {
      expect(response.status()).toBe(API.HTTP_BAD_REQUEST);
    });

    await test.step('Grupo deve continuar existindo no banco', async () => {
      const grupoDB = await API.GrupoDB.selectGrupoById(grupoId);
      expect(grupoDB).not.toBeNull();
    });
  });
});
