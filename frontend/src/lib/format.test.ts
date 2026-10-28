import {
  formatDate,
  formatDocument,
  formatMoney,
  parseMoneyInput,
  shortId,
  toMoneyInput,
} from './format';

describe('formatMoney', () => {
  it.each([
    ['1500.50', 'R$ 1.500,50'],
    ['10', 'R$ 10,00'],
    ['1234567.8', 'R$ 1.234.567,80'],
    ['9999999999999.99', 'R$ 9.999.999.999.999,99'],
  ])('%s → %s', (value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });
});

describe('parseMoneyInput', () => {
  it.each([
    ['1.500,50', '1500.50'],
    ['1500,5', '1500.50'],
    ['1500.5', '1500.50'],
    ['1.500', '1500.00'],
    ['12.345.678', '12345678.00'],
    ['R$ 10', '10.00'],
    ['007,10', '7.10'],
  ])('%s → %s', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each(['', 'abc', '10,555', '1,2,3', '-5'])('rejeita "%s"', (input) => {
    expect(parseMoneyInput(input)).toBeNull();
  });
});

describe('outros formatos', () => {
  it('prepara o valor para edição', () => {
    expect(toMoneyInput('1500.50')).toBe('1.500,50');
  });

  it('formata data sem mudar o dia por causa do fuso', () => {
    expect(formatDate('2026-10-01')).toBe('01/10/2026');
  });

  it('formata CPF, CNPJ e CNPJ alfanumérico', () => {
    expect(formatDocument('52998224725')).toBe('529.982.247-25');
    expect(formatDocument('11222333000181')).toBe('11.222.333/0001-81');
    expect(formatDocument('12ABC34501DE35')).toBe('12.ABC.345/01DE-35');
  });

  it('encurta o id', () => {
    expect(shortId('b3d4c5e6-7f80-4a1b-9c2d-3e4f5a6b7c8d')).toBe('b3d4c5e6');
  });
});
