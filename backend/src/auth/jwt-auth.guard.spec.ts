import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function contextWith(authorization?: string) {
  const request: { headers: Record<string, string | undefined>; user?: unknown } = {
    headers: { authorization },
  };
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'segredo-de-teste-123' });
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector & {
    getAllAndOverride: jest.Mock;
  };
  const guard = new JwtAuthGuard(jwt, reflector);

  beforeEach(() => reflector.getAllAndOverride.mockReturnValue(false));

  it('libera rotas públicas sem token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(guard.canActivate(contextWith().context)).resolves.toBe(true);
  });

  it('aceita token válido e coloca o usuário na requisição', async () => {
    const token = await jwt.signAsync({ sub: 'user-id', login: 'aprovame' });
    const { context, request } = contextWith(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ sub: 'user-id', login: 'aprovame' });
  });

  it.each([
    ['sem cabeçalho', undefined],
    ['sem Bearer', 'Token abc'],
    ['token inválido', 'Bearer abc.def.ghi'],
  ])('responde "Não autorizado" %s', async (_case, header) => {
    await expect(guard.canActivate(contextWith(header).context)).rejects.toThrow(
      new UnauthorizedException('Não autorizado'),
    );
  });

  it('recusa token expirado', async () => {
    const token = await jwt.signAsync({ sub: 'user-id', login: 'aprovame' }, { expiresIn: -1 });

    await expect(guard.canActivate(contextWith(`Bearer ${token}`).context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
