import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('Temporadas Requests Suite', () => {
  test.beforeAll(async () => {
    await API.seedingForCampeonatoSuite();
  });

  test('Caso 01 - Criar temporada com sucesso', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');

    // Setup — cria campeonato para vincular
    const campPayload = { nome: `Camp Temp E2E ${Date.now()}` };
    const campResponse = await API.CampeonatoRoute.postCampeonato(
      request,
      usuario,
      campPayload,
    );
    const campBody = await campResponse.json();
    const campeonatoId = campBody.id;

    const payload = { ano: 2026, campeonatoId };
    const response = await API.TemporadaRoute.postTemporada(
      request,
      usuario,
      payload,
    );
    const body = await response.json();

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar id e ano corretos', async () => {
      expect(body).toHaveProperty('id');
      expect(body.ano).toBe(2026);
    });

    await test.step('Deve conter campeonatoId na resposta', async () => {
      expect(body.campeonatoId).toBe(campeonatoId);
    });
  });

  test('Caso 02 - Listar temporadas', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');

    const response = await API.TemporadaRoute.getTemporadas(request, usuario);
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar um array', async () => {
      expect(Array.isArray(body)).toBeTruthy();
    });
  });

  test('Caso 03 - Criar temporada com campeonato inexistente deve falhar', async ({
    request,
  }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');
    const payload = { ano: 2026, campeonatoId: API.UUID_INEXISTENTE };

    const response = await API.TemporadaRoute.postTemporada(
      request,
      usuario,
      payload,
    );

    await test.step('Deve retornar 404 Not Found', async () => {
      expect(response.status()).toBe(API.HTTP_NOT_FOUND);
    });
  });

  test('Caso 04 - Requisição sem token deve retornar 401', async ({
    request,
  }) => {
    const response = await request.get(`${API.BASE_URL}temporadas`);

    await test.step('Deve retornar 401 Unauthorized', async () => {
      expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
    });
  });
});
