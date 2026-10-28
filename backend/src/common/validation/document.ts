import { registerDecorator, ValidationOptions } from 'class-validator';

/** Remove pontuação e deixa letras em maiúsculo: "12.ABC.345/01DE-35" → "12ABC34501DE35". */
export function normalizeDocument(raw: string): string {
  return raw.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
}

function allSameCharacter(value: string): boolean {
  return /^(.)\1+$/.test(value);
}

export function isValidCpf(raw: string): boolean {
  const cpf = normalizeDocument(raw);
  if (!/^\d{11}$/.test(cpf) || allSameCharacter(cpf)) return false;

  const digits = cpf.split('').map(Number);
  const checkDigit = (length: number): number => {
    const sum = digits
      .slice(0, length)
      .reduce((acc, digit, index) => acc + digit * (length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  return checkDigit(9) === digits[9] && checkDigit(10) === digits[10];
}

/**
 * Valida CNPJ numérico e o novo CNPJ alfanumérico (vigente desde julho de 2026).
 * Cada caractere vale o código ASCII menos 48: dígitos continuam 0–9 e letras
 * vão de A=17 a Z=42. Os dois dígitos verificadores continuam numéricos.
 */
export function isValidCnpj(raw: string): boolean {
  const cnpj = normalizeDocument(raw);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || allSameCharacter(cnpj)) return false;

  const values = cnpj.split('').map((char) => char.charCodeAt(0) - 48);
  const checkDigit = (length: number): number => {
    const weights =
      length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, weight, index) => acc + weight * values[index], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  return checkDigit(12) === values[12] && checkDigit(13) === values[13];
}

export function isValidCpfOrCnpj(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const normalized = normalizeDocument(raw);
  return normalized.length === 11 ? isValidCpf(normalized) : isValidCnpj(normalized);
}

export function IsCpfOrCnpj(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isCpfOrCnpj',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: { message: '$property deve ser um CPF ou CNPJ válido', ...options },
      validator: { validate: (value: unknown) => isValidCpfOrCnpj(value) },
    });
  };
}
