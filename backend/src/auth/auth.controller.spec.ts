import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const service = { login: jest.fn().mockResolvedValue({ access_token: 'jwt' }) };
  const controller = new AuthController(service as unknown as AuthService);

  it('delega o login ao service', async () => {
    const dto = { login: 'aprovame', password: 'aprovame' };

    await expect(controller.login(dto)).resolves.toEqual({ access_token: 'jwt' });
    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('é a única rota de integração pública', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, AuthController.prototype.login)).toBe(true);
  });
});
