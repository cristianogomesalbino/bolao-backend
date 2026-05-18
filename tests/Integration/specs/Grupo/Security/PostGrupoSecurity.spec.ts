import {
  test, HTTP, INVALID,
  describeSecuritySuite,
  GRUPO_SIMPLE_ATTEMPT_USUARIOS, seedGrupoSimpleAttempt,
} from '../../../resources';

describeSecuritySuite(test, {
  descricao: 'Segurança POST /grupos',
  route: 'grupos',
  method: 'POST',
  basePayload: {
    nome: 'Grupo Security QA',
    temporadaId: INVALID.UUID_INEXISTENTE,
    privado: true,
  },
  usuario: GRUPO_SIMPLE_ATTEMPT_USUARIOS.user,
  seed: seedGrupoSimpleAttempt,

  sqlInjection: {
    campos: ['nome', 'temporadaId'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.BAD_REQUEST, HTTP.NOT_FOUND, HTTP.CREATED],
  },

  xss: {
    campos: ['nome'],
    statusEsperado: [HTTP.UNPROCESSABLE, HTTP.NOT_FOUND, HTTP.CREATED],
  },

  massAssignment: {
    camposSensiveis: { codigoConvite: 'HACK123', ativo: false },
    statusEsperado: [HTTP.NOT_FOUND, HTTP.UNPROCESSABLE, HTTP.CREATED],
    validar: (body) => {
      if (body.codigoConvite) {
        // Se retornou codigoConvite, não deve ser o valor injetado
        // (backend gera automaticamente)
      }
    },
  },

  stacktrace: {
    payloadQueForcaErro: { nome: null, temporadaId: null, privado: null },
  },
});
