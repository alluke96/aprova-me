import { ArgumentsHost } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

function prismaError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('erro', { code, clientVersion: 'test', meta });
}

function hostWithResponse() {
  const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('PrismaExceptionFilter', () => {
  const filter = new PrismaExceptionFilter();

  it.each([
    ['P2002', 409],
    ['P2003', 409],
    ['P2025', 404],
    ['P9999', 500],
  ])('traduz %s para HTTP %d', (code, status) => {
    const { host, response } = hostWithResponse();

    filter.catch(prismaError(code), host);

    expect(response.status).toHaveBeenCalledWith(status);
  });

  it('informa o campo duplicado', () => {
    const { host, response } = hostWithResponse();

    filter.catch(prismaError('P2002', { target: ['document'] }), host);

    expect(response.json).toHaveBeenCalledWith({
      statusCode: 409,
      message: 'Já existe um registro com este document',
    });
  });
});
