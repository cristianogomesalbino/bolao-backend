import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('Auth Requests Suite', () => {
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

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar accessToken e refreshToken', async () => {
      expect(body).toHaveProperty('accessToken');
      expect(body).toHaveProperty('refreshToken');
    });

    await test.step('Tokens devem ser strings não vazias', async () => {
      expect(typeof body.accessToken).toBe('string');
      expect(typeof body.refreshToken).toBe('string');
      expect(body.accessToken.length).toBeGreaterThan(0);
      expect(body.refreshToken.length).toBeGreaterThan(0);
    });
  });

  test('Caso 02 - Realizar login com senha inválida', async ({ request }) => {
    const usuario = API.factoryUsuario('adm_to_manage_auth_suite');
    const response = await API.AuthRoute.postLogin(request, {
      email: usuario.email,
      senha: 'SenhaErrada123!',
    });
    const body = await response.json();

    await test.step('Deve retornar 401 Unauthorized', async () => {
      expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
    });

    await test.step('Deve conter mensagem de credenciais inválidas', async () => {
      expect(JSON.stringify(body)).toContain(API.MSG.CREDENCIAIS_INVALIDAS);
    });
  });

  test('Caso 03 - Realizar login com email inexistente', async ({
    request,
  }) => {
    const response = await API.AuthRoute.postLogin(request, {
      email: `qa.caso03.${Date.now()}@inexistente.qa`,
      senha: 'Teste123!',
    });
    const body = await response.json();

    await test.step('Deve retornar 401 Unauthorized', async () => {
      expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
    });

    await test.step('Deve conter mensagem de credenciais inválidas', async () => {
      expect(JSON.stringify(body)).toContain(API.MSG.CREDENCIAIS_INVALIDAS);
    });
  });

  test('Caso 04 - Renovar token com refresh válido', async ({ request }) => {
    const usuario = API.factoryUsuario('adm_to_manage_auth_suite');

    // Faz login para obter refresh token válido
    const loginResponse = await API.AuthRoute.postLogin(request, {
      email: usuario.email,
      senha: usuario.senha,
    });
    const loginBody = await loginResponse.json();

    const response = await API.AuthRoute.postRefresh(request, {
      refreshToken: loginBody.refreshToken,
    });
    const body = await response.json();

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar novo accessToken', async () => {
      expect(body).toHaveProperty('accessToken');
      expect(typeof body.accessToken).toBe('string');
      expect(body.accessToken.length).toBeGreaterThan(0);
    });
  });

  test('Caso 05 - Renovar token com refresh inválido', async ({ request }) => {
    const response = await API.AuthRoute.postRefresh(request, {
      refreshToken: 'token-invalido-qualquer',
    });

    await test.step('Deve retornar status de erro (401)', async () => {
      expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
    });
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

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar mensagem de logout realizado', async () => {
      expect(body.mensagem).toBe(API.MSG.LOGOUT_SUCESSO);
    });
  });

  test('Caso 07 - Login com usuário inativo deve falhar', async ({
    request,
  }) => {
    const email = `qa.caso07.${Date.now()}@inativo.auth.qa`;
    await API.UsuarioDB.createUsuario({
      nome: 'Inativo Auth QA',
      email,
      senha: 'Teste123!',
      ativo: false,
    });

    const response = await API.AuthRoute.postLogin(request, {
      email,
      senha: 'Teste123!',
    });
    const body = await response.json();

    await test.step('Deve retornar 401 Unauthorized', async () => {
      expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
    });

    await test.step('Deve conter mensagem de credenciais inválidas', async () => {
      expect(JSON.stringify(body)).toContain(API.MSG.CREDENCIAIS_INVALIDAS);
    });
  });

  test('Caso 08 - Solicitar recuperação de senha com email existente', async ({
    request,
  }) => {
    const usuario = API.factoryUsuario('adm_to_manage_auth_suite');
    const response = await API.AuthRoute.postEsqueciSenha(request, {
      email: usuario.email,
    });
    const body = await response.json();

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar mensagem genérica (não revela se email existe)', async () => {
      expect(body.mensagem).toBeDefined();
    });
  });

  test('Caso 09 - Solicitar recuperação de senha com email inexistente', async ({
    request,
  }) => {
    const response = await API.AuthRoute.postEsqueciSenha(request, {
      email: `qa.caso09.${Date.now()}@recuperacao.qa`,
    });
    const body = await response.json();

    await test.step('Deve retornar 201 Created (não revela se email existe)', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar mensagem genérica', async () => {
      expect(body.mensagem).toBeDefined();
    });
  });

  test('Caso 10 - Resetar senha com token inválido', async ({ request }) => {
    const response = await API.AuthRoute.postResetarSenha(request, {
      token: 'token-invalido-qualquer',
      novaSenha: 'NovaSenha123!',
      confirmarSenha: 'NovaSenha123!',
    });

    await test.step('Deve retornar erro (400 ou 422)', async () => {
      expect([API.HTTP_BAD_REQUEST, API.HTTP_UNPROCESSABLE_ENTITY]).toContain(
        response.status(),
      );
    });
  });
});
