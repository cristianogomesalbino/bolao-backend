/** @type {import('@playwright/test/reporter').Reporter} */
class CleanReporter {
  passed = 0;
  failed = 0;
  skipped = 0;

  onTestEnd(test, result) {
    const icon =
      result.status === 'passed'
        ? '✓'
        : result.status === 'failed'
          ? '✗'
          : '○';

    const color =
      result.status === 'passed'
        ? '\x1b[32m'
        : result.status === 'failed'
          ? '\x1b[31m'
          : '\x1b[33m';

    const reset = '\x1b[0m';
    const duration = `(${result.duration}ms)`;

    // titlePath: ['', 'path/file.spec.ts', 'describe', 'test name']
    // Pega do describe em diante (ignora projeto e path do arquivo)
    const parts = test.titlePath();
    const describeAndTest = parts.slice(-2).join(' › ');

    console.log(`  ${color}${icon}${reset}  ${describeAndTest} ${duration}`);

    if (result.status === 'passed') this.passed++;
    else if (result.status === 'failed') this.failed++;
    else this.skipped++;

    if (result.status === 'failed' && result.errors.length > 0) {
      for (const error of result.errors) {
        console.log(`\n    ${error.message}\n`);
      }
    }
  }

  onEnd(result) {
    const total = this.passed + this.failed + this.skipped;
    const parts = [];
    if (this.passed) parts.push(`\x1b[32m${this.passed} passed\x1b[0m`);
    if (this.failed) parts.push(`\x1b[31m${this.failed} failed\x1b[0m`);
    if (this.skipped) parts.push(`\x1b[33m${this.skipped} skipped\x1b[0m`);
    console.log(`\n  ${parts.join(', ')} (${total} total)\n`);
  }
}

module.exports = CleanReporter;
