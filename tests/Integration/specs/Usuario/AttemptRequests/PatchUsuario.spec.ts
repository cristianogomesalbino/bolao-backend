import {
  test, HTTP, INVALID,
  describeAttemptSuite, buildUsuarioMock,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttemptWithId,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt PATCH /usuarios/:id',
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  seed: seedUsuarioAttemptWithId,
  routeResolver: (data) => `usuarios/${data.userId}`,
  payloadResolver: () => ({
    ...buildUsuarioMock('patch_usuario').payload,
    nome: `Attempt Patch ${Date.now()}`,
  }),
  // prettier-ignore
  scenarios: [
    // [perfil,          method,   status,                  descricao,                                skip?,  routeOverride?]
    ['sem_token',        'PATCH',  HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['usuario_comum',    'PATCH',  HTTP.OK,                 'atualizando próprio perfil'],
    ['super_admin',      'PATCH',  HTTP.OK,                 'admin atualizando outro usuário'],
    ['usuario_comum',    'PATCH',  HTTP.FORBIDDEN,          'UUID inválido — guard barra',           undefined, `usuarios/${INVALID.UUID}`],
    ['super_admin',      'PATCH',  HTTP.BAD_REQUEST,        'UUID inválido — pipe valida formato',   undefined, `usuarios/${INVALID.UUID}`],
    ['usuario_comum',    'PATCH',  HTTP.FORBIDDEN,          'UUID inexistente — guard barra',        undefined, `usuarios/${INVALID.UUID_INEXISTENTE}`],
    // Método não suportado
    ['usuario_comum',    'POST',   HTTP.METHOD_NOT_ALLOWED, 'método POST não suportado',             'Backend retorna 404 em vez de 405'],
    ['usuario_comum',    'PUT',    HTTP.METHOD_NOT_ALLOWED, 'método PUT não suportado',              'Backend retorna 404 em vez de 405'],
  ],
});
