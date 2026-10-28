import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';
import { UuidParam } from '../common/validation/uuid-param';
import { CreateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';

@ApiTags('Permissões')
@ApiBearerAuth()
@Controller('integrations/users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get()
  findAll() {
    return this.users.findAll();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@UuidParam() id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.users.remove(id, user.sub);
  }
}
