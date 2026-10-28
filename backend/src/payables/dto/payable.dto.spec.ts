import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { flattenValidationErrors } from '../../common/validation/validation-pipe';
import { assignorInput, payableInput } from '../../test-utils/fixtures';
import { CreatePayableRequestDto, UpdatePayableDto } from './payable.dto';

async function errorFields(cls: new () => object, body: object): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, body));
  return flattenValidationErrors(errors).map((error) => error.field);
}

describe('CreatePayableRequestDto', () => {
  it('aceita recebível com cedente', async () => {
    const body = { payable: payableInput, assignor: assignorInput };

    expect(await errorFields(CreatePayableRequestDto, body)).toEqual([]);
  });

  it('aceita recebível sem cedente (cedente já cadastrado)', async () => {
    expect(await errorFields(CreatePayableRequestDto, { payable: payableInput })).toEqual([]);
  });

  it('aponta o caminho de cada campo inválido', async () => {
    const body = {
      payable: { id: 'abc', value: -10, emissionDate: '2026-13-01', assignor: null },
      assignor: { ...assignorInput, email: 'invalido' },
    };

    expect(await errorFields(CreatePayableRequestDto, body)).toEqual([
      'payable.id',
      'payable.value',
      'payable.emissionDate',
      'payable.assignor',
      'assignor.email',
    ]);
  });

  it('exige o recebível', async () => {
    expect(await errorFields(CreatePayableRequestDto, {})).toEqual(['payable']);
  });
});

describe('UpdatePayableDto', () => {
  it('permite atualizar só o valor', async () => {
    expect(await errorFields(UpdatePayableDto, { value: '99.90' })).toEqual([]);
  });

  it('não aceita null', async () => {
    expect(await errorFields(UpdatePayableDto, { value: null, assignor: null })).toEqual([
      'value',
      'assignor',
    ]);
  });
});
