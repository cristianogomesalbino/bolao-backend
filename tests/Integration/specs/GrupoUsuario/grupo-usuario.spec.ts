import { test, expect } from '../../resources';
import * as API from '../../resources';

let executionTime: string;

test.describe('Grupo Membros Requests Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let campeonatoId: string;
  let temporadaId: string;
  let grupoId: string;
  let codigoConvite: string;

  const adminUser = API.factoryUsuario('user_to_manage_grupo_suite');
  const memberUser = API.factoryUsuario('user_member_grupo_suite');
  const addUser = API.factoryUsuario('user_to_add_grupo_suite');

  test.beforeAll(async () => {
    await API.seedingForGrupoSuite();
    executionTime = API.setCurrentTestExecutionTime();
  });

  test.afterAll(async () => {
    await API.cleanTestsData(executionTime);
  });

  test('Caso 01 - Setup: Criar campeonato, temporada e grupo', async ({
    request,
  }) => {
    // Campeonato
    const campResponse = await API.CampeonatoRoute.postCampeonato(
      request,
      adminUser,
      {
        nome: `Camp Membros E2E ${Date.now()}`,
      },
    );
    campeonatoId = (await campResponse.json()).id;

    // Temporada
    const tempResponse = await API.TemporadaRoute.postTemporada(
      request,
      adminUser,
      {
        ano: 2026,
        campeonatoId,
      },
    );
    temporadaId = (await tempResponse.json()).id;

    // Grupo privado
    const grupoResponse = await API.GrupoRoute.postGrupo(request, adminUser, {
      nome: `Grupo Membros E2E ${Date.now()}`,
      temporadaId,
      privado: true,
    });
    const grupoBody = await grupoResponse.json();
    grupoId = grupoBody.id;
    codigoConvite = grupoBody.codigoConvite;

    expect(grupoResponse.status()).toBe(API.HTTP_CREATED);
    expect(codigoConvite).toBeTruthy();
  });

  test('Caso 02 - Entrar no grupo por código de convite', async ({
    request,
  }) => {
    const response = await API.GrupoUsuarioRoute.postEntrarGrupo(
      request,
      memberUser,
      {
        codigoConvite,
      },
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_CREATED);
    expect(body).toHaveProperty('id');
    expect(body.role).toBe('MEMBER');
  });

  test('Caso 03 - Entrar no grupo novamente deve retornar conflito', async ({
    request,
  }) => {
    const response = await API.GrupoUsuarioRoute.postEntrarGrupo(
      request,
      memberUser,
      {
        codigoConvite,
      },
    );

    expect(response.status()).toBe(API.HTTP_CONFLICT);
  });

  test('Caso 04 - Adicionar membro por email (admin)', async ({ request }) => {
    const response = await API.GrupoUsuarioRoute.postAdicionarMembro(
      request,
      adminUser,
      grupoId,
      { email: addUser.email },
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_CREATED);
    expect(body).toHaveProperty('id');
  });

  test('Caso 05 - Listar membros do grupo', async ({ request }) => {
    const response = await API.GrupoUsuarioRoute.getMembros(
      request,
      adminUser,
      grupoId,
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_OK);
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThanOrEqual(3); // admin + member + added
  });

  test('Caso 06 - Membro pode listar membros do grupo', async ({ request }) => {
    const response = await API.GrupoUsuarioRoute.getMembros(
      request,
      memberUser,
      grupoId,
    );

    expect(response.status()).toBe(API.HTTP_OK);
  });

  test('Caso 07 - Entrar com código de convite inválido deve falhar', async ({
    request,
  }) => {
    const novoUser = API.factoryUsuario('user_to_manage_campeonato_suite');
    await API.UsuarioDB.createUsuario(novoUser);

    const response = await API.GrupoUsuarioRoute.postEntrarGrupo(
      request,
      novoUser,
      {
        codigoConvite: 'INVALIDO',
      },
    );

    expect(response.status()).toBe(API.HTTP_NOT_FOUND);
  });

  test('Caso 08 - Membro sai do grupo', async ({ request }) => {
    const response = await API.GrupoUsuarioRoute.deleteSairGrupo(
      request,
      addUser,
      grupoId,
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_OK);
    expect(body.mensagem).toContain('saiu');
  });

  test('Caso 09 - Requisição sem token deve retornar 401', async ({
    request,
  }) => {
    const response = await request.get(
      `${API.BASE_URL}grupos/${grupoId}/membros`,
    );

    expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
  });
});
