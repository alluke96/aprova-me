import { payableInput } from '../test-utils/fixtures';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';

describe('BatchesController', () => {
  const service = { create: jest.fn(), findOne: jest.fn() };
  const controller = new BatchesController(service as unknown as BatchesService);

  it('delega criação e consulta ao service', async () => {
    await controller.create({ payables: [payableInput] });
    await controller.findOne('lote');

    expect(service.create).toHaveBeenCalledWith({ payables: [payableInput] });
    expect(service.findOne).toHaveBeenCalledWith('lote');
  });
});
