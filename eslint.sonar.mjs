// @ts-check
/**
 * Lint Sonar local — só código de produto (`src`).
 * Não varrer test/, dist/, node_modules/ (ruído legado ≠ gate da feature).
 * Uso: `npm run lint:sonar` ou `npx eslint -c eslint.sonar.mjs src/modules/destaques`
 */
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

const recomendadas = sonarjs.configs.recommended.rules ?? {};

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'test/**',
      'prisma/**',
      'scripts/**',
      'eslint.sonar.mjs',
      'eslint.config.mjs',
    ],
  },
  {
    files: ['src/**/*.ts'],
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      sonarjs,
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      ...recomendadas,
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/nested-control-flow': ['error', { maximumNestingLevel: 3 }],
    },
  },
);
