import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Assignor, Prisma } from '@prisma/client';
import { paginate, Paginated, toSkipTake } from '../common/dto/pagination';
import { normalizeDocument } from '../common/validation/document';
import { PrismaService } from '../prisma/prisma.service';
import {
  AssignorResponse,
  CreateAssignorDto,
  ListAssignorsQueryDto,
  UpdateAssignorDto,
} from './dto/assignor.dto';

type Db = PrismaService | Prisma.TransactionClient;

export function toAssignorResponse(assignor: Assignor): AssignorResponse {
  return {
    id: assignor.id,
    document: assignor.document,
    email: assignor.email,
    phone: assignor.phone,
    name: assignor.name,
    createdAt: assignor.createdAt,
    updatedAt: assignor.updatedAt,
  };
}

function toData(dto: Omit<CreateAssignorDto, 'id'>) {
  return {
    document: normalizeDocument(dto.document),
    email: dto.email.trim().toLowerCase(),
    phone: dto.phone.trim(),
    name: dto.name.trim(),
  };
}

@Injectable()
export class AssignorsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cadastro idempotente: reenviar o mesmo cedente (mesmo id e dados) devolve o
   * registro existente; o mesmo id com dados diferentes é um conflito.
   */
  async create(dto: CreateAssignorDto): Promise<AssignorResponse> {
    const data = toData(dto);
    const existing = await this.prisma.assignor.findUnique({ where: { id: dto.id } });

    if (existing) {
      const same = (Object.keys(data) as (keyof typeof data)[]).every(
        (key) => existing[key] === data[key],
      );
      if (!same) {
        throw new ConflictException('Já existe um cedente com este id e dados diferentes');
      }
      return toAssignorResponse(existing);
    }

    const created = await this.prisma.assignor.create({ data: { id: dto.id, ...data } });
    return toAssignorResponse(created);
  }

  /** Usado pela integração: o cliente manda os dados atuais do cedente junto com o recebível. */
  async upsert(dto: CreateAssignorDto, db: Db = this.prisma): Promise<Assignor> {
    const data = toData(dto);
    return db.assignor.upsert({
      where: { id: dto.id },
      create: { id: dto.id, ...data },
      update: data,
    });
  }

  async findAll(query: ListAssignorsQueryDto): Promise<Paginated<AssignorResponse>> {
    const search = query.search?.trim();
    const where: Prisma.AssignorWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { document: { contains: normalizeDocument(search) || search } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.assignor.findMany({ where, orderBy: { name: 'asc' }, ...toSkipTake(query) }),
      this.prisma.assignor.count({ where }),
    ]);

    return paginate(items.map(toAssignorResponse), total, query);
  }

  async findOne(id: string): Promise<AssignorResponse> {
    const assignor = await this.prisma.assignor.findUnique({ where: { id } });
    if (!assignor) throw new NotFoundException('Cedente não encontrado');
    return toAssignorResponse(assignor);
  }

  async update(id: string, dto: UpdateAssignorDto): Promise<AssignorResponse> {
    await this.findOne(id);
    const updated = await this.prisma.assignor.update({
      where: { id },
      data: {
        ...(dto.document !== undefined && { document: normalizeDocument(dto.document) }),
        ...(dto.email !== undefined && { email: dto.email.trim().toLowerCase() }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() }),
        ...(dto.name !== undefined && { name: dto.name.trim() }),
      },
    });
    return toAssignorResponse(updated);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    const payables = await this.prisma.payable.count({ where: { assignorId: id } });
    if (payables > 0) {
      throw new ConflictException(
        `Não é possível excluir: o cedente tem ${payables} recebível(is) vinculado(s)`,
      );
    }
    await this.prisma.assignor.delete({ where: { id } });
  }
}
