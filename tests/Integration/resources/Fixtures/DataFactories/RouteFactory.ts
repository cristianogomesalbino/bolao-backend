// ============================================================
// ROUTE FACTORY — Catálogo centralizado de rotas da API
// ============================================================

const UUID_CONST = '00000000-0000-0000-0000-000000000000';

export function factoryRoute(target: string): string {
  const routes: Record<string, string> = {
    // Health
    HEALTH_ROUTE: 'health',

    // Auth
    AUTH_LOGIN_ROUTE: 'auth/login',
    AUTH_REFRESH_ROUTE: 'auth/refresh',
    AUTH_LOGOUT_ROUTE: 'auth/logout',
    AUTH_ESQUECI_SENHA_ROUTE: 'auth/esqueci-senha',
    AUTH_RESETAR_SENHA_ROUTE: 'auth/resetar-senha',

    // Usuarios
    USUARIO_DEFAULT_ROUTE: 'usuarios',
    USUARIO_ME_ROUTE: 'usuarios/me',
    USUARIO_BY_ID_ROUTE: `usuarios/${UUID_CONST}`,

    // Campeonatos
    CAMPEONATO_DEFAULT_ROUTE: 'campeonatos',

    // Temporadas
    TEMPORADA_DEFAULT_ROUTE: 'temporadas',

    // Grupos
    GRUPO_DEFAULT_ROUTE: 'grupos',
    GRUPO_BY_ID_ROUTE: `grupos/${UUID_CONST}`,
    GRUPO_STATUS_ROUTE: `grupos/${UUID_CONST}/status`,
    GRUPO_ENTRAR_ROUTE: 'grupos/entrar',
    GRUPO_ADICIONAR_ROUTE: `grupos/${UUID_CONST}/adicionar`,
    GRUPO_MEMBROS_ROUTE: `grupos/${UUID_CONST}/membros`,
    GRUPO_SAIR_ROUTE: `grupos/${UUID_CONST}/sair`,
    GRUPO_REMOVER_MEMBRO_ROUTE: `grupos/${UUID_CONST}/usuarios/${UUID_CONST}`,

    // Fases
    FASE_DEFAULT_ROUTE: `temporadas/${UUID_CONST}/fases`,
    FASE_BY_ID_ROUTE: `temporadas/${UUID_CONST}/fases/${UUID_CONST}`,

    // Jogos
    JOGO_DEFAULT_ROUTE: `fases/${UUID_CONST}/jogos`,
    JOGO_BY_ID_ROUTE: `jogos/${UUID_CONST}`,
    JOGO_FINALIZAR_ROUTE: `jogos/${UUID_CONST}/finalizar`,
    JOGO_IMPORTAR_ROUTE: 'jogos/importar',
    JOGO_SINCRONIZAR_ROUTE: `fases/${UUID_CONST}/jogos/sincronizar`,

    // Palpites
    PALPITE_CRIAR_ROUTE: `jogos/${UUID_CONST}/palpites`,
    PALPITE_BY_ID_ROUTE: `palpites/${UUID_CONST}`,
    PALPITE_MEU_ROUTE: `jogos/${UUID_CONST}/meu-palpite`,
    MEUS_PALPITES_ROUTE: 'meus-palpites',
    PALPITE_GRUPO_JOGO_ROUTE: `grupos/${UUID_CONST}/jogos/${UUID_CONST}/palpites`,

    // Ranking
    RANKING_GERAL_ROUTE: `grupos/${UUID_CONST}/ranking/geral`,
    RANKING_FASE_ROUTE: `grupos/${UUID_CONST}/ranking/fases/${UUID_CONST}`,
    RANKING_JOGO_ROUTE: `grupos/${UUID_CONST}/ranking/jogos/${UUID_CONST}`,
    RANKING_PROCESSAR_ROUTE: `grupos/${UUID_CONST}/ranking/processar-jogo/${UUID_CONST}`,

    // Palpite Dobrado
    DOBRO_ATIVAR_ROUTE: `grupos/${UUID_CONST}/jogos/${UUID_CONST}/dobro`,
    DOBRO_SALDO_ROUTE: `grupos/${UUID_CONST}/tokens-dobro/saldo`,
    DOBRO_HISTORICO_ROUTE: `grupos/${UUID_CONST}/tokens-dobro/historico`,
    DOBRO_CONFIGURAR_ROUTE: `grupos/${UUID_CONST}/configuracao-dobro`,
  };

  return routes[target];
}

/** Rotas públicas que não exigem autenticação */
export function buildPublicRoutes(): Record<string, string> {
  return {
    HEALTH_ROUTE: 'health',
    AUTH_LOGIN_ROUTE: 'auth/login',
    AUTH_REFRESH_ROUTE: 'auth/refresh',
    AUTH_ESQUECI_SENHA_ROUTE: 'auth/esqueci-senha',
    AUTH_RESETAR_SENHA_ROUTE: 'auth/resetar-senha',
    USUARIO_DEFAULT_ROUTE: 'usuarios', // POST é público
  };
}
