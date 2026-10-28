import { BadRequestException, Param, ParseUUIDPipe } from '@nestjs/common';
import { ValidateIf } from 'class-validator';

/** `@UuidParam()` lê o `:id` da rota e responde 400 se não for um UUID. */
export const UuidParam = (name = 'id'): ParameterDecorator =>
  Param(
    name,
    new ParseUUIDPipe({
      exceptionFactory: () => new BadRequestException(`${name} deve ser um UUID válido`),
    }),
  );

/**
 * Para PATCH: o campo pode ser omitido, mas não pode vir `null`.
 * O `IsOptional` do class-validator aceitaria `null` e o erro estouraria no banco.
 */
export const IsOptionalNotNull = (): PropertyDecorator =>
  ValidateIf((_object: unknown, value: unknown) => value !== undefined);
