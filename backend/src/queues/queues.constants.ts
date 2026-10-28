import { PayableDto } from '../payables/dto/payable.dto';

/** Fila principal: um job por recebível do lote. */
export const PAYABLES_QUEUE = 'payables';
/** "Fila morta" (nível 8): itens que falharam em todas as tentativas. */
export const DEAD_LETTER_QUEUE = 'payables-dead-letter';
/** E-mails, com retentativa própria para não depender do SMTP no caminho do lote. */
export const NOTIFICATIONS_QUEUE = 'notifications';

export const JOBS = {
  createPayable: 'create-payable',
  deadPayable: 'dead-payable',
  batchCompleted: 'batch-completed',
} as const;

export interface CreatePayableJob {
  batchId: string;
  payable: PayableDto;
}

export interface DeadPayableJob extends CreatePayableJob {
  error: string;
  attempts: number;
  failedAt: string;
}

export interface BatchCompletedJob {
  batchId: string;
}

/** Ids determinísticos: reenfileirar o mesmo item não cria um job duplicado. */
export const jobIds = {
  payable: (batchId: string, payableId: string) => `${batchId}-${payableId}`,
  batchCompleted: (batchId: string) => `batch-completed-${batchId}`,
};
