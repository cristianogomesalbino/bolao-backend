import { connectDatabase } from './resources/Database/connection';

async function globalSetup() {
  console.log('[SETUP] Conectando ao banco de dados...');
  await connectDatabase();
  console.log('[SETUP] Banco conectado com sucesso.');
}

export default globalSetup;
