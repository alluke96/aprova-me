import { validateEnv } from './env';

describe('validateEnv', () => {
  const base = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    JWT_SECRET: 'um-segredo-bem-comprido',
  };

  it('aplica os valores padrão do enunciado', () => {
    const env = validateEnv(base);

    expect(env.JWT_EXPIRES_IN_SECONDS).toBe(60);
    expect(env.BATCH_MAX_ATTEMPTS).toBe(5);
    expect(env.PORT).toBe(3001);
  });

  it('converte números vindos como texto', () => {
    const env = validateEnv({ ...base, PORT: '8080', REDIS_PORT: '6380' });

    expect(env.PORT).toBe(8080);
    expect(env.REDIS_PORT).toBe(6380);
  });

  it('falha com mensagem clara quando falta configuração', () => {
    expect(() => validateEnv({ JWT_SECRET: 'curto' })).toThrow(/DATABASE_URL/);
    expect(() => validateEnv({ JWT_SECRET: 'curto' })).toThrow(/JWT_SECRET/);
  });
});
