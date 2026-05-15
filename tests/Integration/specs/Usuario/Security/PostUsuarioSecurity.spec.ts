import { test, expect } from '../../../resources';
import * as API from '../../../resources';

const { route, payload: basePayload } = API.buildUsuarioMock('post_usuario');

API.describeSecuritySuite(test, {
  descricao: 'Segurança POST /usuarios',
  route,
  method: 'POST',
  basePayload: basePayload!,
  // Rota pública — sem usuario (não envia token)

  sqlInjection: {
    campos: ['email', 'nome'],
    statusEsperado: [API.HTTP_422, API.HTTP_BAD_REQUEST, API.HTTP_CREATED, API.HTTP_CONFLICT],
  },

  xss: {
    campos: ['nome'],
    statusEsperado: [API.HTTP_422, API.HTTP_CREATED, API.HTTP_BAD_REQUEST],
  },

  massAssignment: {
    camposSensiveis: {
      perfil: 'SUPER_ADMIN',
      ativo: false,
    },
    statusEsperado: [API.HTTP_CREATED, API.HTTP_422],
    validar: (body) => {
      if (body.perfil) expect(body.perfil).not.toBe('SUPER_ADMIN');
      if (body.ativo !== undefined) expect(body.ativo).not.toBe(false);
    },
  },

  concorrencia: {
    campoUnico: 'email',
    valorUnico: () => `race.${Date.now()}@concorrencia.qa`,
    statusConflito: API.HTTP_CONFLICT,
    requests: 5,
    cleanup: async (email: string) => {
      await API.UsuarioDB.deleteUsuarioByEmail(email);
    },
  },

  stacktrace: {
    payloadQueForcaErro: { email: null, senha: null, nome: null },
  },
});
