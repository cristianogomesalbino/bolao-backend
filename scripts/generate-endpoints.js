#!/usr/bin/env node
/**
 * Analisa controllers do backend e cruza com o front-end
 * para gerar docs/endpoints.md com mapa de uso.
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src', 'modules');
const FRONTEND_DIR = '/home/cristiano_albino/Documentos/Pessoais/Projeto/app-bolao/bolao-frontend/src';
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'docs', 'endpoints.md');

// ─── 1. Extrair endpoints do front-end ────────────────────────────────────────

function extractFrontEndpoints() {
  const endpoints = new Set();

  if (!fs.existsSync(FRONTEND_DIR)) return endpoints;

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        walkDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Paths fixos: apiClient.method('/path') ou apiClient.method<Type>('/path')
        const fixedRegex = /apiClient\.\w+\s*(?:<[^>]*>)?\s*\(\s*['"]\/?(.*?)['"]/g;
        let match;
        while ((match = fixedRegex.exec(content)) !== null) {
          endpoints.add(normalize(match[1]));
        }

        // Paths dinâmicos: apiClient.method(`/path/${var}/sub`)
        // Pode estar na mesma linha ou na próxima
        const dynamicRegex = /apiClient\.\w+\s*(?:<[^>]*>)?\s*\(\s*\n?\s*`\/?(.*?)`/gs;
        while ((match = dynamicRegex.exec(content)) !== null) {
          endpoints.add(normalize(match[1]));
        }
      }
    }
  }

  walkDir(FRONTEND_DIR);
  return endpoints;
}

function normalize(p) {
  return p.replace(/^\//,'').replace(/\$\{[^}]+\}/g, ':param');
}

function normalizeBackend(p) {
  return p.replace(/^\//,'').replace(/:[a-zA-Z]+/g, ':param');
}

// ─── 2. Extrair endpoints dos controllers ─────────────────────────────────────

function extractBackendEndpoints() {
  const modules = [];

  if (!fs.existsSync(SRC_DIR)) return modules;

  const moduleDirs = fs.readdirSync(SRC_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const moduleDir of moduleDirs) {
    const modulePath = path.join(SRC_DIR, moduleDir.name);
    const controllers = findControllers(modulePath);

    if (controllers.length === 0) continue;

    const endpoints = [];

    for (const controllerFile of controllers) {
      const content = fs.readFileSync(controllerFile, 'utf-8');
      const lines = content.split('\n');

      // Extrair prefixo do @Controller
      const controllerMatch = content.match(/@Controller\(['"]?([^'")\s]+)['"]?\)/);
      const prefix = controllerMatch ? controllerMatch[1] : '';

      let summary = '';
      let guard = '';
      let isPublic = false;
      let isAdmin = false;

      for (const line of lines) {
        // @ApiOperation
        const summaryMatch = line.match(/@ApiOperation\(\{.*summary:\s*['"]([^'"]+)['"]/);
        if (summaryMatch) summary = summaryMatch[1];

        // Guards
        if (line.includes('@UseGuards') && line.includes('SuperAdminGuard')) {
          isAdmin = true;
          guard = 'SuperAdmin';
        } else if (line.includes('@UseGuards') && line.includes('GroupRoleGuard')) {
          guard = 'GroupRole';
        } else if (line.includes('@UseGuards') && line.includes('SelfOrAdminGuard')) {
          guard = 'SelfOrAdmin';
        }

        // @Public
        if (line.includes('@Public()')) isPublic = true;

        // HTTP method
        const httpMatch = line.match(/^\s*@(Get|Post|Put|Patch|Delete)\((?:['"]([^'"]*?)['"])?\)/);
        if (httpMatch) {
          const method = httpMatch[1].toUpperCase();
          const route = httpMatch[2] || '';

          let fullPath;
          if (prefix && route) fullPath = `/${prefix}/${route}`;
          else if (prefix) fullPath = `/${prefix}`;
          else if (route) fullPath = `/${route}`;
          else fullPath = '/';
          fullPath = fullPath.replace(/\/\//g, '/');

          let auth = '🔒 JWT';
          if (isPublic) auth = '🌐 Público';
          else if (guard) auth = `🔒 ${guard}`;

          endpoints.push({ method, fullPath, summary, auth, isAdmin });

          // Reset
          summary = '';
          guard = '';
          isPublic = false;
          isAdmin = false;
        }
      }
    }

    if (endpoints.length > 0) {
      const moduleName = moduleDir.name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
      modules.push({ name: moduleName, endpoints });
    }
  }

  return modules;
}

function findControllers(dir) {
  const results = [];
  function walk(d) {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.controller.ts') && !entry.name.includes('.spec.')) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results.sort();
}

// ─── 3. Gerar markdown ────────────────────────────────────────────────────────

function generate() {
  const frontEndpoints = extractFrontEndpoints();
  const modules = extractBackendEndpoints();

  let total = 0, usados = 0, naoUsados = 0, admin = 0;
  const naoUsadosList = [];

  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  let md = `# Endpoints da API — Mapa de Uso

> Gerado automaticamente por \`scripts/generate-endpoints.js\`
> Atualizado em: ${now}

**Legenda:**
- ✅ Em uso no front-end
- ❌ Sem uso detectado
- 🔧 Uso interno/admin (não esperado no front)

`;

  for (const mod of modules) {
    md += `## ${mod.name}\n\n`;
    md += `| Método | Endpoint | Descrição | Auth | Uso |\n`;
    md += `|--------|----------|-----------|------|-----|\n`;

    for (const ep of mod.endpoints) {
      total++;
      let uso;

      if (ep.isAdmin) {
        uso = '🔧';
        admin++;
      } else {
        const normalized = normalizeBackend(ep.fullPath);
        if (frontEndpoints.has(normalized)) {
          uso = '✅';
          usados++;
        } else {
          uso = '❌';
          naoUsados++;
          naoUsadosList.push(ep);
        }
      }

      md += `| \`${ep.method}\` | \`${ep.fullPath}\` | ${ep.summary} | ${ep.auth} | ${uso} |\n`;
    }

    md += '\n';
  }

  md += `---

## Resumo

| Métrica | Quantidade |
|---------|------------|
| Total de endpoints | ${total} |
| ✅ Em uso (front-end) | ${usados} |
| ❌ Sem uso detectado | ${naoUsados} |
| 🔧 Admin/interno | ${admin} |

---

## Endpoints sem uso detectado

| Método | Endpoint | Descrição |
|--------|----------|-----------|
`;

  if (naoUsadosList.length > 0) {
    for (const ep of naoUsadosList) {
      md += `| \`${ep.method}\` | \`${ep.fullPath}\` | ${ep.summary} |\n`;
    }
  } else {
    md += `| — | — | Nenhum endpoint sem uso |\n`;
  }

  // Garantir que a pasta docs existe
  const docsDir = path.join(PROJECT_ROOT, 'docs');
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, md);
  console.log(`✅ docs/endpoints.md gerado — Total: ${total} | Em uso: ${usados} | Sem uso: ${naoUsados} | Admin: ${admin}`);
}

generate();
