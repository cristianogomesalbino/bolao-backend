import { connectDatabase } from './resources/Database/connection';
import { setCurrentTestExecutionTime } from './resources/Base/api';
import fs from 'node:fs';
import path from 'node:path';

async function globalSetup() {
  console.log('[SETUP] Conectando ao banco de dados...');
  await connectDatabase();
  console.log('[SETUP] Banco conectado com sucesso.');

  // Captura timestamp antes de qualquer seed/teste para cleanup no teardown
  const executionTime = setCurrentTestExecutionTime();
  const tempFile = path.resolve(__dirname, '.execution-time');
  fs.writeFileSync(tempFile, executionTime);
  console.log(`[SETUP] Timestamp de execução: ${executionTime}`);
}

export default globalSetup;
