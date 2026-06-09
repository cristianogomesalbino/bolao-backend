const http = require('http');

const FASE_ID = '32158043-0e6e-45fa-86bd-4d8650a9ff87';
const TOTAL_RODADAS = 38;

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function login() {
  const data = JSON.stringify({ email: 'cristianogomesalbino@gmail.com', senha: 'Lk120789#' });
  const res = await request({
    hostname: 'localhost', port: 3002, path: '/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  }, data);
  const parsed = JSON.parse(res.body);
  return parsed.accessToken;
}

async function importarRodada(token, rodada) {
  const data = JSON.stringify({
    campeonatoSlug: 'brasileirao',
    faseSlug: 'fase-unica-campeonato-brasileiro-2026',
    rodada,
    faseId: FASE_ID,
  });
  const res = await request({
    hostname: 'localhost', port: 3002, path: '/jogos/importar', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'Authorization': `Bearer ${token}`,
    }
  }, data);

  if (res.status >= 400) {
    console.log(`Rodada ${rodada}: ERRO ${res.status} - ${res.body.slice(0, 150)}`);
  } else {
    try {
      const result = JSON.parse(res.body);
      console.log(`Rodada ${rodada}: OK - ${result.importados || 0} importados, ${result.jaExistentes || 0} existentes`);
    } catch {
      console.log(`Rodada ${rodada}: OK - ${res.body.slice(0, 100)}`);
    }
  }
}

async function main() {
  console.log('Login...');
  const token = await login();
  console.log('Token obtido. Importando 38 rodadas do Brasileirao 2026...\n');

  for (let rodada = 1; rodada <= TOTAL_RODADAS; rodada++) {
    await importarRodada(token, rodada);
    await new Promise(r => setTimeout(r, 800));
  }

  console.log('\n=== IMPORTACAO COMPLETA ===');
}

main().catch(e => console.error('FATAL:', e.message));
