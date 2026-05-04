import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('Healthcheck', () => {
  test('Caso 01 - Status da API deve retornar ok', async ({ request }) => {
    const response = await request.get(`${API.BASE_URL}health`);

    expect(response.status()).toBe(API.HTTP_OK);

    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
