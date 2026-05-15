/**
 * Pós-processador que corrige os labels de suite nos allure-results
 * para agrupar por módulo na view Suites e Behaviors do Allure.
 *
 * Resultado esperado (Suites):
 *   parentSuite: Usuario
 *   suite: Permissão | Campos Inválidos | Requests
 *   subSuite: Attempt POST /usuarios | Attempt POST /usuarios - Campos Inválidos | ...
 *
 * Resultado esperado (Behaviors):
 *   feature: Usuario
 *   story: Attempt POST /usuarios | Attempt POST /usuarios - Campos Inválidos | ...
 */
const fs = require('fs');
const path = require('path');

// Quando roda dentro do container, results/ fica em __dirname/results/
// Quando roda no host, results/ fica na raiz do projeto
const localResults = path.resolve(__dirname, 'results/allure-results');
const rootResults = path.resolve(__dirname, '../../results/allure-results');
const resultsDir = fs.existsSync(localResults) ? localResults : rootResults;

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

  // Extrai módulo e tipo do spec
  let modulo = '';
  let isAttempt = false;
  let isInvalidFields = false;
  let isSecurity = false;

  const fnMatch = fullName.match(/^([A-Za-z]+)\/(AttemptRequests\/|Security\/)?/);

  if (fnMatch) {
    modulo = fnMatch[1];
    isAttempt = !!fnMatch[2] && fnMatch[2] === 'AttemptRequests/';
    isSecurity = !!fnMatch[2] && fnMatch[2] === 'Security/';
  } else {
    // Attempt specs: fullName aponta pro template
    // titlePath contém o path do spec real
    for (const part of titlePath) {
      const match = part.match(/^([A-Za-z]+)\/(AttemptRequests\/|Security\/)?/);
      if (match) {
        modulo = match[1];
        isAttempt = !!match[2] && match[2] === 'AttemptRequests/';
        isSecurity = !!match[2] && match[2] === 'Security/';
        break;
      }
    }
  }

  if (!modulo) continue;

  // Detecta se é InvalidFields ou Security pelo nome do spec no titlePath
  for (const part of titlePath) {
    if (part.includes('InvalidFields')) {
      isInvalidFields = true;
      break;
    }
    if (part.includes('Security')) {
      isSecurity = true;
      break;
    }
  }

  // Define suite baseado no tipo
  let suite;
  if (isSecurity) {
    suite = 'Segurança';
  } else if (isInvalidFields) {
    suite = 'Campos Inválidos';
  } else if (isAttempt) {
    suite = 'Permissão';
  } else {
    suite = 'Requests';
  }

  // subSuite = o describe do teste (último elemento não-arquivo do titlePath)
  let subSuite = '';
  const describes = titlePath.filter(
    (p) =>
      !p.includes('.spec.ts') &&
      !p.includes('.ts:') &&
      !p.includes('.ts') &&
      p !== '..' &&
      p !== 'resources' &&
      p !== 'Templates' &&
      p !== modulo &&
      p.length > 0,
  );

  if (describes.length > 0) {
    subSuite = describes[describes.length - 1];
  }

  // Fallback: se não encontrou, usa o nome do arquivo
  if (!subSuite) {
    const fileMatch = fullName.match(/([^/]+)\.spec\.ts/);
    subSuite = fileMatch ? fileMatch[1] : 'Unknown';
  }

  // Remove labels existentes que vamos sobrescrever
  data.labels = (data.labels || []).filter(
    (l) =>
      !['parentSuite', 'suite', 'subSuite', 'feature', 'story'].includes(
        l.name,
      ),
  );

  // Adiciona labels de Suites (hierarquia na view Suites)
  data.labels.push(
    { name: 'parentSuite', value: modulo },
    { name: 'suite', value: suite },
    { name: 'subSuite', value: subSuite },
  );

  // Adiciona labels de Behaviors (hierarquia na view Behaviors)
  data.labels.push(
    { name: 'feature', value: modulo },
    { name: 'story', value: subSuite },
  );

  fs.writeFileSync(filePath, JSON.stringify(data));
  count++;
}

console.log(
  `[allure-suite-fixer] ${count} resultado(s) processado(s).`,
);
