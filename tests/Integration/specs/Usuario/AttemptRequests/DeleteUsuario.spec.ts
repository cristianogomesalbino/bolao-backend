import {
  test, HTTP, INVALID,
  describeAttemptSuite,
  USUARIO_ATTEMPT_USUARIOS, seedUsuarioAttempt, UsuarioDB,
} from '../../../resources';

// Usuário dedicado para ser deletado (não compartilha com outros specs)
const usuarioParaDeletar = {
  nome: 'Delete Attempt QA',
  email: `delete.attempt.${Date.now()}@teste.qa`,
  senha: 'Teste123!',
  perfil: 'USER' as const,
};

describeAttemptSuite(test, {
  descricao: 'Attempt DELETE /usuarios/:id',
  scenarios: [
    { perfil: 'sem_token', method: 'DELETE', statusEsperado: HTTP.UNAUTHORIZED },
    { perfil: 'super_admin', method: 'DELETE', statusEsperado: HTTP.OK },
    // Params inválidos
    { perfil: 'super_admin', method: 'DELETE', statusEsperado: HTTP.BAD_REQUEST, routeOverride: `usuarios/${INVALID.UUID}` },
    { perfil: 'super_admin', method: 'DELETE', statusEsperado: HTTP.NOT_FOUND, routeOverride: `usuarios/${INVALID.UUID_INEXISTENTE}` },
  ],
  usuarios: USUARIO_ATTEMPT_USUARIOS,
  seed: async () => {
    await seedUsuarioAttempt();
    await UsuarioDB.insertUsuario(usuarioParaDeletar);
  },
  setup: async () => {
    const userId = await UsuarioDB.selectUsuarioByEmail(usuarioParaDeletar.email);
    return { userId };
  },
  routeResolver: (data) => `usuarios/${data.userId}`,
});
