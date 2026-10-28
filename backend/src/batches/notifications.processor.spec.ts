import { Job } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { BatchCompletedJob } from '../queues/queues.constants';
import { createPrismaMock } from '../test-utils/prisma-mock';
import { NotificationsProcessor } from './notifications.processor';

describe('NotificationsProcessor', () => {
  const mail = { sendBatchReport: jest.fn().mockResolvedValue(undefined) };
  const prisma = createPrismaMock();
  const processor = new NotificationsProcessor(prisma, mail as unknown as MailService);
  const job = { data: { batchId: 'lote' } } as Job<BatchCompletedJob>;

  beforeEach(() => mail.sendBatchReport.mockClear());

  it('envia o relatório do lote concluído', async () => {
    const batch = { id: 'lote', total: 2, succeeded: 2, failed: 0 };
    prisma.batch.findUnique.mockResolvedValue(batch);

    await processor.process(job);

    expect(mail.sendBatchReport).toHaveBeenCalledWith(batch);
  });

  it('ignora lote que não existe mais', async () => {
    prisma.batch.findUnique.mockResolvedValue(null);

    await processor.process(job);

    expect(mail.sendBatchReport).not.toHaveBeenCalled();
  });
});
