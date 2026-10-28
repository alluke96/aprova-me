import { Job } from 'bullmq';
import { MailService } from '../mail/mail.service';
import { DeadPayableJob } from '../queues/queues.constants';
import { payableInput } from '../test-utils/fixtures';
import { DeadLetterProcessor } from './dead-letter.processor';

describe('DeadLetterProcessor', () => {
  it('avisa operações sobre o item morto', async () => {
    const mail = { sendDeadLetterAlert: jest.fn().mockResolvedValue(undefined) };
    const processor = new DeadLetterProcessor(mail as unknown as MailService);
    const data: DeadPayableJob = {
      batchId: 'lote',
      payable: payableInput,
      error: 'erro',
      attempts: 5,
      failedAt: '2026-10-28T12:00:00.000Z',
    };

    await processor.process({ data } as Job<DeadPayableJob>);

    expect(mail.sendDeadLetterAlert).toHaveBeenCalledWith(data);
  });
});
