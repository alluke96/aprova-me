import { formatDateOnly, isValidDateOnly, toDateOnly } from './date';

describe('datas de calendário', () => {
  it('converte para meia-noite UTC e volta sem mudar o dia', () => {
    const date = toDateOnly('2026-10-28');

    expect(date.toISOString()).toBe('2026-10-28T00:00:00.000Z');
    expect(formatDateOnly(date)).toBe('2026-10-28');
  });

  it('ignora a hora de um ISO completo', () => {
    expect(formatDateOnly(toDateOnly('2026-10-28T23:59:59-03:00'))).toBe('2026-10-28');
  });

  it.each(['2026-10-28', '2024-02-29', '2026-10-28T10:00:00Z'])('aceita %s', (value) => {
    expect(isValidDateOnly(value)).toBe(true);
  });

  it.each(['2026-02-30', '2025-02-29', '28/10/2026', '', 20261028])('rejeita %s', (value) => {
    expect(isValidDateOnly(value)).toBe(false);
  });
});
