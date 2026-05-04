import { test, expect } from '../../resources';
import * as API from '../../resources';

let executionTime: string;

test.describe('Usuarios Requests Suite', () => {
  test.describe.configure({ mode: 'serial' });

  let usuarioIdCriado: string;

  test.beforeAll(async () => {
    await API.seedingForUsuarioSuite();
    executionTime = API.setCurrentTestExecutionTime();
  });

  test.afterAll(async () => {
    await API.cleanTestsData(executionTime);
  });

  test('Caso 01 - Criar usuário via API (rota pública)', async ({
    request,
  }) => {
    const payload = {
      nome: 'Novo Usuario E2E QA',
      email: `e2e.${Date.now()}@post.usuario.qa`,
      senha: 'Teste123!',
    };

    const response = await API.UsuarioRoute.postUsuario(request, payload);
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_CREATED);
    expect(body).toHaveProperty('id');
    expect(body.nome).toBe(payload.nome);
    expect(body.email).toBe(payload.email);
    expect(body).not.toHaveProperty('senha');

    usuarioIdCriado = body.id;
  });

  test('Caso 02 - Criar usuário com email duplicado deve falhar', async ({
    request,
  }) => {
    const usuario = API.factoryUsuario('user_to_manage_usuario_suite');
    const payload = {
      nome: 'Duplicado QA',
      email: usuario.email,
      senha: 'Teste123!',
    };

    const response = await API.UsuarioRoute.postUsuario(request, payload);

    expect(response.status()).toBe(API.HTTP_CONFLICT);
  });

  test('Caso 03 - Buscar perfil do usuário autenticado (GET /me)', async ({
    request,
  }) => {
    const usuario = API.factoryUsuario('user_to_manage_usuario_suite');
    const response = await API.UsuarioRoute.getUsuarioMe(request, usuario);
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_OK);
    expect(body).toHaveProperty('id');
    expect(body.email).toBe(usuario.email);
    expect(body).not.toHaveProperty('senha');
  });

  test('Caso 04 - Buscar usuário por ID', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_usuario_suite');
    const meResponse = await API.UsuarioRoute.getUsuarioMe(request, usuario);
    const me = await meResponse.json();

    const response = await API.UsuarioRoute.getUsuarioById(
      request,
      usuario,
      me.id,
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_OK);
    expect(body.id).toBe(me.id);
  });

  test('Caso 05 - Buscar usuário com UUID inexistente deve retornar 404', async ({
    request,
  }) => {
    const usuario = API.factoryUsuario('user_to_manage_usuario_suite');
    const response = await API.UsuarioRoute.getUsuarioById(
      request,
      usuario,
      API.UUID_INEXISTENTE,
    );

    expect(response.status()).toBe(API.HTTP_NOT_FOUND);
  });

  test('Caso 06 - Atualizar nome do usuário', async ({ request }) => {
    const usuario = API.factoryUsuario('user_to_manage_usuario_suite');
    const meResponse = await API.UsuarioRoute.getUsuarioMe(request, usuario);
    const me = await meResponse.json();

    const response = await API.UsuarioRoute.patchUsuario(
      request,
      usuario,
      me.id,
      {
        nome: 'Nome Atualizado E2E QA',
      },
    );
    const body = await response.json();

    expect(response.status()).toBe(API.HTTP_OK);
    expect(body.nome).toBe('Nome Atualizado E2E QA');
  });

  test('Caso 07 - Requisição sem token deve retornar 401', async ({
    request,
  }) => {
    const response = await request.get(`${API.BASE_URL}usuarios/me`);

    expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
  });
});
