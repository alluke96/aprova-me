/**
 * Erros de domínio dos recebíveis. Não dependem de HTTP para poderem ser usados
 * tanto pela API quanto pelo worker de lotes.
 */
export class AssignorNotFoundError extends Error {
  constructor(public readonly assignorId: string) {
    super(`Cedente ${assignorId} não encontrado`);
    this.name = 'AssignorNotFoundError';
  }
}

export class PayableConflictError extends Error {
  constructor(public readonly payableId: string) {
    super(`Já existe um recebível ${payableId} com dados diferentes`);
    this.name = 'PayableConflictError';
  }
}

/** Erros permanentes: tentar de novo não vai mudar o resultado. */
export function isPermanentPayableError(error: unknown): boolean {
  return error instanceof AssignorNotFoundError || error instanceof PayableConflictError;
}
