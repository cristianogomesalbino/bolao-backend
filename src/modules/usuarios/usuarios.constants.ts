export const TOURS_VALIDOS = [
  'tour-home',
  'tour-grupo',
  'tour-palpites',
] as const;

export type TourId = (typeof TOURS_VALIDOS)[number];

export const USUARIOS = {
  TAG: 'Usuarios',
  REPOSITORY_TOKEN: 'USUARIO_REPOSITORY',
  MENSAGENS: {
    EMAIL_JA_CADASTRADO: 'Email já cadastrado',
    USUARIO_NAO_ENCONTRADO: 'Usuário não encontrado',
    USUARIO_JA_INATIVO: 'Usuário já está inativo',
    USUARIO_DESATIVADO: 'Usuário desativado com sucesso',
    TOUR_MARCADO_COMPLETO: 'Tour marcado como completo',
    TOUR_ID_INVALIDO: 'tourId deve ser um dos valores válidos',
  },
} as const;
