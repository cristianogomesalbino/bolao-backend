import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('Temporadas Requests Suite', () => {
  let campeonatoId: string;

  test.beforeAll(async () => {
    await API.seedingForTemporadaSuite();
    campeonatoId = await API.getTemporadaSuiteCampeonatoId();
  });

  test('Caso 01 - Criar temporada com sucesso', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');
    const temporada = API.factoryTemporada('for_post_temporada');
    const payload = { ...temporada, campeonatoId };

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
      expect(body.ano).toBe(temporada.ano);
    });

    await test.step('Deve conter campeonatoId na resposta', async () => {
      expect(body.campeonatoId).toBe(campeonatoId);
    });

    await test.step('Deve persistir corretamente no banco', async () => {
      const temporadaDB = await API.TemporadaDB.selectTemporadaById(body.id);
      expect(temporadaDB).not.toBeNull();
      expect(temporadaDB!.ano).toBe(temporada.ano);
      expect(temporadaDB!.campeonatoId).toBe(campeonatoId);
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
});
