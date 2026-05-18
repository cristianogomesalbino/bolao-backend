import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('Campeonatos Requests Suite', () => {
  test.beforeAll(async () => {
    await API.seedingForCampeonatoSuite();
  });

  test('Caso 01 - Criar campeonato com sucesso', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');
    const payload = { nome: `Campeonato E2E ${Date.now()}` };

    const response = await API.CampeonatoRoute.postCampeonato(
      request,
      usuario,
      payload,
    );
    const body = await response.json();

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar id e nome corretos', async () => {
      expect(body).toHaveProperty('id');
      expect(body.nome).toBe(payload.nome);
    });

    await test.step('Não deve expor campos sensíveis', async () => {
      expect(body).not.toHaveProperty('senha');
    });
  });

  test('Caso 02 - Listar campeonatos', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');

    const response = await API.CampeonatoRoute.getCampeonatos(request, usuario);
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar um array', async () => {
      expect(Array.isArray(body)).toBeTruthy();
    });
  });

  test('Caso 03 - Criar campeonato sem nome deve falhar', async ({
    request,
  }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');

    const response = await API.CampeonatoRoute.postCampeonato(
      request,
      usuario,
      {},
    );

    await test.step('Deve retornar 422 Unprocessable Entity', async () => {
      expect(response.status()).toBe(API.HTTP_UNPROCESSABLE_ENTITY);
    });
  });

  test('Caso 04 - Requisição sem token deve retornar 401', async ({
    request,
  }) => {
    const response = await request.get(`${API.BASE_URL}campeonatos`);

    await test.step('Deve retornar 401 Unauthorized', async () => {
      expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
    });
  });
});
