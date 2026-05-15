import { test, expect } from '../../../resources';
import * as API from '../../../resources';

const usuario = API.USUARIO_ATTEMPT_USUARIOS.usuario_comum;

test.describe('Segurança PATCH /usuarios/:id', () => {
  let usuarioId: string;

  test.beforeAll(async () => {
    await API.seedUsuarioAttempt();
    const userId = await API.UsuarioDB.selectUsuarioByEmail(usuario.email);
    usuarioId = userId!;
  });

  test('SQL Injection no campo nome não deve retornar 500', async ({ request }) => {
    const payloads = [
      { label: "' OR 1=1 --", value: API.SQL_OR_1_1 },
      { label: 'DROP TABLE', value: API.SQL_DROP_TABLE },
      { label: 'UNION SELECT', value: API.SQL_UNION_SELECT },
    ];

    for (const payload of payloads) {
      const response = await API.UsuarioRoute.patchUsuario(
        request, usuario, usuarioId, { nome: payload.value },
      );

      await test.step(`Payload "${payload.label}" — não deve retornar 500`, async () => {
        expect(response.status()).not.toBe(API.HTTP_500);
      });
    }
  });

  test('Mass Assignment — campos sensíveis não devem ser alterados', async ({ request }) => {
    const response = await API.UsuarioRoute.patchUsuario(
      request, usuario, usuarioId,
      { nome: 'Patch Normal', perfil: API.MASS_ASSIGNMENT_ADMIN, ativo: API.MASS_ASSIGNMENT_INACTIVE },
    );
    const body = await response.json();

    await test.step('Deve retornar 200 ou 422 (ambos seguros)', async () => {
      expect([API.HTTP_OK, API.HTTP_422]).toContain(response.status());
    });

    await test.step('Se aceito, campos sensíveis não devem ter sido alterados', async () => {
      if (response.status() === API.HTTP_OK) {
        expect(body.perfil).not.toBe('SUPER_ADMIN');
        expect(body.ativo).not.toBe(false);
      }
    });
  });

  test('XSS no campo nome — deve tratar adequadamente', async ({ request }) => {
    const response = await API.UsuarioRoute.patchUsuario(
      request, usuario, usuarioId, { nome: API.XSS_SCRIPT_ALERT },
    );

    await test.step('Não deve retornar 500', async () => {
      expect(response.status()).not.toBe(API.HTTP_500);
    });

    await test.step('Content-Type deve ser JSON', async () => {
      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('application/json');
    });
  });

  test('Stacktrace não deve ser exposto em erro', async ({ request }) => {
    const response = await API.UsuarioRoute.patchUsuario(
      request, usuario, usuarioId, { nome: null as any },
    );
    const body = await response.json().catch(() => ({}));
    const bodyStr = JSON.stringify(body);

    await test.step('Não deve retornar 500', async () => {
      // BUG: backend retorna 500 com nome: null — deveria validar no DTO
      expect(response.status()).not.toBe(API.HTTP_500);
    });

    await test.step('Não deve conter stacktrace', async () => {
      expect(bodyStr).not.toMatch(/at\s+\S+\.(ts|js):\d+/);
      expect(bodyStr).not.toContain('node_modules');
    });
  });
});
