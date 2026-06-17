export const AUTH = {
  TAG: 'Autenticação',
  EMAIL_SERVICE_TOKEN: 'EMAIL_SERVICE',
  REFRESH_TOKEN_REPOSITORY_TOKEN: 'REFRESH_TOKEN_REPOSITORY',
  RECUPERACAO_SENHA_REPOSITORY_TOKEN: 'RECUPERACAO_SENHA_REPOSITORY',
  BCRYPT_ROUNDS: 10,
  TOKEN: {
    ACCESS_EXPIRATION: '15m',
    REFRESH_EXPIRATION: '7d',
    REFRESH_EXPIRATION_MS: 7 * 24 * 60 * 60 * 1000,
    REFRESH_EXPIRATION_SECONDS: 7 * 24 * 60 * 60, // 604800s = 7 dias
    RECUPERACAO_EXPIRATION_MS: 60 * 60 * 1000, // 1 hora
  },
  COOKIE: {
    REFRESH_TOKEN_NAME: 'refreshToken',
    PATH: '/auth',
  },
  MENSAGENS: {
    CREDENCIAIS_INVALIDAS: 'Credenciais inválidas',
    REFRESH_NAO_FORNECIDO: 'Refresh token não fornecido',
    REFRESH_INVALIDO: 'Refresh token inválido',
    REFRESH_EXPIRADO: 'Refresh token expirado',
    USUARIO_NAO_ENCONTRADO: 'Usuário não encontrado',
    LOGOUT_SUCESSO: 'Logout realizado com sucesso',
    GRUPO_NAO_INFORMADO: 'Grupo não informado',
    USUARIO_NAO_PERTENCE_GRUPO: 'Usuário não pertence a este grupo',
    SEM_PERMISSAO_GRUPO: 'Sem permissão neste grupo',
    USUARIO_NAO_AUTENTICADO: 'Usuário não autenticado',
    SEM_PERMISSAO_RECURSO: 'Sem permissão para acessar este recurso',
    RECUPERACAO_EMAIL_ENVIADO:
      'Se o email estiver cadastrado, você receberá as instruções de recuperação',
    TOKEN_RECUPERACAO_INVALIDO: 'Token de recuperação inválido',
    TOKEN_RECUPERACAO_EXPIRADO: 'Token de recuperação expirado',
    SENHA_RESETADA: 'Senha alterada com sucesso',
  },
} as const;
