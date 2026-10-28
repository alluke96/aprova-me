import { hashPassword, verifyPassword } from './password';

describe('senhas', () => {
  it('gera hash bcrypt e confere a senha', async () => {
    const passwordHash = await hashPassword('aprovame');

    expect(passwordHash).toMatch(/^\$2[aby]\$10\$/);
    await expect(verifyPassword('aprovame', passwordHash)).resolves.toBe(true);
    await expect(verifyPassword('errada', passwordHash)).resolves.toBe(false);
  });

  it('retorna false sem hash, comparando com um hash fictício', async () => {
    await expect(verifyPassword('qualquer', undefined)).resolves.toBe(false);
  });
});
