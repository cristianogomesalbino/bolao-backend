#!/usr/bin/env bash
set -e

echo "=== Executando testes de integração Playwright ==="
npx playwright test "$@"
echo "=== Testes finalizados ==="
