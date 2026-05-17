import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('Grupos Requests Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let campeonatoId: string;
  let temporadaId: string;
  let grupoId: string;

  const adminUser = API.factoryUsuario('user_to_manage_grupo_suite');

  test.beforeAll(async () => {
    await API.seedingForGrupoSuite();
  });

  test('Caso 01 - Setup: Criar campeonato e temporada para grupo', async ({
    request,
  }) => {
    // Criar campeonato
    const campResponse = await API.CampeonatoRoute.postCampeonato(
      request,
      adminUser,
      {
        nome: `Camp Grupo E2E ${Date.now()}`,
      },
    );
    const campBody = await campResponse.json();
    expect(campResponse.status()).toBe(API.HTTP_CREATED);
    campeonatoId = campBody.id;

    // Criar temporada
    const tempResponse = await API.TemporadaRoute.postTemporada(
      request,
      adminUser,
      {
        ano: 2026,
        campeonatoId,
      },
    );
    const tempBody = await tempResponse.json();
    expect(tempResponse.status()).toBe(API.HTTP_CREATED);
    temporadaId = tempBody.id;
  });

  test('Caso 02 - Criar grupo privado', async ({ request }) => {
    const payload = {
      nome: `Grupo Privado E2E ${Date.now()}`,
      temporadaId,
      privado: true,
    };

    const response = await API.GrupoRoute.postGrupo(
      request,
      adminUser,
      payload,
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_CREATED);
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('codigoConvite');
    expect(body.privado).toBe(true);

    grupoId = body.id;
  });

  test('Caso 03 - Criar grupo público', async ({ request }) => {
    const payload = {
      nome: `Grupo Público E2E ${Date.now()}`,
      temporadaId,
      privado: false,
    };

    const response = await API.GrupoRoute.postGrupo(
      request,
      adminUser,
      payload,
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_CREATED);
    expect(body.privado).toBe(false);
  });

  test('Caso 04 - Listar grupos ativos', async ({ request }) => {
    const response = await API.GrupoRoute.getGrupos(request, adminUser);
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_OK);
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('Caso 05 - Buscar grupo por ID', async ({ request }) => {
    const response = await API.GrupoRoute.getGrupoById(
      request,
      adminUser,
      grupoId,
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_OK);
    expect(body.id).toBe(grupoId);
  });

  test('Caso 06 - Atualizar grupo (admin do grupo)', async ({ request }) => {
    const response = await API.GrupoRoute.patchGrupo(
      request,
      adminUser,
      grupoId,
      {
        nome: `Grupo Atualizado E2E ${Date.now()}`,
      },
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_OK);
    expect(body).toHaveProperty('nome');
  });

  test('Caso 07 - Desativar grupo', async ({ request }) => {
    const response = await API.GrupoRoute.patchGrupoStatus(
      request,
      adminUser,
      grupoId,
      {
        ativo: false,
      },
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_OK);
    expect(body.ativo).toBe(false);
  });

  test('Caso 08 - Reativar grupo', async ({ request }) => {
    const response = await API.GrupoRoute.patchGrupoStatus(
      request,
      adminUser,
      grupoId,
      {
        ativo: true,
      },
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_OK);
    expect(body.ativo).toBe(true);
  });

  test('Caso 09 - Excluir grupo ativo deve falhar', async ({ request }) => {
    const response = await API.GrupoRoute.deleteGrupo(
      request,
      adminUser,
      grupoId,
    );

    expect(response.status()).toBe(API.HTTP_BAD_REQUEST);
  });

  test('Caso 10 - Buscar grupo inexistente deve retornar 404', async ({
    request,
  }) => {
    const response = await API.GrupoRoute.getGrupoById(
      request,
      adminUser,
      API.UUID_INEXISTENTE,
    );

    expect(response.status()).toBe(API.HTTP_NOT_FOUND);
  });

  test('Caso 11 - Criar grupo com temporada inexistente deve falhar', async ({
    request,
  }) => {
    const payload = {
      nome: `Grupo Falha E2E ${Date.now()}`,
      temporadaId: API.UUID_INEXISTENTE,
      privado: false,
    };

    const response = await API.GrupoRoute.postGrupo(
      request,
      adminUser,
      payload,
    );

    expect(response.status()).toBe(API.HTTP_NOT_FOUND);
  });

  test('Caso 12 - Requisição sem token deve retornar 401', async ({
    request,
  }) => {
    const response = await request.get(`${API.BASE_URL}grupos`);

    expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
  });
});
