import {
  test, HTTP, INVALID,
  describeAttemptSuite,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioDelete,
} from '../../../resources';

describeAttemptSuite(test, {
  descricao: 'Attempt DELETE /usuarios/:id',
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  seed: seedUsuarioDelete,
  routeResolver: (data) => `usuarios/${data.userId}`,
  // prettier-ignore
  scenarios: [
    // [perfil,          method,   status,                  descricao,                              skip?,  routeOverride?]
    ['sem_token',        'DELETE', HTTP.UNAUTHORIZED,       'sem autenticação'],
    ['super_admin',      'DELETE', HTTP.OK,                 'admin deletando usuário'],
    ['usuario_comum',    'DELETE', HTTP.FORBIDDEN,          'UUID inválido — guard barra',         undefined, `usuarios/${INVALID.UUID}`],
    ['super_admin',      'DELETE', HTTP.BAD_REQUEST,        'UUID inválido — pipe valida formato', undefined, `usuarios/${INVALID.UUID}`],
    ['usuario_comum',    'DELETE', HTTP.FORBIDDEN,          'UUID inexistente — guard barra',      undefined, `usuarios/${INVALID.UUID_INEXISTENTE}`],
    // Método não suportado
    ['usuario_comum',    'POST',  HTTP.METHOD_NOT_ALLOWED,  'método POST não suportado',           'Backend retorna 404 em vez de 405'],
    ['usuario_comum',    'PUT',   HTTP.METHOD_NOT_ALLOWED,  'método PUT não suportado',            'Backend retorna 404 em vez de 405'],
  ],
});
