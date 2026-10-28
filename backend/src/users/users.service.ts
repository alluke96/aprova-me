import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UserResponse } from './dto/user.dto';
import { hashPassword } from './password';

function toUserResponse(user: User): UserResponse {
  return { id: user.id, login: user.login, createdAt: user.createdAt };
}

/** Cadastro de permissões (nível 5): quem pode gerar tokens de acesso. */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const login = dto.login.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { login } });
    if (existing) throw new ConflictException('Já existe um usuário com este login');

    const user = await this.prisma.user.create({
      data: { login, passwordHash: await hashPassword(dto.password) },
    });
    return toUserResponse(user);
  }

  async findAll(): Promise<UserResponse[]> {
    const users = await this.prisma.user.findMany({ orderBy: { login: 'asc' } });
    return users.map(toUserResponse);
  }

  findByLogin(login: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { login: login.toLowerCase() } });
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new BadRequestException('Você não pode remover o próprio usuário');
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    await this.prisma.user.delete({ where: { id } });
  }
}
