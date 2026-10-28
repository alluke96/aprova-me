import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAssignorDto, UpdateAssignorDto } from './assignor.dto';

const valid = {
  id: '6f1c2a7e-2f7a-4b8e-9c55-0f6a3b9e1d10',
  document: '529.982.247-25',
  email: 'cedente@empresa.com',
  phone: '(41) 99999-0000',
  name: 'Empresa Cedente LTDA',
};

async function fieldsWithErrors(cls: new () => object, body: object): Promise<string[]> {
  const errors = await validate(plainToInstance(cls, body));
  return errors.map((error) => error.property);
}

describe('CreateAssignorDto', () => {
  it('aceita um cedente válido', async () => {
    expect(await fieldsWithErrors(CreateAssignorDto, valid)).toEqual([]);
  });

  it('não aceita campos nulos', async () => {
    const body = { id: null, document: null, email: null, phone: null, name: null };

    expect(await fieldsWithErrors(CreateAssignorDto, body)).toEqual([
      'id',
      'document',
      'email',
      'phone',
      'name',
    ]);
  });

  it('respeita os tamanhos máximos do enunciado', async () => {
    const body = {
      ...valid,
      name: 'a'.repeat(141),
      phone: '1'.repeat(21),
      email: `${'a'.repeat(135)}@x.com`,
    };

    expect(await fieldsWithErrors(CreateAssignorDto, body)).toEqual(['email', 'phone', 'name']);
  });

  it('exige UUID e documento válido', async () => {
    const body = { ...valid, id: '123', document: '111.111.111-11' };

    expect(await fieldsWithErrors(CreateAssignorDto, body)).toEqual(['id', 'document']);
  });
});

describe('UpdateAssignorDto', () => {
  it('permite omitir campos', async () => {
    expect(await fieldsWithErrors(UpdateAssignorDto, { name: 'Novo nome' })).toEqual([]);
  });

  it('não permite enviar null', async () => {
    expect(await fieldsWithErrors(UpdateAssignorDto, { email: null })).toEqual(['email']);
  });
});
