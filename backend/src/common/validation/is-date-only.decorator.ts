import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidDateOnly } from './date';

export function IsDateOnly(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isDateOnly',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: { message: '$property deve ser uma data válida no formato AAAA-MM-DD', ...options },
      validator: { validate: (value: unknown) => isValidDateOnly(value) },
    });
  };
}
