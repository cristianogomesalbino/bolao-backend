import { test, expect } from '../../../resources';
import * as API from '../../../resources';

test.describe('Fases Requests Suite', () => {
  let temporadaId: string;

  test.beforeAll(async () => {
    await API.seedingForFaseSuite();
    temporadaId = await API.getFaseSuiteTemporadaId();
  });

  test('Caso 01 - Criar fase pontos corridos', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');
    const fase = API.factoryFase('for_post_fase_pontos_corridos');

    const response = await API.FaseRoute.postFase(request, usuario, temporadaId, fase);
    const body = await response.json();

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar id, nome e tipo corretos', async () => {
      expect(body).toHaveProperty('id');
      expect(body.nome).toBe(fase.nome);
      expect(body.tipo).toBe('PONTOS_CORRIDOS');
    });

    await test.step('Deve persistir corretamente no banco', async () => {
      const faseDB = await API.FaseDB.selectFaseById(body.id);
      expect(faseDB).not.toBeNull();
      expect(faseDB!.nome).toBe(fase.nome);
      expect(faseDB!.tipo).toBe('PONTOS_CORRIDOS');
      expect(faseDB!.ordem).toBe(fase.ordem);
      expect(faseDB!.temporadaId).toBe(temporadaId);
    });
  });

  test('Caso 02 - Criar fase mata-mata com ida e volta', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');
    const fase = API.factoryFase('for_post_fase_mata_mata');

    const response = await API.FaseRoute.postFase(request, usuario, temporadaId, fase);
    const body = await response.json();

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve ser mata-mata com ida e volta', async () => {
      expect(body.tipo).toBe('MATA_MATA');
      expect(body.idaVolta).toBe(true);
    });

    await test.step('Deve persistir corretamente no banco', async () => {
      const faseDB = await API.FaseDB.selectFaseById(body.id);
      expect(faseDB!.tipo).toBe('MATA_MATA');
      expect(faseDB!.idaVolta).toBe(true);
    });
  });

  test('Caso 03 - Listar fases da temporada', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');

    const response = await API.FaseRoute.getFases(request, usuario, temporadaId);
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar um array', async () => {
      expect(Array.isArray(body)).toBeTruthy();
    });
  });
});
