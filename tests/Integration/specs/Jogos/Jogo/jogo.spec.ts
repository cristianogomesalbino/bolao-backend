import { test, expect } from '../../../resources';
import * as API from '../../../resources';

test.describe('Jogos Requests Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let faseId: string;
  let jogoId: string;

  const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');

  test.beforeAll(async () => {
    const data = await API.seedJogoAttemptWithFase();
    faseId = data.faseId;
  });

  test('Caso 01 - Criar jogo', async ({ request }) => {
    const jogo = API.factoryJogo('for_post_jogo');

    const response = await API.JogoRoute.postJogo(request, usuario, faseId, jogo);
    const body = await response.json();

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar id e times corretos', async () => {
      expect(body).toHaveProperty('id');
      expect(body.timeCasaId).toBe(jogo.timeCasaId);
      expect(body.timeForaId).toBe(jogo.timeForaId);
    });

    await test.step('Deve ter status AGENDADO', async () => {
      expect(body.status).toBe('AGENDADO');
    });

    jogoId = body.id;
  });

  test('Caso 02 - Listar jogos da fase', async ({ request }) => {
    const response = await API.JogoRoute.getJogosByFase(request, usuario, faseId);
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar um array com pelo menos 1 jogo', async () => {
      expect(Array.isArray(body)).toBeTruthy();
      expect(body.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('Caso 03 - Buscar jogo por ID', async ({ request }) => {
    const response = await API.JogoRoute.getJogoById(request, usuario, jogoId);
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar o jogo correto', async () => {
      expect(body.id).toBe(jogoId);
    });
  });

  test('Caso 04 - Finalizar jogo com placar', async ({ request }) => {
    const placar = API.factoryFinalizarJogo('vitoria_casa');

    const response = await API.JogoRoute.patchFinalizarJogo(request, usuario, jogoId, placar);
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve ter status FINALIZADO', async () => {
      expect(body.status).toBe('FINALIZADO');
    });

    await test.step('Deve ter placar correto', async () => {
      expect(body.golsCasa).toBe(placar.golsCasa);
      expect(body.golsFora).toBe(placar.golsFora);
    });
  });
});
