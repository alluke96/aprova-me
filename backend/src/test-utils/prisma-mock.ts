import { PrismaService } from '../prisma/prisma.service';

type ModelMock = Record<
  | 'findUnique'
  | 'findMany'
  | 'count'
  | 'create'
  | 'createMany'
  | 'update'
  | 'upsert'
  | 'delete'
  | 'deleteMany',
  jest.Mock
>;

export interface PrismaMock {
  assignor: ModelMock;
  payable: ModelMock;
  user: ModelMock;
  batch: ModelMock;
  batchItem: ModelMock;
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
}

function modelMock(): ModelMock {
  return {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  };
}

/**
 * Mock tipado do PrismaService para testes unitários. `$transaction` aceita as
 * duas formas do Prisma: lista de promessas ou callback com o cliente da transação.
 */
export function createPrismaMock(): PrismaMock & PrismaService {
  const mock: PrismaMock = {
    assignor: modelMock(),
    payable: modelMock(),
    user: modelMock(),
    batch: modelMock(),
    batchItem: modelMock(),
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
  };

  mock.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function' ? arg(mock) : Promise.all(arg as Promise<unknown>[]),
  );

  return mock as PrismaMock & PrismaService;
}
