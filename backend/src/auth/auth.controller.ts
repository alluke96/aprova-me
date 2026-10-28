import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './public.decorator';

@ApiTags('Autenticação')
@Controller('integrations/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Troca login e senha por um JWT válido por 1 minuto. */
  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  // Limita tentativas de força bruta: 10 por minuto por IP.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
}
