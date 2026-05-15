import {
  test, expect, HTTP,
  describeSecuritySuite, buildUsuarioMock, UsuarioDB,
} from '../../../resources';

const { route, payload: basePayload } = buildUsuarioMock('post_usuario');

describeSecuritySuite(test, {
  descricao: 'Segurança POST /usuarios',
  route,
  method: 'POST',
  basePayload: basePayload!,

  sqlInjection: {
    campos: ['email', 'nome'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST, HTTP.CREATED, HTTP.CONFLICT],
  },

  xss: {
    campos: ['nome'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.CREATED, HTTP.BAD_REQUEST],
  },

  massAssignment: {
    camposSensiveis: { perfil: 'SUPER_ADMIN', ativo: false },
    statusEsperado: [HTTP.CREATED, HTTP.UNPROCESSABLE],
    validar: (body) => {
      if (body.perfil) expect(body.perfil).not.toBe('SUPER_ADMIN');
      if (body.ativo !== undefined) expect(body.ativo).not.toBe(false);
    },
  },

  concorrencia: {
    campoUnico: 'email',
    valorUnico: () => `race.${Date.now()}@concorrencia.qa`,
    statusConflito: HTTP.CONFLICT,
    requests: 5,
    cleanup: async (email: string) => {
      await UsuarioDB.deleteUsuarioByEmail(email);
    },
  },

  stacktrace: {
    payloadQueForcaErro: { email: null, senha: null, nome: null },
  },
});
