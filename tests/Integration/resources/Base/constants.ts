// ============================================================
// CONSTANTES GLOBAIS — equivalente às *** Variables *** do API.robot
// ============================================================

// ---- HTTP Status Codes ----

export const HTTP = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  SERVER_ERROR: 500,
} as const;

// ---- URLs ----

export const RESOURCES_URL =
  process.env.RESOURCES_URL || 'http://localhost:3002/';
export const BASE_URL = RESOURCES_URL;

// ---- Mensagens de erro da API ----

export const MSG = {
  CREDENCIAIS_INVALIDAS: 'Credenciais inválidas',
  REFRESH_NAO_FORNECIDO: 'Refresh token não fornecido',
  REFRESH_INVALIDO: 'Refresh token inválido',
  LOGOUT_SUCESSO: 'Logout realizado com sucesso',
  USUARIO_NAO_ENCONTRADO: 'Usuário não encontrado',
  EMAIL_JA_CADASTRADO: 'Email já cadastrado',
  GRUPO_NAO_ENCONTRADO: 'Grupo não encontrado',
  TEMPORADA_NAO_ENCONTRADA: 'Temporada não encontrada',
  USUARIO_NAO_AUTENTICADO: 'Usuário não autenticado',
  SEM_PERMISSAO_RECURSO: 'Sem permissão para acessar este recurso',
  USUARIO_NAO_PERTENCE_GRUPO: 'Usuário não pertence a este grupo',
  SEM_PERMISSAO_GRUPO: 'Sem permissão neste grupo',
  JA_ESTA_NO_GRUPO: 'Você já está neste grupo',
  CODIGO_CONVITE_INVALIDO: 'Código de convite inválido',
  GRUPO_INATIVO: 'Grupo está inativo',
  DESATIVE_ANTES_EXCLUIR: 'Desative o grupo antes de excluí-lo',
} as const;

// ---- Valores inválidos para testes de campo ----

export const INVALID = {
  EMPTY: '',
  NULL: null as any,
  MAX_INT: Number.MAX_SAFE_INTEGER,
  STRING: 'aaaa',
  EMAIL: 'nao-e-email',
  SHORT_PASSWORD: '123',
  SPECIAL_CHARS: '@#$%&*123',
  MIN_CHAR: 'aa',
  CHAR_256: 'Longo preenchimento textual para validação dos limites de caracteres nos campos do payload e dos formulários de cadastro e edição. Utilizando teste automatizado com Playwright com estratégia de templates em fluxos repetidos. Temos aqui 256 caracteres aqui.',
  UUID: 'nao-e-um-uuid',
  UUID_INEXISTENTE: 'a0000000-0000-4000-a000-000000000000',
} as const;

// ---- Payloads de ataque (segurança) ----

export const ATTACK = {
  SQL_OR: "' OR 1=1 --",
  SQL_DROP: "'; DROP TABLE \"Usuario\"; --",
  SQL_UNION: "' UNION SELECT * FROM \"Usuario\" --",
  SQL_COMMENT: "admin'--",
  XSS_SCRIPT: '<script>alert(1)</script>',
  XSS_IMG: '<img src=x onerror=alert(1)>',
  XSS_EVENT: '" onmouseover="alert(1)"',
  MASS_ADMIN: 'SUPER_ADMIN',
  MASS_INACTIVE: false,
} as const;

export const MENSAGENS_NAO_TRATADAS = [
  'Internal server error',
  'Cannot',
  'Unexpected token',
  'is not defined',
  'TypeError',
  'ReferenceError',
  'should not exist',
  'must be a',
  'should not be empty',
  'must be longer than',
  'must be shorter than',
] as const;

// ---- Constantes de teste ----

export const MINIMUM_RECORD = 1;
export const EMAIL_UNAUTHORIZED = 'unauthorized@qa.bolao';

// ---- Aliases (usados por specs de CRUD via `import * as API`) ----

export const HTTP_OK = HTTP.OK;
export const HTTP_CREATED = HTTP.CREATED;
export const HTTP_BAD_REQUEST = HTTP.BAD_REQUEST;
export const HTTP_UNAUTHORIZED = HTTP.UNAUTHORIZED;
export const HTTP_FORBIDDEN = HTTP.FORBIDDEN;
export const HTTP_NOT_FOUND = HTTP.NOT_FOUND;
export const HTTP_CONFLICT = HTTP.CONFLICT;
export const HTTP_UNPROCESSABLE_ENTITY = HTTP.UNPROCESSABLE;
export const UUID_INEXISTENTE = INVALID.UUID_INEXISTENTE;
