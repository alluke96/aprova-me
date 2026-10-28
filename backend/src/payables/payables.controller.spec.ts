import { Test } from '@nestjs/testing';
import { PAYABLE_ID, payableInput } from '../test-utils/fixtures';
import { PayablesController } from './payables.controller';
import { PayablesService } from './payables.service';

describe('PayablesController', () => {
  let controller: PayablesController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [PayablesController],
      providers: [{ provide: PayablesService, useValue: service }],
    }).compile();
    controller = module.get(PayablesController);
  });

  it('delega cada rota ao service', async () => {
    const query = { page: 1, pageSize: 20 };

    await controller.create({ payable: payableInput });
    await controller.findAll(query);
    await controller.findOne(PAYABLE_ID);
    await controller.update(PAYABLE_ID, { value: '10' });
    await controller.remove(PAYABLE_ID);

    expect(service.create).toHaveBeenCalledWith({ payable: payableInput });
    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(service.findOne).toHaveBeenCalledWith(PAYABLE_ID);
    expect(service.update).toHaveBeenCalledWith(PAYABLE_ID, { value: '10' });
    expect(service.remove).toHaveBeenCalledWith(PAYABLE_ID);
  });
});
