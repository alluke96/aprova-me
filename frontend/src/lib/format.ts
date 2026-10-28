/**
 * Formata "1500.50" como "R$ 1.500,50" sem converter para número: o valor vem
 * da API como texto justamente para não passar por float.
 */
export function formatMoney(value: string): string {
  const [integer, decimals = ''] = value.split('.');
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${grouped},${decimals.padEnd(2, '0').slice(0, 2)}`;
}

/** Converte o que a pessoa digitou ("1.500,50", "1500.5") para "1500.50". */
export function parseMoneyInput(input: string): string | null {
  const cleaned = input.replace(/\s|R\$/g, '');
  if (!cleaned) return null;

  // "1.500" em pt-BR é mil e quinhentos, não um e meio.
  const onlyThousands = /^\d{1,3}(\.\d{3})+$/.test(cleaned);
  const normalized =
    cleaned.includes(',') || onlyThousands
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned;
  if (!/^\d{1,13}(\.\d{1,2})?$/.test(normalized)) return null;

  const [integer, decimals = ''] = normalized.split('.');
  return `${integer.replace(/^0+(?=\d)/, '')}.${decimals.padEnd(2, '0')}`;
}

/** "1500.50" → "1.500,50", para preencher o campo na edição. */
export function toMoneyInput(value: string): string {
  return formatMoney(value).replace('R$ ', '');
}

/** "2026-10-28" → "28/10/2026", sem passar por Date (evita erro de fuso). */
export function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-');
  return `${day}/${month}/${year}`;
}

/** Formata CPF (11 dígitos) ou CNPJ (14 caracteres, numérico ou alfanumérico). */
export function formatDocument(document: string): string {
  if (/^\d{11}$/.test(document)) {
    return document.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  if (/^[0-9A-Z]{12}\d{2}$/.test(document)) {
    return document.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5');
  }
  return document;
}

/** Mostra só o começo do UUID, que já basta para conferir visualmente. */
export function shortId(id: string): string {
  return id.slice(0, 8);
}
