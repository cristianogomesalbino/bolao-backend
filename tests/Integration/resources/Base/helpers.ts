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
