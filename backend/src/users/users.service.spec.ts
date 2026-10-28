import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { createPrismaMock } from '../test-utils/prisma-mock';
import { verifyPassword } from './password';
import { UsersService } from './users.service';

const USER = {
  id: '11111111-1111-4111-8111-111111111111',
  login: 'aprovame',
  passwordHash: 'hash',
  createdAt: new Date('2026-10-28T12:00:00.000Z'),
  updatedAt: new Date('2026-10-28T12:00:00.000Z'),
};

describe('UsersService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: UsersService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new UsersService(prisma);
  });

  it('cria usuário com login minúsculo e senha com hash', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockImplementation(({ data }) => ({ ...USER, ...data }));

    const result = await service.create({ login: 'NovoUser', password: 'senha-forte' });

    const { data } = prisma.user.create.mock.calls[0][0];
    expect(data.login).toBe('novouser');
    expect(data.passwordHash).not.toBe('senha-forte');
    await expect(verifyPassword('senha-forte', data.passwordHash)).resolves.toBe(true);
    expect(result).toEqual({ id: USER.id, login: 'novouser', createdAt: USER.createdAt });
  });

  it('não expõe o hash da senha', async () => {
    prisma.user.findMany.mockResolvedValue([USER]);

    const [user] = await service.findAll();

    expect(user).not.toHaveProperty('passwordHash');
  });

  it('recusa login duplicado', async () => {
    prisma.user.findUnique.mockResolvedValue(USER);

    await expect(service.create({ login: 'aprovame', password: '12345678' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('busca por login sem diferenciar maiúsculas', async () => {
    await service.findByLogin('APROVAME');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { login: 'aprovame' } });
  });

  describe('remove', () => {
    it('remove outro usuário', async () => {
      prisma.user.findUnique.mockResolvedValue(USER);

      await service.remove(USER.id, '22222222-2222-4222-8222-222222222222');

      expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: USER.id } });
    });

    it('impede remover o próprio usuário', async () => {
      await expect(service.remove(USER.id, USER.id)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('retorna 404 para usuário inexistente', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.remove(USER.id, 'outro')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
