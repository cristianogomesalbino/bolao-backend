const fs = require('fs');
const BASE = 'http://localhost:3002';

let passed = 0, failed = 0, results = [];

async function req(method, path, body, token) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, body: data };
}

function test(id, desc, actual, expected, extra) {
  const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
  if (ok) { passed++; results.push(`✅ ${id} ${desc}`); }
  else { failed++; results.push(`❌ ${id} ${desc} — esperado: ${typeof expected === 'function' ? 'custom' : expected}, recebido: ${actual}${extra ? ' | ' + extra : ''}`); }
}

async function main() {
  results.push('=== TESTES E2E — BOLÃO BACKEND ===\n');

  // 1. Health
  const h = await req('GET', '/health');
  test('1.1', 'Health check', h.status, 200);

  // 2. Auth — criar usuário primeiro
  await req('POST', '/usuarios', null, null); // limpar
  const u1 = await req('POST', '/usuarios', { nome: 'Admin', email: 'admin@e2e.com', senha: 'senha123' });
  test('3.1', 'Criar usuário', u1.status, 201);
  test('3.1b', 'Sem senha no retorno', u1.body?.senha, undefined);

  const u2 = await req('POST', '/usuarios', { nome: 'Membro', email: 'membro@e2e.com', senha: 'senha123' });
  test('3.1c', 'Criar segundo usuário', u2.status, 201);

  // Login
  const login1 = await req('POST', '/auth/login', { email: 'admin@e2e.com', senha: 'senha123' });
  test('2.1', 'Login válido', login1.status, 201);
  test('2.1b', 'Tem accessToken', !!login1.body?.accessToken, true);
  const T1 = login1.body?.accessToken;

  const login2 = await req('POST', '/auth/login', { email: 'membro@e2e.com', senha: 'senha123' });
  const T2 = login2.body?.accessToken;

  // Login inválido
  const loginBad = await req('POST', '/auth/login', { email: 'x@x.com', senha: 'senha123' });
  test('2.2', 'Login email inexistente', loginBad.status, 401);

  const loginBadPw = await req('POST', '/auth/login', { email: 'admin@e2e.com', senha: 'errada' });
  test('2.3', 'Login senha errada', loginBadPw.status, 401);

  // Refresh
  const refresh = await req('POST', '/auth/refresh', { refreshToken: login1.body?.refreshToken });
  test('2.5', 'Refresh válido', refresh.status, 201);

  const refreshBad = await req('POST', '/auth/refresh', { refreshToken: 'lixo' });
  test('2.6', 'Refresh inválido', refreshBad.status, 401);

  // Perfil
  const me = await req('GET', '/usuarios/me', null, T1);
  test('3.4', 'Buscar perfil', me.status, 200);

  const meNoAuth = await req('GET', '/usuarios/me');
  test('3.5', 'Perfil sem auth', meNoAuth.status, 401);

  // Promover admin pra SUPER_ADMIN (via script interno)
  // Não temos endpoint pra isso, vamos pular testes de SUPER_ADMIN por enquanto

  // 4. Campeonatos
  const camp = await req('POST', '/campeonatos', { nome: 'Brasileirão E2E' }, T1);
  test('4.1', 'Criar campeonato', camp.status, 201);
  const campId = camp.body?.id;

  const campList = await req('GET', '/campeonatos', null, T1);
  test('4.3', 'Listar campeonatos', campList.status, 200);

  const campNoAuth = await req('GET', '/campeonatos');
  test('4.4', 'Campeonatos sem auth', campNoAuth.status, 401);

  // 5. Temporadas
  const temp = await req('POST', '/temporadas', { ano: 2026, campeonatoId: campId }, T1);
  test('5.1', 'Criar temporada', temp.status, 201);
  const tempId = temp.body?.id;

  const tempBad = await req('POST', '/temporadas', { ano: 2026, campeonatoId: '00000000-0000-0000-0000-000000000000' }, T1);
  test('5.2', 'Temporada camp inexistente', tempBad.status, 404);

  // 6. Grupos
  const grupo = await req('POST', '/grupos', { nome: 'Bolão E2E', temporadaId: tempId, privado: true, permitirPalpiteDobrado: true }, T1);
  test('6.1', 'Criar grupo privado', grupo.status, 201);
  test('6.1b', 'Tem codigoConvite', !!grupo.body?.codigoConvite, true);
  const grupoId = grupo.body?.id;
  const codigoConvite = grupo.body?.codigoConvite;

  const grupoPublico = await req('POST', '/grupos', { nome: 'Bolão Público E2E', temporadaId: tempId, privado: false }, T1);
  test('6.2', 'Criar grupo público', grupoPublico.status, 201);

  const grupoList = await req('GET', '/grupos', null, T1);
  test('6.4', 'Listar grupos', grupoList.status, 200);

  const grupoBusca = await req('GET', `/grupos/${grupoId}`, null, T1);
  test('6.5', 'Buscar grupo por ID', grupoBusca.status, 200);

  // 7. Membros
  const entrar = await req('POST', '/grupos/entrar', { codigoConvite }, T2);
  test('7.1', 'Entrar por convite', entrar.status, 201);

  const entrarDup = await req('POST', '/grupos/entrar', { codigoConvite }, T2);
  test('7.4', 'Entrar já no grupo', entrarDup.status, 409);

  const membros = await req('GET', `/grupos/${grupoId}/membros`, null, T1);
  test('7.9', 'Listar membros', membros.status, 200);
  test('7.9b', 'Tem 2 membros', membros.body?.length, 2);

  // 8. Fases
  const fase = await req('POST', `/temporadas/${tempId}/fases`, { nome: 'Rodada 1', tipo: 'PONTOS_CORRIDOS', ordem: 1 }, T1);
  test('8.1', 'Criar fase PC', fase.status, 201);
  const faseId = fase.body?.id;

  const faseMM = await req('POST', `/temporadas/${tempId}/fases`, { nome: 'Quartas', tipo: 'MATA_MATA', ordem: 2 }, T1);
  test('8.2b', 'Criar fase MM', faseMM.status, 201);

  const faseIdaVoltaErr = await req('POST', `/temporadas/${tempId}/fases`, { nome: 'Err', tipo: 'PONTOS_CORRIDOS', ordem: 3, idaVolta: true }, T1);
  test('8.4', 'PC com idaVolta → erro', faseIdaVoltaErr.status, 400);

  const faseList = await req('GET', `/temporadas/${tempId}/fases`, null, T1);
  test('8.6', 'Listar fases', faseList.status, 200);

  // 9. Jogos — Criar times primeiro
  // Criar times via Prisma não é possível via API, vamos usar IDs de string
  const jogo = await req('POST', `/fases/${faseId}/jogos`, { timeCasaId: 'time-casa-1', timeForaId: 'time-fora-1', dataHora: '2026-12-15T16:00:00.000Z' }, T1);
  test('9.1', 'Criar jogo', jogo.status, 201);
  test('9.1b', 'Status AGENDADO', jogo.body?.status, 'AGENDADO');
  test('9.1c', 'fonteResultado MANUAL', jogo.body?.fonteResultado, 'MANUAL');
  const jogoId = jogo.body?.id;

  const jogoTimesIguais = await req('POST', `/fases/${faseId}/jogos`, { timeCasaId: 'a', timeForaId: 'a', dataHora: '2026-12-15T16:00:00.000Z' }, T1);
  test('9.2', 'Times iguais', jogoTimesIguais.status, 400);

  const jogoList = await req('GET', `/fases/${faseId}/jogos`, null, T1);
  test('9.6', 'Listar jogos', jogoList.status, 200);

  const jogoBusca = await req('GET', `/jogos/${jogoId}`, null, T1);
  test('9.7', 'Buscar jogo', jogoBusca.status, 200);

  // 10. Transições de status
  const jogoUpdate = await req('PATCH', `/jogos/${jogoId}`, { status: 'EM_ANDAMENTO' }, T1);
  test('10.4', 'AGENDADO → EM_ANDAMENTO', jogoUpdate.status, 200);

  // Criar outro jogo pra finalizar
  const jogo2 = await req('POST', `/fases/${faseId}/jogos`, { timeCasaId: 'time-casa-2', timeForaId: 'time-fora-2', dataHora: '2026-12-15T18:00:00.000Z' }, T1);
  const jogo2Id = jogo2.body?.id;
  await req('PATCH', `/jogos/${jogo2Id}`, { status: 'EM_ANDAMENTO' }, T1);

  // 11. Finalização PC
  const fin = await req('PATCH', `/jogos/${jogoId}/finalizar`, { golsCasa: 2, golsFora: 1 }, T1);
  test('11.1', 'Finalizar PC vitória casa', fin.status, 200);
  test('11.1b', 'vencedorId = timeCasaId', fin.body?.vencedorId, 'time-casa-1');

  const fin2 = await req('PATCH', `/jogos/${jogo2Id}/finalizar`, { golsCasa: 1, golsFora: 1 }, T1);
  test('11.3', 'Finalizar PC empate', fin2.status, 200);
  test('11.3b', 'vencedorId null', fin2.body?.vencedorId, null);

  // Jogo finalizado não pode ser atualizado
  const finUpdate = await req('PATCH', `/jogos/${jogoId}`, { dataHora: '2026-12-20T16:00:00.000Z' }, T1);
  test('10.8', 'Atualizar FINALIZADO → erro', finUpdate.status, 400);

  // 26. Palpites — criar jogo AGENDADO pra palpites
  const jogoPalpite = await req('POST', `/fases/${faseId}/jogos`, { timeCasaId: 'time-casa-3', timeForaId: 'time-fora-3', dataHora: '2026-12-20T16:00:00.000Z' }, T1);
  const jogoPalpiteId = jogoPalpite.body?.id;

  const palpite = await req('POST', `/jogos/${jogoPalpiteId}/palpites`, { golsCasa: 2, golsFora: 1 }, T1);
  test('26.1', 'Criar palpite', palpite.status, 201);
  test('26.1b', 'Tem id', !!palpite.body?.id, true);
  const palpiteId = palpite.body?.id;

  const palpiteDup = await req('POST', `/jogos/${jogoPalpiteId}/palpites`, { golsCasa: 3, golsFora: 0 }, T1);
  test('26.5', 'Palpite duplicado', palpiteDup.status, 409);

  // Palpite do membro
  const palpiteM = await req('POST', `/jogos/${jogoPalpiteId}/palpites`, { golsCasa: 0, golsFora: 2 }, T2);
  test('26.1c', 'Palpite membro', palpiteM.status, 201);

  // Editar palpite
  const palpiteEdit = await req('PATCH', `/palpites/${palpiteId}`, { golsCasa: 3, golsFora: 0 }, T1);
  test('26.7', 'Editar palpite', palpiteEdit.status, 200);
  test('26.7b', 'Dados atualizados', palpiteEdit.body?.golsCasa, 3);

  // Editar palpite de outro
  const palpiteEditOutro = await req('PATCH', `/palpites/${palpiteId}`, { golsCasa: 0, golsFora: 0 }, T2);
  test('26.8', 'Editar palpite outro → 403', palpiteEditOutro.status, 403);

  // Buscar meu palpite
  const meuPalpite = await req('GET', `/jogos/${jogoPalpiteId}/meu-palpite`, null, T1);
  test('27.1', 'Buscar meu palpite', meuPalpite.status, 200);
  test('27.1b', 'golsCasa correto', meuPalpite.body?.golsCasa, 3);

  // Listar meus palpites
  const meusPalpites = await req('GET', '/meus-palpites', null, T1);
  test('27.4', 'Listar meus palpites', meusPalpites.status, 200);
  test('27.4b', 'Tem palpites', meusPalpites.body?.length >= 1, true);

  // 28. Visibilidade — jogo AGENDADO → só meu palpite
  const visAgendado = await req('GET', `/grupos/${grupoId}/jogos/${jogoPalpiteId}/palpites`, null, T1);
  test('28.2', 'Jogo AGENDADO → só meu', visAgendado.status, 200);
  test('28.2b', 'Apenas 1 palpite', visAgendado.body?.length, 1);

  // Finalizar jogo pra testar visibilidade FINALIZADO
  await req('PATCH', `/jogos/${jogoPalpiteId}`, { status: 'EM_ANDAMENTO' }, T1);
  await req('PATCH', `/jogos/${jogoPalpiteId}/finalizar`, { golsCasa: 2, golsFora: 1 }, T1);

  const visFinalizado = await req('GET', `/grupos/${grupoId}/jogos/${jogoPalpiteId}/palpites`, null, T1);
  test('28.1', 'Jogo FINALIZADO → todos', visFinalizado.status, 200);
  test('28.1b', '2 palpites visíveis', visFinalizado.body?.length, 2);

  // 30. Token Dobro — saldo
  const saldo = await req('GET', `/grupos/${grupoId}/tokens-dobro/saldo`, null, T1);
  test('30.1', 'Consultar saldo', saldo.status, 200);

  const historico = await req('GET', `/grupos/${grupoId}/tokens-dobro/historico`, null, T1);
  test('30.4', 'Consultar histórico', historico.status, 200);

  // 31. Configuração dobro
  const confDobro = await req('PATCH', `/grupos/${grupoId}/configuracao-dobro`, { permitirPalpiteDobrado: true }, T1);
  test('31.1', 'Habilitar dobro (admin)', confDobro.status, 200);

  const confDobroMembro = await req('PATCH', `/grupos/${grupoId}/configuracao-dobro`, { permitirPalpiteDobrado: false }, T2);
  test('31.3', 'Configurar dobro (membro) → 403', confDobroMembro.status, 403);

  // 32. Ranking
  const rankGeral = await req('GET', `/grupos/${grupoId}/ranking/geral`, null, T1);
  test('32.1', 'Ranking geral', rankGeral.status, 200);
  test('32.1b', 'É array', Array.isArray(rankGeral.body), true);

  const rankFase = await req('GET', `/grupos/${grupoId}/ranking/fases/${faseId}`, null, T1);
  test('32.5', 'Ranking por fase', rankFase.status, 200);

  // 33. Detalhamento
  const detalhe = await req('GET', `/grupos/${grupoId}/ranking/jogos/${jogoPalpiteId}`, null, T1);
  test('33.1', 'Detalhamento jogo finalizado', detalhe.status, 200);
  test('33.1b', 'Tem categoriaAcerto', detalhe.body?.[0]?.categoriaAcerto !== undefined, true);

  // 34. Processar pontuação
  const processar = await req('POST', `/grupos/${grupoId}/ranking/processar-jogo/${jogoPalpiteId}`, null, T1);
  test('34.1', 'Processar pontuação (admin)', processar.status, 201);

  // 25. Formato de erro
  const errValidacao = await req('POST', '/usuarios', {});
  test('25.1', 'Erro validação formato correto', !!errValidacao.body?.erros, true);

  // Excluir palpite
  // Criar novo jogo AGENDADO pra excluir palpite
  const jogoExcluir = await req('POST', `/fases/${faseId}/jogos`, { timeCasaId: 'time-casa-4', timeForaId: 'time-fora-4', dataHora: '2026-12-25T16:00:00.000Z' }, T1);
  const jogoExcluirId = jogoExcluir.body?.id;
  const palpiteExcluir = await req('POST', `/jogos/${jogoExcluirId}/palpites`, { golsCasa: 1, golsFora: 0 }, T1);
  const palpiteExcluirId = palpiteExcluir.body?.id;

  const excluir = await req('DELETE', `/palpites/${palpiteExcluirId}`, null, T1);
  test('26.11', 'Excluir palpite', excluir.status, 200);

  // Logout
  const logout = await req('POST', '/auth/logout', { refreshToken: login1.body?.refreshToken }, T1);
  test('2.8', 'Logout', logout.status, 201);

  // Resumo
  results.push(`\n=== RESULTADO: ${passed} ✅ | ${failed} ❌ | Total: ${passed + failed} ===`);
  fs.writeFileSync('/app/e2e-results.txt', results.join('\n'));
}

main().catch(e => {
  results.push(`\n💥 ERRO FATAL: ${e.message}`);
  results.push(`\n=== RESULTADO: ${passed} ✅ | ${failed} ❌ | Total: ${passed + failed} ===`);
  fs.writeFileSync('/app/e2e-results.txt', results.join('\n'));
});
