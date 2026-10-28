import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { flattenValidationErrors } from '../../common/validation/validation-pipe';
import { payableInput } from '../../test-utils/fixtures';
import { CreateBatchDto, MAX_BATCH_SIZE } from './batch.dto';

async function errors(body: object) {
  return flattenValidationErrors(await validate(plainToInstance(CreateBatchDto, body)));
}

describe('CreateBatchDto', () => {
  it('aceita um lote válido', async () => {
    expect(await errors({ payables: [payableInput] })).toEqual([]);
  });

  it('limita o lote a 10.000 recebíveis', async () => {
    const payables = Array.from({ length: MAX_BATCH_SIZE + 1 }, () => payableInput);

    expect((await errors({ payables }))[0].messages).toContain(
      'payables deve ter no máximo 10000 recebíveis',
    );
  });

  it('valida cada item e aponta a posição', async () => {
    const result = await errors({ payables: [payableInput, { ...payableInput, value: 'abc' }] });

    expect(result.map((error) => error.field)).toEqual(['payables.1.value']);
  });

  it('não aceita lote vazio', async () => {
    expect((await errors({ payables: [] }))[0].field).toBe('payables');
  });
});
