// ============================================================
// FUNÇÕES UTILITÁRIAS — equivalente ao Helper.py
// ============================================================

export function hasKeyInDictionary(
  key: string,
  obj: Record<string, any>,
): boolean {
  return key in obj;
}

export function containsWord(partial: string, full: string): boolean {
  return full.includes(partial);
}

export function getMaxInteger(): number {
  return Number.MAX_SAFE_INTEGER;
}

export function generateRandomEmail(prefix: string = 'qa'): string {
  const timestamp = Date.now();
  return `${prefix}.${timestamp}@teste.bolao.qa`;
}

export function generateRandomName(prefix: string = 'QA'): string {
  const timestamp = Date.now();
  return `${prefix} Teste ${timestamp}`;
}

/**
 * Valida que a resposta não contém mensagens não tratadas do framework.
 * Aceita string (body já lido) ou response do Playwright.
 */
export async function assertSemMensagemNaoTratada(responseOrBody: any): Promise<void> {
  const { MENSAGENS_NAO_TRATADAS } = require('./constants');
  const bodyStr = await extractBodyStr(responseOrBody);
  if (!bodyStr) return;

  const encontrada = MENSAGENS_NAO_TRATADAS.find((msg: string) => bodyStr.includes(msg));
  if (!encontrada) return;

  throw new Error(
    `⚠️  Mensagem não tratada detectada: "${encontrada}"\nBody: ${bodyStr.substring(0, 200)}`,
  );
}

async function extractBodyStr(responseOrBody: any): Promise<string | null> {
  if (typeof responseOrBody === 'string') return responseOrBody;

  if (responseOrBody.status() < 400) return null;

  try {
    const body = await responseOrBody.json();
    return JSON.stringify(body);
  } catch {
    return null;
  }
}
