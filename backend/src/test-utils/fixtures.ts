import { Assignor, Payable, Prisma } from '@prisma/client';

export const ASSIGNOR_ID = '6f1c2a7e-2f7a-4b8e-9c55-0f6a3b9e1d10';
export const PAYABLE_ID = 'b3d4c5e6-7f80-4a1b-9c2d-3e4f5a6b7c8d';

export function makeAssignor(overrides: Partial<Assignor> = {}): Assignor {
  return {
    id: ASSIGNOR_ID,
    document: '52998224725',
    email: 'cedente@empresa.com',
    phone: '(41) 99999-0000',
    name: 'Empresa Cedente LTDA',
    createdAt: new Date('2026-10-28T12:00:00.000Z'),
    updatedAt: new Date('2026-10-28T12:00:00.000Z'),
    ...overrides,
  };
}

export function makePayable(overrides: Partial<Payable> = {}): Payable {
  return {
    id: PAYABLE_ID,
    value: new Prisma.Decimal('1500.50'),
    emissionDate: new Date('2026-10-28T00:00:00.000Z'),
    assignorId: ASSIGNOR_ID,
    createdAt: new Date('2026-10-28T12:00:00.000Z'),
    updatedAt: new Date('2026-10-28T12:00:00.000Z'),
    ...overrides,
  };
}

export const assignorInput = {
  id: ASSIGNOR_ID,
  document: '529.982.247-25',
  email: 'Cedente@Empresa.com',
  phone: '(41) 99999-0000',
  name: 'Empresa Cedente LTDA',
};

export const payableInput = {
  id: PAYABLE_ID,
  value: '1500.50',
  emissionDate: '2026-10-28',
  assignor: ASSIGNOR_ID,
};
