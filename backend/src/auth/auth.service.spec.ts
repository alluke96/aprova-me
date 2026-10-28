import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Env } from '../config/env';
import { hashPassword } from '../users/password';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const jwt = new JwtService({ secret: 'segredo-de-teste-123' });
  const config = { get: jest.fn().mockReturnValue(60) } as unknown as ConfigService<Env, true>;
  const users = { findByLogin: jest.fn() };
  const service = new AuthService(users as unknown as UsersService, jwt, config);

  it('gera JWT que expira em 1 minuto para credenciais válidas', async () => {
    users.findByLogin.mockResolvedValue({
      id: 'user-id',
      login: 'aprovame',
      passwordHash: await hashPassword('aprovame'),
    });

    const result = await service.login({ login: 'aprovame', password: 'aprovame' });
    const payload = jwt.decode<{ sub: string; login: string; iat: number; exp: number }>(
      result.access_token,
    );

    expect(result).toMatchObject({ token_type: 'Bearer', expires_in: 60 });
    expect(payload).toMatchObject({ sub: 'user-id', login: 'aprovame' });
    expect(payload.exp - payload.iat).toBe(60);
  });

  it('recusa senha errada', async () => {
    users.findByLogin.mockResolvedValue({
      id: 'user-id',
      login: 'aprovame',
      passwordHash: await hashPassword('aprovame'),
    });

    await expect(service.login({ login: 'aprovame', password: 'errada' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('recusa login inexistente com a mesma mensagem', async () => {
    users.findByLogin.mockResolvedValue(null);

    await expect(service.login({ login: 'ninguem', password: 'x' })).rejects.toThrow(
      'Login ou senha inválidos',
    );
  });
});
