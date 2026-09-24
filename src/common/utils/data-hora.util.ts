const TZ_BRASILIA = 'America/Sao_Paulo';
const OFFSET_BRASILIA = '-03:00';

/**
 * Serializa Date para ISO com offset de Brasília (-03:00).
 * Assim o horário "de parede" na string é o que o usuário espera (ex: 16:00),
 * sem depender do cliente interpretar corretamente o Zulu (UTC).
 */
export function formatarDataHoraBrasilia(
  data: Date | string | null | undefined,
): string | null {
  if (data == null) return null;

  const date = data instanceof Date ? data : new Date(data);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_BRASILIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '00';

  // Alguns runtimes devolvem hora "24" na meia-noite com hourCycle h23.
  const hour = get('hour') === '24' ? '00' : get('hour');

  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}:${get('second')}${OFFSET_BRASILIA}`;
}
