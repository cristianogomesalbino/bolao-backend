import { connectDatabase, disconnectDatabase } from './resources/Database/connection';
import { cleanTestsData } from './resources/Database/database';
import fs from 'node:fs';
import path from 'node:path';

async function globalTeardown() {
  const tempFile = path.resolve(__dirname, '.execution-time');

  if (fs.existsSync(tempFile)) {
    const executionTime = fs.readFileSync(tempFile, 'utf-8').trim();
    console.log(`[TEARDOWN] Limpando dados criados após ${executionTime}...`);

    try {
      await connectDatabase();
      await cleanTestsData(executionTime);
      console.log('[TEARDOWN] Dados de teste removidos com sucesso.');
    } catch (error) {
      console.warn(`[TEARDOWN] Erro ao limpar dados: ${error}`);
    }

    fs.unlinkSync(tempFile);
  }

  console.log('[TEARDOWN] Desconectando do banco de dados...');
  await disconnectDatabase();
  console.log('[TEARDOWN] Banco desconectado.');
}

export default globalTeardown;
