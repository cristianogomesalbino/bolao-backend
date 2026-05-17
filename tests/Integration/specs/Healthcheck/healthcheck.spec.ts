import { test, expect, HTTP, BASE_URL } from '../../resources';

test.describe('Healthcheck', () => {
  test('Caso 01 - Status da API deve retornar ok', async ({ request }) => {
    const response = await request.get(`${BASE_URL}health`);

    expect(response.status()).toBe(HTTP.OK);

    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
