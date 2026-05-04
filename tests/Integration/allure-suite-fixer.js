/**
 * Pós-processador que corrige os labels de suite nos allure-results
 * para agrupar por módulo na view Suites do Allure.
 *
 * Resultado esperado:
 *   parentSuite: Auth
 *   suite: Requests | Attempt Requests
 *   subSuite: Auth Suite | Attempt POST /auth/login | ...
 */
const fs = require('fs');
const path = require('path');

const resultsDir = path.resolve(__dirname, 'results/allure-results');

if (!fs.existsSync(resultsDir)) {
  console.log('[allure-suite-fixer] Nenhum resultado encontrado.');
  process.exit(0);
}

const files = fs
  .readdirSync(resultsDir)
  .filter((f) => f.endsWith('-result.json'));

let count = 0;

for (const file of files) {
  const filePath = path.join(resultsDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  const fullName = data.fullName || '';
  const titlePath = data.titlePath || [];

  // Extrai módulo do fullName
  // "Auth/login.spec.ts:12:7" → Auth
  // "../resources/Templates/AttemptRequestsTemplate.ts:408:9" → usa titlePath
  let modulo = '';
  let isAttempt = false;

  const fnMatch = fullName.match(
    /^([A-Za-z]+)\/(AttemptRequests\/)?/,
  );

  if (fnMatch) {
    modulo = fnMatch[1];
    isAttempt = !!fnMatch[2];
  } else {
    // Attempt specs: fullName aponta pro template
    // titlePath: ["..", "resources", ..., "Auth/AttemptRequests/PostLogin.spec.ts", "Attempt POST /auth/login"]
    for (const part of titlePath) {
      const match = part.match(
        /^([A-Za-z]+)\/(AttemptRequests\/)?/,
      );
      if (match) {
        modulo = match[1];
        isAttempt = !!match[2];
        break;
      }
    }
  }

  if (!modulo) continue;

  const suite = isAttempt ? 'Attempt Requests' : 'Requests';

  // subSuite = o describe do teste
  // titlePath para login.spec: ["Auth", "login.spec.ts", "Auth Suite"]
  // titlePath para attempt: ["..", "resources", ..., "Auth/.../PostLogin.spec.ts", "Attempt POST /auth/login"]
  // O último elemento do titlePath é o nome do teste, o penúltimo é o describe
  // Mas precisamos do describe, não do arquivo
  let subSuite = '';

  // Filtra titlePath: pega elementos que não são paths de arquivo
  const describes = titlePath.filter(
    (p) =>
      !p.includes('.spec.ts') &&
      !p.includes('.ts:') &&
      p !== '..' &&
      p !== 'resources' &&
      p !== 'Templates' &&
      p !== modulo &&
      p.length > 0,
  );

  if (describes.length > 0) {
    // O último describe é o subSuite
    subSuite = describes[describes.length - 1];
  }

  // Fallback: se não encontrou, usa o nome do arquivo
  if (!subSuite) {
    const fileMatch = fullName.match(/([^/]+)\.spec\.ts/);
    subSuite = fileMatch ? fileMatch[1] : 'Unknown';
  }

  // Remove labels existentes de suite
  data.labels = (data.labels || []).filter(
    (l) =>
      !['parentSuite', 'suite', 'subSuite'].includes(l.name),
  );

  // Adiciona labels corretos
  data.labels.push(
    { name: 'parentSuite', value: modulo },
    { name: 'suite', value: suite },
    { name: 'subSuite', value: subSuite },
  );

  fs.writeFileSync(filePath, JSON.stringify(data));
  count++;
}

console.log(
  `[allure-suite-fixer] ${count} resultado(s) processado(s).`,
);
