import {
  test, expect, HTTP, ATTACK,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttempt,
  UsuarioDB, UsuarioRoute,
} from '../../../resources';

const usuario = USUARIO_ATTEMPT_USUARIOS.usuario_comum;

test.describe('Segurança PATCH /usuarios/:id', () => {
  let usuarioId: string;

  test.beforeAll(async () => {
    await seedUsuarioAttempt();
    const userId = await UsuarioDB.selectUsuarioByEmail(usuario.email);
    usuarioId = userId!;
  });

  test('SQL Injection no campo nome não deve retornar 500', async ({ request }) => {
    const payloads = [
      { label: "' OR 1=1 --", value: ATTACK.SQL_OR },
      { label: 'DROP TABLE', value: ATTACK.SQL_DROP },
      { label: 'UNION SELECT', value: ATTACK.SQL_UNION },
    ];

    for (const payload of payloads) {
      const response = await UsuarioRoute.patchUsuario(
        request, usuario, usuarioId, { nome: payload.value },
      );

      await test.step(`Payload "${payload.label}" — não deve retornar 500`, async () => {
        expect(response.status()).not.toBe(HTTP.SERVER_ERROR);
      });
    }
  });

  test('Mass Assignment — campos sensíveis não devem ser alterados', async ({ request }) => {
    const response = await UsuarioRoute.patchUsuario(
      request, usuario, usuarioId,
      { nome: 'Patch Normal', perfil: ATTACK.MASS_ADMIN, ativo: ATTACK.MASS_INACTIVE },
    );
    const body = await response.json();

    await test.step('Deve retornar 200 ou 422 (ambos seguros)', async () => {
      expect([HTTP.OK, HTTP.UNPROCESSABLE]).toContain(response.status());
    });

    await test.step('Se aceito, campos sensíveis não devem ter sido alterados', async () => {
      if (response.status() === HTTP.OK) {
        expect(body.perfil).not.toBe('SUPER_ADMIN');
        expect(body.ativo).not.toBe(false);
      }
    });
  });

  test('XSS no campo nome — deve tratar adequadamente', async ({ request }) => {
    const response = await UsuarioRoute.patchUsuario(
      request, usuario, usuarioId, { nome: ATTACK.XSS_SCRIPT },
    );

    await test.step('Não deve retornar 500', async () => {
      expect(response.status()).not.toBe(HTTP.SERVER_ERROR);
    });

    await test.step('Content-Type deve ser JSON', async () => {
      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('application/json');
    });
  });

  test('Stacktrace não deve ser exposto em erro', async ({ request }) => {
    const response = await UsuarioRoute.patchUsuario(
      request, usuario, usuarioId, { nome: null as any },
    );
    const body = await response.json().catch(() => ({}));
    const bodyStr = JSON.stringify(body);

    await test.step('Não deve retornar 500', async () => {
      // BUG: backend retorna 500 com nome: null — deveria validar no DTO
      expect(response.status()).not.toBe(HTTP.SERVER_ERROR);
    });

    await test.step('Não deve conter stacktrace', async () => {
      expect(bodyStr).not.toMatch(/at\s+\S+\.(ts|js):\d+/);
      expect(bodyStr).not.toContain('node_modules');
    });
  });
});
