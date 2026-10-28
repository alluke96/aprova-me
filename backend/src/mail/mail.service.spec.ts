import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import { Env } from '../config/env';
import { payableInput } from '../test-utils/fixtures';
import { MailService } from './mail.service';

describe('MailService', () => {
  const transport = { sendMail: jest.fn().mockResolvedValue({}) };
  const settings: Record<string, string> = {
    MAIL_FROM: 'Aprova-me <nao-responda@aprova.me>',
    BATCH_REPORT_EMAIL: 'cliente@aprova.me',
    OPERATIONS_EMAIL: 'operacoes@aprova.me',
  };
  const config = { get: (key: string) => settings[key] } as unknown as ConfigService<Env, true>;
  const service = new MailService(transport as unknown as Transporter, config);

  beforeEach(() => transport.sendMail.mockClear());

  it('envia o relatório do lote com sucessos e falhas', async () => {
    await service.sendBatchReport({
      id: 'lote-1',
      total: 10,
      succeeded: 8,
      failed: 2,
      createdAt: new Date('2026-10-28T12:00:00Z'),
      finishedAt: new Date('2026-10-28T12:01:00Z'),
    });

    const mail = transport.sendMail.mock.calls[0][0];
    expect(mail.to).toBe('cliente@aprova.me');
    expect(mail.subject).toBe('Lote lote-1 processado: 8 sucesso(s), 2 falha(s)');
    expect(mail.text).toContain('Com falha: 2');
  });

  it('alerta operações sobre item na fila morta', async () => {
    await service.sendDeadLetterAlert({
      batchId: 'lote-1',
      payable: payableInput,
      error: 'timeout no banco',
      attempts: 5,
      failedAt: '2026-10-28T12:00:00.000Z',
    });

    const mail = transport.sendMail.mock.calls[0][0];
    expect(mail.to).toBe('operacoes@aprova.me');
    expect(mail.subject).toContain(payableInput.id);
    expect(mail.text).toContain('Tentativas: 5');
    expect(mail.text).toContain('Erro: timeout no banco');
  });
});
