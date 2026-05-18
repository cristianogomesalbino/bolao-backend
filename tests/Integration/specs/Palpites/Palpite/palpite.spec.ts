import { test, expect } from '../../../resources';
import * as API from '../../../resources';
import { factoryJogo } from '../../../resources/Fixtures/DataFactories/JogoFactory';

test.describe('Palpites Requests Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let faseId: string;
  let jogoId: string;
  let palpiteId: string;

  const usuario = API.factoryUsuario('user_to_manage_campeonato_suite');

  test.beforeAll(async ({ request }) => {
    const data = await API.seedPalpiteAttemptWithFase();
    faseId = data.faseId;

    // Cria jogo via API (precisa de fase existente)
    const jogo = factoryJogo('for_post_jogo');
    const jogoResponse = await API.JogoRoute.postJogo(request, usuario, faseId, jogo);
    jogoId = (await jogoResponse.json()).id;
  });

  test('Caso 01 - Criar palpite', async ({ request }) => {
    const palpite = API.factoryPalpite('for_post_palpite');

    const response = await API.PalpiteRoute.postPalpite(request, usuario, jogoId, palpite);
    const body = await response.json();

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar id e placar corretos', async () => {
      expect(body).toHaveProperty('id');
      expect(body.golsCasa).toBe(palpite.golsCasa);
      expect(body.golsFora).toBe(palpite.golsFora);
    });

    palpiteId = body.id;
  });

  test('Caso 02 - Criar palpite duplicado deve falhar', async ({ request }) => {
    const palpite = API.factoryPalpite('for_post_palpite');

    const response = await API.PalpiteRoute.postPalpite(request, usuario, jogoId, palpite);

    await test.step('Deve retornar 409 Conflict', async () => {
      expect(response.status()).toBe(API.HTTP_CONFLICT);
    });
  });

  test('Caso 03 - Buscar meu palpite por jogo', async ({ request }) => {
    const response = await API.PalpiteRoute.getMeuPalpite(request, usuario, jogoId);
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar o palpite correto', async () => {
      expect(body.id).toBe(palpiteId);
    });
  });

  test('Caso 04 - Atualizar palpite', async ({ request }) => {
    const novoPalpite = API.factoryPalpite('for_patch_palpite');

    const response = await API.PalpiteRoute.patchPalpite(request, usuario, palpiteId, novoPalpite);
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar placar atualizado', async () => {
      expect(body.golsCasa).toBe(novoPalpite.golsCasa);
      expect(body.golsFora).toBe(novoPalpite.golsFora);
    });
  });

  test('Caso 05 - Listar meus palpites', async ({ request }) => {
    const response = await API.PalpiteRoute.getMeusPalpites(request, usuario);
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar um array', async () => {
      expect(Array.isArray(body)).toBeTruthy();
    });
  });

  test('Caso 06 - Excluir palpite', async ({ request }) => {
    const response = await API.PalpiteRoute.deletePalpite(request, usuario, palpiteId);
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar mensagem de confirmação', async () => {
      expect(body.mensagem).toContain('excluído');
    });
  });
});
