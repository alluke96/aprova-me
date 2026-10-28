import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEmail, IsString, MaxLength, ValidateNested } from 'class-validator';
import { createValidationPipe, flattenValidationErrors } from './validation-pipe';

class Child {
  @IsEmail({}, { message: 'email inválido' })
  email!: string;
}

class Parent {
  @IsString({ message: 'name deve ser texto' })
  @MaxLength(3, { message: 'name muito longo' })
  name!: string;

  @ValidateNested()
  @Type(() => Child)
  child!: Child;
}

describe('validação de entrada', () => {
  it('achata erros aninhados usando o caminho do campo', () => {
    const result = flattenValidationErrors([
      { property: 'name', constraints: { a: 'erro 1' }, children: [] },
      {
        property: 'child',
        children: [{ property: 'email', constraints: { b: 'erro 2' }, children: [] }],
      },
    ]);

    expect(result).toEqual([
      { field: 'name', messages: ['erro 1'] },
      { field: 'child.email', messages: ['erro 2'] },
    ]);
  });

  it('responde 400 com a lista de campos inválidos', async () => {
    const pipe = createValidationPipe();
    const call = pipe.transform(
      { name: 'longo demais', child: { email: 'x' } },
      { type: 'body', metatype: Parent },
    );

    await expect(call).rejects.toBeInstanceOf(BadRequestException);
    const response = await call.catch((error: BadRequestException) => error.getResponse());
    expect(response).toMatchObject({
      message: 'Dados inválidos',
      errors: [
        { field: 'name', messages: ['name muito longo'] },
        { field: 'child.email', messages: ['email inválido'] },
      ],
    });
  });

  it('rejeita campos que não existem no DTO', async () => {
    const pipe = createValidationPipe();
    const call = pipe.transform(
      { name: 'ok', child: { email: 'a@b.com' }, extra: true },
      { type: 'body', metatype: Parent },
    );

    const response = await call.catch((error: BadRequestException) => error.getResponse());
    expect(response).toMatchObject({ errors: [{ field: 'extra' }] });
  });
});
