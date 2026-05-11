// ============================================================
// CONSTANTES GLOBAIS — equivalente às *** Variables *** do API.robot
// ============================================================

// HTTP Status Codes
export const HTTP_OK = 200;
export const HTTP_CREATED = 201;
export const HTTP_NO_CONTENT = 204;
export const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_FORBIDDEN = 403;
export const HTTP_NOT_FOUND = 404;
export const HTTP_METHOD_NOT_ALLOWED = 405;
export const HTTP_CONFLICT = 409;
export const HTTP_UNPROCESSABLE_ENTITY = 422;
export const HTTP_INTERNAL_SERVER_ERROR = 500;

// URLs
export const RESOURCES_URL =
  process.env.RESOURCES_URL || 'http://localhost:3002/';
export const BASE_URL = RESOURCES_URL;

// Mensagens de erro da API (espelhando as constantes do backend)
export const MSG_CREDENCIAIS_INVALIDAS = 'Credenciais inválidas';
export const MSG_REFRESH_NAO_FORNECIDO = 'Refresh token não fornecido';
export const MSG_REFRESH_INVALIDO = 'Refresh token inválido';
export const MSG_LOGOUT_SUCESSO = 'Logout realizado com sucesso';
export const MSG_USUARIO_NAO_ENCONTRADO = 'Usuário não encontrado';
export const MSG_EMAIL_JA_CADASTRADO = 'Email já cadastrado';
export const MSG_GRUPO_NAO_ENCONTRADO = 'Grupo não encontrado';
export const MSG_TEMPORADA_NAO_ENCONTRADA = 'Temporada não encontrada';
export const MSG_USUARIO_NAO_AUTENTICADO = 'Usuário não autenticado';
export const MSG_SEM_PERMISSAO_RECURSO =
  'Sem permissão para acessar este recurso';
export const MSG_USUARIO_NAO_PERTENCE_GRUPO =
  'Usuário não pertence a este grupo';
export const MSG_SEM_PERMISSAO_GRUPO = 'Sem permissão neste grupo';
export const MSG_JA_ESTA_NO_GRUPO = 'Você já está neste grupo';
export const MSG_CODIGO_CONVITE_INVALIDO = 'Código de convite inválido';
export const MSG_GRUPO_INATIVO = 'Grupo está inativo';
export const MSG_DESATIVE_ANTES_EXCLUIR = 'Desative o grupo antes de excluí-lo';

// Constantes de teste
export const MINIMUM_RECORD = 1;
export const EMAIL_UNAUTHORIZED = 'unauthorized@qa.bolao';
export const UUID_INEXISTENTE = 'a0000000-0000-4000-a000-000000000000';
export const UUID_INVALIDO = 'nao-e-um-uuid';

// Valores inválidos para testes de campo
export const EMPTY = '';
export const MAX_INT = Number.MAX_SAFE_INTEGER;
export const INVALID_STRING = 'aaaa';
export const INVALID_EMAIL = 'nao-e-email';
export const SHORT_PASSWORD = '123';
export const SPECIAL_CHARS = '@#$%&*123';
export const NULL_VALUE = null;
export const MIN_CHAR = 'aa'
export const CHAR_256 =
  'Longo preenchimento textual para validação dos limites de caracteres nos campos do payload e dos formulários de cadastro e edição. Utilizando teste automatizado com Playwright com estratégia de templates em fluxos repetidos. Temos aqui 256 caracteres aqui.';