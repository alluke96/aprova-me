import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Transporter } from 'nodemailer';
import { Env } from '../config/env';
import { DeadPayableJob } from '../queues/queues.constants';

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

export interface BatchReport {
  id: string;
  total: number;
  succeeded: number;
  failed: number;
  createdAt: Date;
  finishedAt: Date | null;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: Transporter,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** E-mail de lote processado (nível 7), com número de sucessos e falhas. */
  async sendBatchReport(batch: BatchReport): Promise<void> {
    const subject = `Lote ${batch.id} processado: ${batch.succeeded} sucesso(s), ${batch.failed} falha(s)`;
    const text = [
      `O lote ${batch.id} terminou de ser processado.`,
      '',
      `Total de recebíveis: ${batch.total}`,
      `Processados com sucesso: ${batch.succeeded}`,
      `Com falha: ${batch.failed}`,
      '',
      `Recebido em: ${batch.createdAt.toISOString()}`,
      `Concluído em: ${batch.finishedAt?.toISOString() ?? '-'}`,
    ].join('\n');

    await this.send(this.config.get('BATCH_REPORT_EMAIL', { infer: true }), subject, text);
  }

  /** Alerta para o time de operações quando um item vai para a fila morta (nível 8). */
  async sendDeadLetterAlert(item: DeadPayableJob): Promise<void> {
    const subject = `[Fila morta] Recebível ${item.payable.id} não foi processado`;
    const text = [
      'Um recebível esgotou as tentativas e foi para a fila morta.',
      '',
      `Lote: ${item.batchId}`,
      `Recebível: ${item.payable.id}`,
      `Cedente: ${item.payable.assignor}`,
      `Valor: ${item.payable.value}`,
      `Data de emissão: ${item.payable.emissionDate}`,
      `Tentativas: ${item.attempts}`,
      `Falhou em: ${item.failedAt}`,
      `Erro: ${item.error}`,
    ].join('\n');

    await this.send(this.config.get('OPERATIONS_EMAIL', { infer: true }), subject, text);
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    await this.transport.sendMail({
      from: this.config.get('MAIL_FROM', { infer: true }),
      to,
      subject,
      text,
    });
    this.logger.log(`E-mail enviado para ${to}: ${subject}`);
  }
}
