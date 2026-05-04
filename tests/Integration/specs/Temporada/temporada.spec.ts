import { test, expect } from '../../resources';
import * as API from '../../resources';

let executionTime: string;

test.describe('Temporadas Requests Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let campeonatoId: string;

  test.beforeAll(async () => {
    await API.seedingForCampeonatoSuite();
    executionTime = API.setCurrentTestExecutionTime();
  });

  test.afterAll(async () => {
    await API.cleanTestsData(executionTime);
  });

  test('Caso 01 - Criar campeonato para vincular temporada', async ({
    request,
  }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');
    const payload = { nome: `Camp Temporada E2E ${Date.now()}` };

    const response = await API.CampeonatoRoute.postCampeonato(
      request,
      usuario,
      payload,
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_CREATED);
    campeonatoId = body.id;
  });

  test('Caso 02 - Criar temporada', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');
    const payload = { ano: 2026, campeonatoId };

    const response = await API.TemporadaRoute.postTemporada(
      request,
      usuario,
      payload,
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_CREATED);
    expect(body).toHaveProperty('id');
    expect(body.ano).toBe(2026);
  });

  test('Caso 03 - Listar temporadas', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');

    const response = await API.TemporadaRoute.getTemporadas(request, usuario);
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_OK);
    expect(Array.isArray(body)).toBeTruthy();
  });

  test('Caso 04 - Criar temporada com campeonato inexistente deve falhar', async ({
    request,
  }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');
    const payload = { ano: 2026, campeonatoId: API.UUID_INEXISTENTE };

    const response = await API.TemporadaRoute.postTemporada(
      request,
      usuario,
      payload,
    );

    expect(response.status()).toBe(API.HTTP_NOT_FOUND);
  });

  test('Caso 05 - Requisição sem token deve retornar 401', async ({
    request,
  }) => {
    const response = await request.get(`${API.BASE_URL}temporadas`);

    expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
  });
});
