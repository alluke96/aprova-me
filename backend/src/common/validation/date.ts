/**
 * Datas de emissão são datas de calendário, sem hora. Trabalhamos sempre em UTC
 * para que "2026-10-28" não vire "2026-10-27" por causa do fuso do servidor.
 */
export function toDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Aceita "YYYY-MM-DD" ou um ISO completo, desde que a data exista no calendário. */
export function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value)) return false;
  const date = toDateOnly(value);
  return !Number.isNaN(date.getTime()) && formatDateOnly(date) === value.slice(0, 10);
}
