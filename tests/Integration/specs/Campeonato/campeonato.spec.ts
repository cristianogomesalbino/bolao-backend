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

    await test.step('Deve persistir corretamente no banco', async () => {
      const campeonatoDB = await API.CampeonatoDB.selectCampeonatoById(body.id);
      expect(campeonatoDB).not.toBeNull();
      expect(campeonatoDB!.nome).toBe(payload.nome);
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
});
