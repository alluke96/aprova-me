import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IsMoney, isValidMoney } from './money';

class Dto {
  @IsMoney()
  value!: string;
}

async function check(value: unknown) {
  const dto = plainToInstance(Dto, { value });
  return { dto, errors: await validate(dto) };
}

describe('IsMoney', () => {
  it.each(['10', '10.5', '10.50', '9999999999999.99'])('aceita %s', (value) => {
    expect(isValidMoney(value)).toBe(true);
  });

  it.each(['0', '0.00', '-1', '10.555', 'abc', '1e3', '99999999999999'])('rejeita %s', (value) => {
    expect(isValidMoney(value)).toBe(false);
  });

  it('converte número para texto antes de validar', async () => {
    const { dto, errors } = await check(1500.5);

    expect(errors).toHaveLength(0);
    expect(dto.value).toBe('1500.5');
  });

  it('rejeita número com erro de float em vez de arredondar', async () => {
    const { errors } = await check(0.1 + 0.2);

    expect(errors[0].constraints).toEqual({
      isMoney: 'value deve ser um valor positivo com até 2 casas decimais',
    });
  });
});
