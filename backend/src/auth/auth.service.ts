import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Env } from '../config/env';
import { verifyPassword } from '../users/password';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from './current-user.decorator';
import { LoginDto, TokenResponse } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Gera JWT para qualquer login/senha cadastrados no banco (nível 5). */
  async login(dto: LoginDto): Promise<TokenResponse> {
    const user = await this.users.findByLogin(dto.login);
    // Mesma mensagem para login inexistente e senha errada, de propósito.
    const valid = await verifyPassword(dto.password, user?.passwordHash);
    if (!user || !valid) throw new UnauthorizedException('Login ou senha inválidos');

    const payload: AuthenticatedUser = { sub: user.id, login: user.login };
    const expiresIn = this.config.get('JWT_EXPIRES_IN_SECONDS', { infer: true });

    return {
      access_token: await this.jwt.signAsync(payload, { expiresIn }),
      token_type: 'Bearer',
      expires_in: expiresIn,
    };
  }
}
