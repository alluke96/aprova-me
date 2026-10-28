import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AssignorsService } from '../assignors/assignors.service';
import {
  ASSIGNOR_ID,
  assignorInput,
  makeAssignor,
  makePayable,
  PAYABLE_ID,
  payableInput,
} from '../test-utils/fixtures';
import { createPrismaMock } from '../test-utils/prisma-mock';
import { AssignorNotFoundError, PayableConflictError } from './payable.errors';
import { PayablesService, toPayableResponse } from './payables.service';

describe('PayablesService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let assignors: AssignorsService;
  let service: PayablesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    assignors = new AssignorsService(prisma);
    service = new PayablesService(prisma, assignors);
  });

  it('serializa valor com 2 casas e data sem hora', () => {
    expect(toPayableResponse(makePayable({ value: new Prisma.Decimal('10.5') }))).toMatchObject({
      value: '10.50',
      emissionDate: '2026-10-28',
      assignor: ASSIGNOR_ID,
    });
  });

  describe('createIdempotent', () => {
    it('cria o recebível com Decimal e data UTC', async () => {
      prisma.payable.findUnique.mockResolvedValue(null);
      prisma.assignor.findUnique.mockResolvedValue({ id: ASSIGNOR_ID });
      prisma.payable.create.mockResolvedValue(makePayable());

      const result = await service.createIdempotent(payableInput);

      expect(result.created).toBe(true);
      const { data } = prisma.payable.create.mock.calls[0][0];
      expect(data.value.toFixed(2)).toBe('1500.50');
      expect(data.emissionDate.toISOString()).toBe('2026-10-28T00:00:00.000Z');
    });

    it('devolve o existente quando o mesmo recebível é reenviado', async () => {
      prisma.payable.findUnique.mockResolvedValue(makePayable());

      const result = await service.createIdempotent({ ...payableInput, value: '1500.5' });

      expect(result).toEqual({ payable: makePayable(), created: false });
      expect(prisma.payable.create).not.toHaveBeenCalled();
    });

    it('acusa conflito quando o id existe com outros dados', async () => {
      prisma.payable.findUnique.mockResolvedValue(makePayable());

      await expect(
        service.createIdempotent({ ...payableInput, value: '999.99' }),
      ).rejects.toBeInstanceOf(PayableConflictError);
    });

    it('acusa cedente inexistente', async () => {
      prisma.payable.findUnique.mockResolvedValue(null);
      prisma.assignor.findUnique.mockResolvedValue(null);

      await expect(service.createIdempotent(payableInput)).rejects.toBeInstanceOf(
        AssignorNotFoundError,
      );
    });
  });

  describe('create', () => {
    it('grava cedente e recebível na mesma transação', async () => {
      prisma.assignor.upsert.mockResolvedValue(makeAssignor());
      prisma.payable.findUnique.mockResolvedValue(null);
      prisma.assignor.findUnique.mockResolvedValue({ id: ASSIGNOR_ID });
      prisma.payable.create.mockResolvedValue(makePayable());

      const result = await service.create({ payable: payableInput, assignor: assignorInput });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.payable.id).toBe(PAYABLE_ID);
      expect(result.assignor.id).toBe(ASSIGNOR_ID);
    });

    it('usa um cedente já cadastrado quando ele não é enviado', async () => {
      prisma.assignor.findUnique.mockResolvedValue(makeAssignor());
      prisma.payable.findUnique.mockResolvedValue(null);
      prisma.payable.create.mockResolvedValue(makePayable());

      const result = await service.create({ payable: payableInput });

      expect(prisma.assignor.upsert).not.toHaveBeenCalled();
      expect(result.assignor.name).toBe('Empresa Cedente LTDA');
    });

    it('recusa quando payable.assignor não bate com assignor.id', async () => {
      const call = service.create({
        payable: { ...payableInput, assignor: 'a1b2c3d4-0000-4000-8000-000000000000' },
        assignor: assignorInput,
      });

      await expect(call).rejects.toBeInstanceOf(BadRequestException);
    });

    it('traduz cedente inexistente em 400 no campo payable.assignor', async () => {
      prisma.assignor.findUnique.mockResolvedValue(null);
      prisma.payable.findUnique.mockResolvedValue(null);

      const error = await service.create({ payable: payableInput }).catch((e) => e);

      expect(error).toBeInstanceOf(BadRequestException);
      expect(error.getResponse()).toMatchObject({ errors: [{ field: 'payable.assignor' }] });
    });

    it('traduz conflito de id em 409', async () => {
      prisma.assignor.findUnique.mockResolvedValue(makeAssignor());
      prisma.payable.findUnique.mockResolvedValue(makePayable({ assignorId: 'outro' }));

      await expect(service.create({ payable: payableInput })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  it('lista paginado, mais recentes primeiro', async () => {
    prisma.payable.findMany.mockResolvedValue([makePayable()]);
    prisma.payable.count.mockResolvedValue(1);

    const result = await service.findAll({ page: 2, pageSize: 5 });

    expect(prisma.payable.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      skip: 5,
      take: 5,
    });
    expect(result.data[0].value).toBe('1500.50');
  });

  it('retorna 404 para recebível inexistente', async () => {
    prisma.payable.findUnique.mockResolvedValue(null);

    await expect(service.findOne(PAYABLE_ID)).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('update', () => {
    it('atualiza só os campos enviados', async () => {
      prisma.payable.findUnique.mockResolvedValue(makePayable());
      prisma.payable.update.mockResolvedValue(makePayable({ value: new Prisma.Decimal('20') }));

      const result = await service.update(PAYABLE_ID, { value: '20' });

      expect(result.value).toBe('20.00');
      expect(Object.keys(prisma.payable.update.mock.calls[0][0].data)).toEqual(['value']);
    });

    it('valida o novo cedente', async () => {
      prisma.payable.findUnique.mockResolvedValue(makePayable());
      prisma.assignor.findUnique.mockResolvedValue(null);

      await expect(service.update(PAYABLE_ID, { assignor: ASSIGNOR_ID })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  it('exclui o recebível', async () => {
    prisma.payable.findUnique.mockResolvedValue(makePayable());

    await service.remove(PAYABLE_ID);

    expect(prisma.payable.delete).toHaveBeenCalledWith({ where: { id: PAYABLE_ID } });
  });
});
