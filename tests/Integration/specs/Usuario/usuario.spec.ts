import { test, expect } from '../../resources';
import * as API from '../../resources';

test.describe('Usuarios Requests Suite', () => {
  test('Caso 01 - Criar usuário via API (rota pública)', async ({
    request,
  }) => {
    const payload = API.factoryUsuario('for_post_usuario');

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

    await test.step('Deve persistir corretamente no banco', async () => {
      const usuarioDB = await API.UsuarioDB.selectUsuarioById(body.id);
      expect(usuarioDB).not.toBeNull();
      expect(usuarioDB!.nome).toBe(payload.nome);
      expect(usuarioDB!.email).toBe(payload.email);
    });
  });

  test('Caso 02 - Criar usuário com email duplicado deve falhar', async ({
    request,
  }) => {
    const usuario = API.factoryUsuario('for_post_usuario');
    await API.UsuarioDB.insertUsuario(usuario);

    // Tenta criar outro com mesmo email
    const response = await API.UsuarioRoute.postUsuario(request, usuario);

    await test.step('Deve retornar 409 Conflict', async () => {
      expect(response.status()).toBe(API.HTTP_CONFLICT);
    });
  });

  test('Caso 03 - Buscar perfil do usuário autenticado (GET /me)', async ({
    request,
  }) => {
    const usuario = API.factoryUsuario('for_post_usuario');
    await API.UsuarioDB.insertUsuario(usuario);

    const response = await API.UsuarioRoute.getUsuarioMe(request, {
      email: usuario.email,
      senha: usuario.senha,
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

    await test.step('Deve retornar valores corretos', async () => {
      expect(body.nome).toBe(usuario.nome);
      expect(body.email).toBe(usuario.email);
      expect(body.ativo).toBe(true);
    });

    await test.step('Não deve expor campos sensíveis', async () => {
      expect(body).not.toHaveProperty('senha');
      expect(body).not.toHaveProperty('senhaHash');
    });
  });

  test('Caso 04 - Buscar usuário por ID (próprio)', async ({ request }) => {
    const usuario = API.factoryUsuario('for_post_usuario');
    await API.UsuarioDB.insertUsuario(usuario);

    const userId = await API.UsuarioDB.selectUsuarioByEmail(usuario.email);

    const response = await API.UsuarioRoute.getUsuarioById(
      request,
      { email: usuario.email, senha: usuario.senha },
      userId!,
    );
    const body = await response.json();

    await test.step('Deve retornar 200 OK', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
    });

    await test.step('Deve retornar o mesmo ID e email', async () => {
      expect(body.id).toBe(userId);
      expect(body.email).toBe(usuario.email);
    });
  });

  test('Caso 05 - Atualizar nome do usuário', async ({ request }) => {
    const usuario = API.factoryUsuario('for_post_usuario');
    await API.UsuarioDB.insertUsuario(usuario);

    const userId = await API.UsuarioDB.selectUsuarioByEmail(usuario.email);
    const dadosPatch = API.factoryUsuario('for_patch_usuario');

    const response = await API.UsuarioRoute.patchUsuario(
      request,
      { email: usuario.email, senha: usuario.senha },
      userId!,
      { nome: dadosPatch.nome },
    );
    const body = await response.json();

    await test.step('Deve retornar 200 OK com nome atualizado', async () => {
      expect(response.status()).toBe(API.HTTP_OK);
      expect(body.nome).toBe(dadosPatch.nome);
    });

    await test.step('Deve persistir o novo nome no banco', async () => {
      const usuarioDB = await API.UsuarioDB.selectUsuarioById(userId!);
      expect(usuarioDB).not.toBeNull();
      expect(usuarioDB!.nome).toBe(dadosPatch.nome);
    });
  });
});
