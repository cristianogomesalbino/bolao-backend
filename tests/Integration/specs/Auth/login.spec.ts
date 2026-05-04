import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('Auth Suite', () => {
  let refreshToken: string;

  test.beforeAll(async () => {
    await API.seedingForAuthSuite();
  });

  test('Caso 01 - Realizar login com sucesso', async ({ request }) => {
    const usuario = API.factoryUsuario('adm_to_manage_auth_suite');
    const response = await API.AuthRoute.postLogin(request, {
      email: usuario.email,
      senha: usuario.senha,
    });
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_CREATED);
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('refreshToken');

    refreshToken = body.refreshToken;
  });

  test('Caso 02 - Realizar login com senha inválida', async ({ request }) => {
    const usuario = API.factoryUsuario('adm_to_manage_auth_suite');
    const response = await API.AuthRoute.postLogin(request, {
      email: usuario.email,
      senha: 'SenhaErrada123!',
    });
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
    expect(JSON.stringify(body)).toContain(API.MSG_CREDENCIAIS_INVALIDAS);
  });

  test('Caso 03 - Realizar login com email inexistente', async ({
    request,
  }) => {
    const response = await API.AuthRoute.postLogin(request, {
      email: 'naoexiste@teste.qa',
      senha: 'Teste123!',
    });
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
    expect(JSON.stringify(body)).toContain(API.MSG_CREDENCIAIS_INVALIDAS);
  });

  test('Caso 04 - Renovar token com refresh válido', async ({ request }) => {
    const response = await API.AuthRoute.postRefresh(request, {
      refreshToken,
    });
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_CREATED);
    expect(body).toHaveProperty('accessToken');
  });

  test('Caso 05 - Renovar token com refresh inválido', async ({ request }) => {
    const response = await API.AuthRoute.postRefresh(request, {
      refreshToken: 'token-invalido-qualquer',
    });

    expect(response.ok()).toBeFalsy();
  });

  test('Caso 06 - Fazer logout com sucesso', async ({ request }) => {
    const usuario = API.factoryUsuario('adm_to_manage_auth_suite');
    const headers = await API.generateHeaderAuthorization(request, usuario);

    const loginResponse = await API.AuthRoute.postLogin(request, {
      email: usuario.email,
      senha: usuario.senha,
    });
    const loginBody = await loginResponse.json();

    const response = await API.AuthRoute.postLogout(request, headers, {
      refreshToken: loginBody.refreshToken,
    });
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_CREATED);
    expect(body.mensagem).toBe(API.MSG_LOGOUT_SUCESSO);
  });

  test('Caso 07 - Login com usuário inativo deve falhar', async ({
    request,
  }) => {
    await API.UsuarioDB.createUsuario({
      nome: 'Inativo Auth QA',
      email: 'inativo@authsuite.qa',
      senha: 'Teste123!',
      ativo: false,
    });

    const response = await API.AuthRoute.postLogin(request, {
      email: 'inativo@authsuite.qa',
      senha: 'Teste123!',
    });
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
    expect(JSON.stringify(body)).toContain(API.MSG_CREDENCIAIS_INVALIDAS);
  });
});
