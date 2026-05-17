import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('Campeonatos Requests Suite', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(async () => {
    await API.seedingForCampeonatoSuite();
  });

  test('Caso 01 - Criar campeonato', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');
    const payload = { nome: `Campeonato E2E ${Date.now()}` };

    const response = await API.CampeonatoRoute.postCampeonato(
      request,
      usuario,
      payload,
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_CREATED);
    expect(body).toHaveProperty('id');
    expect(body.nome).toBe(payload.nome);
  });

  test('Caso 02 - Listar campeonatos', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');

    const response = await API.CampeonatoRoute.getCampeonatos(request, usuario);
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_OK);
    expect(Array.isArray(body)).toBeTruthy();
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

    expect(response.status()).toBe(API.HTTP_BAD_REQUEST);
  });

  test('Caso 04 - Requisição sem token deve retornar 401', async ({
    request,
  }) => {
    const response = await request.get(`${API.BASE_URL}campeonatos`);

    expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
  });
});
