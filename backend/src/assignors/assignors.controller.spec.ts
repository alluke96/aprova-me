import { Test } from '@nestjs/testing';
import { ASSIGNOR_ID, assignorInput } from '../test-utils/fixtures';
import { AssignorsController } from './assignors.controller';
import { AssignorsService } from './assignors.service';

describe('AssignorsController', () => {
  let controller: AssignorsController;
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
      controllers: [AssignorsController],
      providers: [{ provide: AssignorsService, useValue: service }],
    }).compile();
    controller = module.get(AssignorsController);
  });

  it('delega cada rota ao service', async () => {
    const query = { page: 1, pageSize: 20 };

    await controller.create(assignorInput);
    await controller.findAll(query);
    await controller.findOne(ASSIGNOR_ID);
    await controller.update(ASSIGNOR_ID, { name: 'x' });
    await controller.remove(ASSIGNOR_ID);

    expect(service.create).toHaveBeenCalledWith(assignorInput);
    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(service.findOne).toHaveBeenCalledWith(ASSIGNOR_ID);
    expect(service.update).toHaveBeenCalledWith(ASSIGNOR_ID, { name: 'x' });
    expect(service.remove).toHaveBeenCalledWith(ASSIGNOR_ID);
  });
});
