/**
 * Script para corrigir a inversão dos Grupos C e D da Copa do Mundo 2026.
 *
 * No banco, a fase "Grupo C" contém EUA/Paraguai/Austrália/Turquia (deveria ser Grupo D)
 * e a fase "Grupo D" contém Brasil/Marrocos/Haiti/Escócia (deveria ser Grupo C).
 *
 * Solução: trocar os nomes das duas fases.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // IDs das fases (confirmados via query)
  const FASE_C_ID = '9f5eef0e-63c7-4c43-8041-8e9b57ee3b38'; // atualmente "Grupo C" (tem EUA)
  const FASE_D_ID = '3311f1e6-d38a-4824-a6ae-f0a2904d83fc'; // atualmente "Grupo D" (tem Brasil)

  console.log('🔄 Trocando nomes das fases Grupo C ↔ Grupo D...');

  // Usar nome temporário para evitar conflito de unique (se houver)
  await prisma.fase.update({
    where: { id: FASE_C_ID },
    data: { nome: 'Grupo D' },
  });

  await prisma.fase.update({
    where: { id: FASE_D_ID },
    data: { nome: 'Grupo C' },
  });

  // Verificação
  const faseC = await prisma.fase.findUnique({ where: { id: FASE_D_ID } });
  const faseD = await prisma.fase.findUnique({ where: { id: FASE_C_ID } });

  console.log(`✅ Fase ${FASE_D_ID} agora é: ${faseC?.nome} (Brasil, Marrocos, Haiti, Escócia)`);
  console.log(`✅ Fase ${FASE_C_ID} agora é: ${faseD?.nome} (EUA, Paraguai, Austrália, Turquia)`);
  console.log('🏁 Correção concluída!');
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
