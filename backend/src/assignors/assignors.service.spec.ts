import { ConflictException, NotFoundException } from '@nestjs/common';
import { ASSIGNOR_ID, assignorInput, makeAssignor } from '../test-utils/fixtures';
import { createPrismaMock } from '../test-utils/prisma-mock';
import { AssignorsService } from './assignors.service';

describe('AssignorsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: AssignorsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new AssignorsService(prisma);
  });

  describe('create', () => {
    it('normaliza documento e e-mail antes de salvar', async () => {
      prisma.assignor.findUnique.mockResolvedValue(null);
      prisma.assignor.create.mockResolvedValue(makeAssignor());

      await service.create(assignorInput);

      expect(prisma.assignor.create).toHaveBeenCalledWith({
        data: {
          id: ASSIGNOR_ID,
          document: '52998224725',
          email: 'cedente@empresa.com',
          phone: '(41) 99999-0000',
          name: 'Empresa Cedente LTDA',
        },
      });
    });

    it('é idempotente quando o mesmo cedente é reenviado', async () => {
      prisma.assignor.findUnique.mockResolvedValue(makeAssignor());

      const result = await service.create(assignorInput);

      expect(result.id).toBe(ASSIGNOR_ID);
      expect(prisma.assignor.create).not.toHaveBeenCalled();
    });

    it('recusa o mesmo id com dados diferentes', async () => {
      prisma.assignor.findUnique.mockResolvedValue(makeAssignor({ name: 'Outro nome' }));

      await expect(service.create(assignorInput)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  it('faz upsert usando o cliente da transação recebido', async () => {
    const tx = createPrismaMock();
    tx.assignor.upsert.mockResolvedValue(makeAssignor());

    await service.upsert(assignorInput, tx);

    expect(tx.assignor.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ASSIGNOR_ID } }),
    );
    expect(prisma.assignor.upsert).not.toHaveBeenCalled();
  });

  it('lista com busca e paginação', async () => {
    prisma.assignor.findMany.mockResolvedValue([makeAssignor()]);
    prisma.assignor.count.mockResolvedValue(1);

    const result = await service.findAll({ page: 1, pageSize: 10, search: 'empresa' });

    expect(result).toMatchObject({ total: 1, page: 1, pageSize: 10, totalPages: 1 });
    expect(prisma.assignor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10, orderBy: { name: 'asc' } }),
    );
  });

  it('retorna 404 quando o cedente não existe', async () => {
    prisma.assignor.findUnique.mockResolvedValue(null);

    await expect(service.findOne(ASSIGNOR_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('atualiza só os campos enviados', async () => {
    prisma.assignor.findUnique.mockResolvedValue(makeAssignor());
    prisma.assignor.update.mockResolvedValue(makeAssignor({ name: 'Novo' }));

    await service.update(ASSIGNOR_ID, { name: ' Novo ' });

    expect(prisma.assignor.update).toHaveBeenCalledWith({
      where: { id: ASSIGNOR_ID },
      data: { name: 'Novo' },
    });
  });

  describe('remove', () => {
    it('exclui quando não há recebíveis vinculados', async () => {
      prisma.assignor.findUnique.mockResolvedValue(makeAssignor());
      prisma.payable.count.mockResolvedValue(0);

      await service.remove(ASSIGNOR_ID);

      expect(prisma.assignor.delete).toHaveBeenCalledWith({ where: { id: ASSIGNOR_ID } });
    });

    it('impede excluir cedente com recebíveis', async () => {
      prisma.assignor.findUnique.mockResolvedValue(makeAssignor());
      prisma.payable.count.mockResolvedValue(2);

      await expect(service.remove(ASSIGNOR_ID)).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.assignor.delete).not.toHaveBeenCalled();
    });
  });
});
