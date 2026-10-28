import { Transform } from 'class-transformer';
import { registerDecorator, ValidationOptions } from 'class-validator';

/** Até 13 dígitos inteiros e 2 casas decimais, que é o que cabe em DECIMAL(15,2). */
const MONEY_PATTERN = /^\d{1,13}(\.\d{1,2})?$/;

export function isValidMoney(value: unknown): value is string {
  return typeof value === 'string' && MONEY_PATTERN.test(value) && Number(value) > 0;
}

/**
 * Aceita o valor como número (`1500.5`) ou texto (`"1500.50"`) e guarda sempre
 * como texto. Assim o valor chega ao banco sem passar por aritmética de float.
 * Um número que já vem com erro de float (`0.30000000000000004`) é rejeitado,
 * em vez de ser arredondado em silêncio.
 */
export function IsMoney(options?: ValidationOptions): PropertyDecorator {
  const transform = Transform(({ value }: { value: unknown }) =>
    typeof value === 'number' && Number.isFinite(value) ? value.toString() : value,
  );

  return (target: object, propertyName: string | symbol) => {
    transform(target, propertyName);
    registerDecorator({
      name: 'isMoney',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: {
        message: '$property deve ser um valor positivo com até 2 casas decimais',
        ...options,
      },
      validator: { validate: (value: unknown) => isValidMoney(value) },
    });
  };
}
