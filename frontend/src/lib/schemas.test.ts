import { assignorSchema, loginSchema, payableSchema, validateForm } from './schemas';

const ID = 'b3d4c5e6-7f80-4a1b-9c2d-3e4f5a6b7c8d';
const ASSIGNOR = '6f1c2a7e-2f7a-4b8e-9c55-0f6a3b9e1d10';

function formData(values: Record<string, string>): FormData {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe('payableSchema', () => {
  it('normaliza o valor digitado em pt-BR', () => {
    const result = payableSchema.parse({
      id: ID,
      value: '1.500,50',
      emissionDate: '2026-10-28',
      assignor: ASSIGNOR,
    });

    expect(result.value).toBe('1500.50');
  });

  it('aponta cada campo vazio ou inválido', () => {
    const result = validateForm(
      payableSchema,
      formData({ id: ID, value: '0', emissionDate: '2026-02-30', assignor: '' }),
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(Object.keys(result.fieldErrors)).toEqual(['value', 'emissionDate', 'assignor']);
      expect(result.fieldErrors.assignor).toEqual(['Escolha um cedente']);
    }
  });
});

describe('assignorSchema', () => {
  const valid = {
    id: ASSIGNOR,
    document: '529.982.247-25',
    email: 'cedente@empresa.com',
    phone: '(41) 99999-0000',
    name: 'Empresa Cedente LTDA',
  };

  it('aceita CPF, CNPJ e CNPJ alfanumérico', () => {
    for (const document of ['529.982.247-25', '11.222.333/0001-81', '12.ABC.345/01DE-35']) {
      expect(assignorSchema.safeParse({ ...valid, document }).success).toBe(true);
    }
  });

  it('respeita os limites do enunciado', () => {
    const result = assignorSchema.safeParse({
      ...valid,
      name: 'a'.repeat(141),
      phone: '1'.repeat(21),
      email: 'invalido',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(['email', 'phone', 'name']);
  });
});

it('loginSchema exige login e senha', () => {
  const result = validateForm(loginSchema, formData({ login: ' ', password: '' }));

  expect(result.success).toBe(false);
  if (!result.success) expect(Object.keys(result.fieldErrors)).toEqual(['login', 'password']);
});
