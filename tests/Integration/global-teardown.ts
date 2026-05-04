import { disconnectDatabase } from './resources/Database/connection';

async function globalTeardown() {
  console.log('[TEARDOWN] Desconectando do banco de dados...');
  await disconnectDatabase();
  console.log('[TEARDOWN] Banco desconectado.');
}

export default globalTeardown;
