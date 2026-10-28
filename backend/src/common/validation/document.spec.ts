import { validate } from 'class-validator';
import { IsCpfOrCnpj, isValidCnpj, isValidCpf, isValidCpfOrCnpj, normalizeDocument } from './document';

describe('documentos (CPF/CNPJ)', () => {
  it('normaliza removendo pontuação e deixando maiúsculo', () => {
    expect(normalizeDocument('123.456.789-09')).toBe('12345678909');
    expect(normalizeDocument('12.abc.345/01de-35')).toBe('12ABC34501DE35');
  });

  it('valida CPF', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('529.982.247-24')).toBe(false);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCpf('123')).toBe(false);
  });

  it('valida CNPJ numérico', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false);
    expect(isValidCnpj('00.000.000/0000-00')).toBe(false);
  });

  it('valida o novo CNPJ alfanumérico', () => {
    expect(isValidCnpj('12.ABC.345/01DE-35')).toBe(true);
    expect(isValidCnpj('12.ABC.345/01DE-36')).toBe(false);
  });

  it('escolhe CPF ou CNPJ pelo tamanho', () => {
    expect(isValidCpfOrCnpj('52998224725')).toBe(true);
    expect(isValidCpfOrCnpj('11222333000181')).toBe(true);
    expect(isValidCpfOrCnpj(12345678909)).toBe(false);
  });

  it('funciona como decorator do class-validator', async () => {
    class Dto {
      @IsCpfOrCnpj()
      document!: string;
    }
    const invalid = Object.assign(new Dto(), { document: '000' });
    const valid = Object.assign(new Dto(), { document: '529.982.247-25' });

    const [error] = await validate(invalid);
    expect(error.constraints).toEqual({ isCpfOrCnpj: 'document deve ser um CPF ou CNPJ válido' });
    expect(await validate(valid)).toHaveLength(0);
  });
});
