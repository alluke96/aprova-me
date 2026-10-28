import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  const service = { create: jest.fn(), findAll: jest.fn(), remove: jest.fn() };
  const controller = new UsersController(service as unknown as UsersService);

  it('delega cada rota ao service', async () => {
    const dto = { login: 'novo', password: '12345678' };

    await controller.create(dto);
    await controller.findAll();
    await controller.remove('alvo', { sub: 'eu', login: 'aprovame' });

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(service.findAll).toHaveBeenCalled();
    expect(service.remove).toHaveBeenCalledWith('alvo', 'eu');
  });
});
