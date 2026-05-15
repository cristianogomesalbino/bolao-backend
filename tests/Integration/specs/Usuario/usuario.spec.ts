import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('Usuarios Requests Suite', () => {
  test('Caso 01 - Criar usuário via API (rota pública)', async ({
    request,
  }) => {
    const payload = {
      nome: 'Novo Usuario E2E QA',
      email: `qa.caso01.${Date.now()}@post.usuario.qa`,
      senha: 'Teste123!',
    };

    const response = await API.UsuarioRoute.postUsuario(request, payload);
    const body = await response.json();

    await test.step('Deve retornar 201 Created', async () => {
      expect(response.status()).toBe(API.HTTP_CREATED);
    });

    await test.step('Deve retornar id, nome e email corretos', async () => {
      expect(body).toHaveProperty('id');
      expect(body.nome).toBe(payload.nome);
      expect(body.email).toBe(payload.email);
    });

    await test.step('Não deve expor a senha na resposta', async () => {
      expect(body).not.toHaveProperty('senha');
    });

    // Cleanup
    await API.UsuarioDB.deleteUsuarioByEmail(payload.email);
  });

  test('Caso 02 - Criar usuário com email duplicado deve falhar', async ({
    request,
  }) => {
    const email = `qa.caso02.${Date.now()}@duplicado.qa`;
    await API.UsuarioDB.insertUsuario({
      nome: 'Duplicado Setup QA',
      email,
      senha: 'Teste123!',
    });

    const payload = {
      nome: 'Duplicado QA',
      email,
      senha: 'Teste123!',
    };

    const response = await API.UsuarioRoute.postUsuario(request, payload);

    await test.step('Deve retornar 409 Conflict', async () => {
      expect(response.status()).toBe(API.HTTP_CONFLICT);
    });

    // Cleanup
    await API.UsuarioDB.deleteUsuarioByEmail(email);
  });

  test('Caso 03 - Buscar perfil do usuário autenticado (GET /me)', async ({
    request,
  }) => {
    const email = `qa.caso03.${Date.now()}@me.qa`;
    const senha = 'Teste123!';
    const nome = 'Usuario Me QA';
    await API.UsuarioDB.insertUsuario({ nome, email, senha });

    const response = await API.UsuarioRoute.getUsuarioMe(request, {
      email,
      senha,
    });
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve conter todos os campos do presenter', async () => {
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('nome');
      expect(body).toHaveProperty('email');
      expect(body).toHaveProperty('perfil');
      expect(body).toHaveProperty('ativo');
      expect(body).toHaveProperty('dataCriacao');
      expect(body).toHaveProperty('atualizadoEm');
    });

    await test.step('Deve retornar valores corretos (nome, email, ativo)', async () => {
      expect(body.nome).toBe(nome);
      expect(body.email).toBe(email);
      expect(body.ativo).toBe(true);
    });

    await test.step('Deve retornar tipos corretos nos campos', async () => {
      expect(typeof body.id).toBe('string');
      expect(typeof body.nome).toBe('string');
      expect(typeof body.perfil).toBe('string');
      expect(typeof body.ativo).toBe('boolean');
    });

    await test.step('Não deve expor campos sensíveis', async () => {
      expect(body).not.toHaveProperty('senha');
      expect(body).not.toHaveProperty('senhaHash');
    });

    // Cleanup
    await API.UsuarioDB.deleteUsuarioByEmail(email);
  });

  test('Caso 04 - Buscar usuário por ID (próprio)', async ({ request }) => {
    const email = `qa.caso04.${Date.now()}@byid.qa`;
    const senha = 'Teste123!';
    await API.UsuarioDB.insertUsuario({ nome: 'ById QA', email, senha });

    const userId = await API.UsuarioDB.selectUsuarioByEmail(email);

    const response = await API.UsuarioRoute.getUsuarioById(
      request,
      { email, senha },
      userId!,
    );
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar o mesmo ID e email do usuário', async () => {
      expect(body.id).toBe(userId);
      expect(body.email).toBe(email);
    });

    // Cleanup
    await API.UsuarioDB.deleteUsuarioByEmail(email);
  });

  test('Caso 05 - Buscar usuário com UUID inexistente deve retornar 403 ou 404', async ({
    request,
  }) => {
    const email = `qa.caso05.${Date.now()}@notfound.qa`;
    const senha = 'Teste123!';
    await API.UsuarioDB.insertUsuario({ nome: 'NotFound QA', email, senha });

    const response = await API.UsuarioRoute.getUsuarioById(
      request,
      { email, senha },
      API.UUID_INEXISTENTE,
    );

    await test.step('Deve retornar 403 Forbidden (guard bloqueia antes de verificar existência)', async () => {
      expect([API.HTTP_FORBIDDEN, API.HTTP_NOT_FOUND]).toContain(
        response.status(),
      );
    });

    // Cleanup
    await API.UsuarioDB.deleteUsuarioByEmail(email);
  });

  test('Caso 06 - Atualizar nome do usuário', async ({ request }) => {
    const email = `qa.caso06.${Date.now()}@patch.qa`;
    const senha = 'Teste123!';
    await API.UsuarioDB.insertUsuario({
      nome: 'Antes Patch QA',
      email,
      senha,
    });

    const userId = await API.UsuarioDB.selectUsuarioByEmail(email);

    const novoNome = 'Nome Atualizado E2E QA';

    const response = await API.UsuarioRoute.patchUsuario(
      request,
      { email, senha },
      userId!,
      { nome: novoNome },
    );
    const body = await response.json();

    await test.step('Deve retornar 200 OK com nome atualizado', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
      expect(body.nome).toBe(novoNome);
    });

    await test.step('Deve persistir o novo nome no banco de dados', async () => {
      const usuarioDB = await API.UsuarioDB.selectUsuarioById(userId!);
      expect(usuarioDB).not.toBeNull();
      expect(usuarioDB!.nome).toBe(novoNome);
    });

    // Cleanup
    await API.UsuarioDB.deleteUsuarioByEmail(email);
  });

  test('Caso 07 - Requisição sem token deve retornar 401', async ({
    request,
  }) => {
    const response = await request.get(`${API.BASE_URL}usuarios/me`);

    await test.step('Deve retornar 401 Unauthorized', async () => {
      expect(response.status()).toBe(API.HTTP_UNAUTHORIZED);
    });
  });
});
